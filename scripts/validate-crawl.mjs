import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
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
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"index.html".length)}`;
  return `/${path}`;
}

const pages = new Map();
const htmlFiles = (await walk(dist)).filter((file) => {
  return file.endsWith(".html") && !file.endsWith("404.html");
});

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const route = routeFor(file);
  const ids = new Set(
    [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1])
  );

  pages.set(route, { file, html, ids });
}

const graph = new Map([...pages.keys()].map((route) => [route, new Set()]));

for (const [route, page] of pages) {
  for (const match of page.html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const raw = match[1].trim();
    if (!raw || /^(?:mailto:|tel:|javascript:|data:)/i.test(raw)) continue;

    const url = new URL(raw, `${origin}${route}`);
    if (url.origin !== origin) continue;

    let targetPath = url.pathname;
    if (targetPath !== "/" && !targetPath.endsWith("/") && !/\.[a-z0-9]+$/i.test(targetPath)) {
      targetPath += "/";
    }

    if (url.hash && targetPath === route) {
      const id = decodeURIComponent(url.hash.slice(1));
      assert.ok(page.ids.has(id), `${route} targets missing #${id}`);
      continue;
    }

    const target = pages.get(targetPath);
    assert.ok(target, `${route} has unresolved internal link ${raw} -> ${targetPath}`);
    graph.get(route).add(targetPath);

    if (url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      assert.ok(target.ids.has(id), `${route} targets missing ${targetPath}#${id}`);
    }
  }
}

const seen = new Set(["/"]);
const queue = ["/"];

while (queue.length) {
  const current = queue.shift();
  for (const next of graph.get(current) || []) {
    if (seen.has(next)) continue;
    seen.add(next);
    queue.push(next);
  }
}

for (const route of pages.keys()) {
  assert.ok(seen.has(route), `Orphan indexable page: ${route}`);
}

const redirects = await readFile(join(dist, "_redirects"), "utf8");
const rules = redirects
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [source, destination, status] = line.split(/\s+/);
    return { source, destination, status, line };
  });

const sources = new Set();
for (const rule of rules) {
  assert.ok(!sources.has(rule.source), `Duplicate redirect source ${rule.source}`);
  sources.add(rule.source);

  assert.ok(
    ["200", "301", "308"].includes(rule.status),
    `Unsupported redirect status: ${rule.line}`
  );

  assert.ok(
    !(rule.status !== "200" && /index\.html/i.test(rule.destination)),
    `Canonical redirect exposes index.html: ${rule.line}`
  );
}

const bySource = new Map(rules.map((rule) => [rule.source, rule]));
for (const rule of rules.filter((item) => item.status !== "200")) {
  const next = bySource.get(rule.destination);
  assert.ok(!next || next.status === "200", `Redirect chain: ${rule.source} -> ${rule.destination}`);
}

console.log(`Crawl QA passed: ${pages.size} pages reachable from home; ${rules.length} route rules checked.`);
