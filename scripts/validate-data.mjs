import assert from "node:assert/strict";
import { ITEMS } from "../src/data.mjs";

assert.ok(Array.isArray(ITEMS) && ITEMS.length, "ITEMS must be a non-empty array");

const ids = new Set();
const slugs = new Set();

for (const [index, item] of ITEMS.entries()) {
  assert.equal(typeof item, "object", `Item ${index} must be an object`);

  for (const field of ["id", "slug", "title"]) {
    assert.ok(String(item[field] || "").trim(), `Item ${index} missing ${field}`);
  }

  assert.match(
    item.slug,
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    `Invalid slug: ${item.slug}`
  );

  assert.ok(!ids.has(item.id), `Duplicate id: ${item.id}`);
  assert.ok(!slugs.has(item.slug), `Duplicate slug: ${item.slug}`);

  ids.add(item.id);
  slugs.add(item.slug);

  if (item.url) {
    const url = new URL(item.url);
    assert.equal(url.protocol, "https:", `${item.id} URL must use HTTPS`);
  }
}

console.log(`Data QA passed: ${ITEMS.length} records, unique IDs and slugs.`);
