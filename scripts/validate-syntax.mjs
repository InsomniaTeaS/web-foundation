import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function walk(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }

  return files;
}

const files = (await walk(root)).filter((file) => {
  return /\.(?:js|mjs)$/.test(file) && !file.includes(join(root, "dist"));
});

const failures = [];

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch {
    failures.push(relative(root, file));
  }
}

if (failures.length) {
  console.error(`Syntax QA failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(`Syntax QA passed: ${files.length} JavaScript modules checked.`);
