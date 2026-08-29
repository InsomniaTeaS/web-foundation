import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, getSiteOrigin } from "../site.config.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "src");
const dist = join(root, "dist");
const origin = getSiteOrigin();
const hashLength = 12;

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(src, dist, { recursive: true });
await rm(join(dist, "data.mjs"), { force: true });

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

function pagePath(file) {
  const path = slash(file);
  if (path === "index.html") return "/";
  if (path === "404.html") return "/404.html";
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"index.html".length)}`;
  return `/${path}`;
}

const navHtml = SITE.nav
  .map(({ href, label }) => `<a href="${href}">${label}</a>`)
  .join("");

let htmlFiles = (await walk(dist)).filter((file) => file.endsWith(".html"));
const indexable = [];

for (const file of htmlFiles) {
  const route = pagePath(file);
  const is404 = route === "/404.html";
  const canonical = `${origin}${route}`;
  let html = await readFile(file, "utf8");

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": route === "/" ? "WebSite" : "WebPage",
    name: route === "/" ? SITE.name : undefined,
    url: canonical
  });

  html = html
    .replaceAll("{{LANG}}", SITE.language)
    .replaceAll("{{SITE_NAME}}", SITE.name)
    .replaceAll("{{SITE_DESCRIPTION}}", SITE.description)
    .replaceAll("{{CANONICAL}}", canonical)
    .replaceAll("{{NAV}}", navHtml)
    .replaceAll("{{JSON_LD}}", jsonLd);

  await writeFile(file, html, "utf8");

  if (!is404 && !/name=["']robots["'][^>]*noindex/i.test(html)) {
    indexable.push({ file, route, canonical });
  }
}

const assetDirectory = join(dist, "assets");
const assets = (await walk(assetDirectory)).filter((file) => {
  return [".css", ".js"].includes(extname(file));
});

const manifest = {
  schemaVersion: 1,
  algorithm: "sha256",
  hashLength,
  assets: {}
};

for (const file of assets) {
  const content = await readFile(file);
  const hash = createHash("sha256").update(content).digest("hex").slice(0, hashLength);
  const extension = extname(file);
  const name = file.slice(0, -extension.length);
  const next = `${name}.${hash}${extension}`;

  await writeFile(next, content);

  const oldUrl = `/${slash(file)}`;
  const newUrl = `/${slash(next)}`;
  manifest.assets[oldUrl] = {
    file: newUrl,
    hash,
    bytes: content.byteLength
  };
}

const textFiles = (await walk(dist)).filter((file) => {
  return /\.(?:html|css|js|json|xml|txt)$/i.test(file);
});

for (const file of textFiles) {
  let content = await readFile(file, "utf8");
  let changed = false;

  for (const [oldUrl, entry] of Object.entries(manifest.assets)) {
    if (!content.includes(oldUrl)) continue;
    content = content.replaceAll(oldUrl, entry.file);
    changed = true;
  }

  if (changed) await writeFile(file, content, "utf8");
}

for (const file of assets) await rm(file);
await writeFile(
  join(dist, "asset-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
  .map(({ canonical }) => `  <url><loc>${canonical}</loc></url>`)
  .join("\n")}\n</urlset>\n`;

await writeFile(join(dist, "sitemap.xml"), sitemap);
await writeFile(
  join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`
);

await mkdir(join(dist, ".well-known"), { recursive: true });
await writeFile(
  join(dist, ".well-known/security.txt"),
  `Contact: ${origin}${SITE.contactPath}\nCanonical: ${origin}/.well-known/security.txt\nPreferred-Languages: ${SITE.language}\n`
);

const headers = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/lib/*
  Cache-Control: max-age=0, must-revalidate

/asset-manifest.json
  Cache-Control: max-age=0, must-revalidate
`;

await writeFile(join(dist, "_headers"), headers);

const redirects = ["/index.html / 301"];

for (const { route } of indexable) {
  if (route === "/" || !route.endsWith("/")) continue;

  const noSlash = route.slice(0, -1);
  redirects.push(`${route} ${route}index.html 200`);
  redirects.push(`${noSlash} ${route} 301`);
  redirects.push(`${route}index.html ${route} 301`);
}

await writeFile(join(dist, "_redirects"), `${redirects.join("\n")}\n`);

htmlFiles = (await walk(dist)).filter((file) => file.endsWith(".html"));
const health = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  origin,
  htmlPages: htmlFiles.length,
  indexablePages: indexable.length,
  fingerprintedAssets: Object.keys(manifest.assets).length,
  routeRules: redirects.length
};

await writeFile(
  join(dist, "build-health.json"),
  `${JSON.stringify(health, null, 2)}\n`
);

console.log(`Built ${htmlFiles.length} HTML pages for ${origin}.`);
