import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

async function walk(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }

  return files;
}

const paragraphs = new Map();
const htmlFiles = (await walk(dist)).filter((file) => file.endsWith(".html"));

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const fileName = relative(dist, file).split(sep).join("/");

  assert.ok(
    !/\b(?:TODO|FIXME|lorem ipsum)\b/i.test(html),
    `${fileName} contains unfinished placeholder copy`
  );

  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";

  for (const match of main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = match[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length < 90) continue;

    const usedBy = paragraphs.get(text) || new Set();
    usedBy.add(fileName);
    paragraphs.set(text, usedBy);
  }
}

for (const [text, usedBy] of paragraphs) {
  assert.ok(
    usedBy.size <= 2,
    `Long paragraph repeated across ${usedBy.size} pages: ${text.slice(0, 100)}...`
  );
}

console.log("Content QA passed: no unfinished copy and no broad long-paragraph template repetition.");
