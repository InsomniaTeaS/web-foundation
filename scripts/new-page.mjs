import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const raw = String(process.argv[2] || "").trim().replace(/^\/+|\/+$/g, "");

if (!raw || !/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(raw)) {
  console.error("Usage: npm run new:page -- about");
  process.exit(1);
}

const directory = resolve("src", raw);
const path = resolve(directory, "index.html");
const title = raw
  .split(/[/-]/)
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join(" ");

await mkdir(directory, { recursive: true });
await writeFile(
  path,
  `<!doctype html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | {{SITE_NAME}}</title>
  <meta name="description" content="Describe this page.">
  <link rel="canonical" href="{{CANONICAL}}">
  <meta property="og:url" content="{{CANONICAL}}">
  <link rel="stylesheet" href="/assets/styles.css">
  <script type="application/ld+json">{{JSON_LD}}</script>
  <script type="module" src="/assets/app.js"></script>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/">{{SITE_NAME}}</a>
    <button class="menu-toggle" type="button" data-drawer-toggle aria-controls="site-menu" aria-expanded="false">Menu</button>
    <nav id="site-menu" class="site-nav" data-drawer aria-label="Primary navigation">{{NAV}}</nav>
  </header>
  <main>
    <section class="hero compact">
      <h1>${title}</h1>
      <p>Replace this copy before launch.</p>
    </section>
  </main>
</body>
</html>
`,
  "utf8"
);

console.log(`Created ${path}`);
