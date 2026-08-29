import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getSiteOrigin } from "../site.config.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const origin = getSiteOrigin();

async function walk(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }

  return files;
}

function slash(path) {
  return relative(dist, path).split(sep).join("/");
}

function routeFor(file) {
  const path = slash(file);
  if (path === "index.html") return "/";
  if (path === "404.html") return "/404.html";
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"index.html".length)}`;
  return `/${path}`;
}

function canonicalOf(html) {
  return html.match(
    /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i
  )?.[1] || "";
}

function ogUrlOf(html) {
  return html.match(
    /<meta\b(?=[^>]*\bproperty=["']og:url["'])(?=[^>]*\bcontent=["']([^"']+)["'])[^>]*>/i
  )?.[1] || "";
}

const files = await walk(dist);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

assert.ok(sitemapUrls.length, "Sitemap is empty");
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "Sitemap contains duplicate URLs");

for (const urlText of sitemapUrls) {
  const url = new URL(urlText);
  assert.equal(url.origin, origin, `Wrong sitemap origin: ${urlText}`);
  assert.ok(
    !url.search && !url.hash && !/index\.html$/i.test(url.pathname),
    `Noncanonical sitemap URL: ${urlText}`
  );
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const route = routeFor(file);
  const is404 = route === "/404.html";
  const fileName = slash(file);

  assert.match(html, /^<!doctype html>/i, `${fileName} missing doctype`);
  assert.match(html, /<html\b[^>]*\blang=["'][^"']+["']/i, `${fileName} missing lang`);
  assert.match(html, /<meta\b[^>]*name=["']viewport["']/i, `${fileName} missing viewport`);
  assert.match(html, /<title>[^<]+<\/title>/i, `${fileName} missing title`);

  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${fileName} contains duplicate IDs`);

  const idSet = new Set(ids);
  for (const match of html.matchAll(/<label\b[^>]*\bfor=["']([^"']+)["']/gi)) {
    assert.ok(idSet.has(match[1]), `${fileName} label targets missing #${match[1]}`);
  }

  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
    assert.doesNotThrow(() => JSON.parse(match[1]), `${fileName} has invalid JSON-LD`);
  }

  if (is404) {
    assert.match(html, /name=["']robots["'][^>]*noindex/i, "404 must be noindex");
    assert.equal(canonicalOf(html), "", "404 must not publish canonical");
    continue;
  }

  const expected = `${origin}${route}`;
  assert.equal(canonicalOf(html), expected, `${fileName} canonical drift`);
  assert.equal(ogUrlOf(html), expected, `${fileName} og:url drift`);
  assert.ok(sitemapUrls.includes(expected), `${fileName} missing from sitemap`);

  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const raw = match[1];
    if (/^(?:#|https?:|mailto:|tel:|data:|javascript:)/i.test(raw)) continue;

    const url = new URL(raw, expected);
    if (url.origin !== origin) continue;
    if (!/\.(?:css|js|png|jpg|jpeg|webp|svg|json)$/i.test(url.pathname)) continue;

    const target = resolve(dist, url.pathname.replace(/^\//, ""));
    await assert.doesNotReject(
      () => access(target),
      `${fileName} missing asset ${url.pathname}`
    );
  }
}

const manifest = JSON.parse(await readFile(join(dist, "asset-manifest.json"), "utf8"));

for (const entry of Object.values(manifest.assets)) {
  assert.match(
    entry.file,
    /\.[a-f0-9]{12}\.(?:css|js)$/i,
    `Unfingerprinted asset ${entry.file}`
  );

  await assert.doesNotReject(
    () => access(resolve(dist, entry.file.slice(1))),
    `Missing fingerprinted asset ${entry.file}`
  );
}

console.log(`Site QA passed: ${htmlFiles.length} HTML pages, ${sitemapUrls.length} canonical URLs.`);
