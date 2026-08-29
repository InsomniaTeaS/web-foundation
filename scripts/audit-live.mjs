import assert from "node:assert/strict";
import { SITE, getSiteOrigin } from "../site.config.mjs";

const origin = getSiteOrigin();

async function request(path, { redirect = "manual" } = {}) {
  try {
    const response = await fetch(new URL(path, `${origin}/`), {
      redirect,
      signal: AbortSignal.timeout(8000),
      headers: {
        "cache-control": "no-cache",
        "user-agent": "Web-Foundation-Live-Audit/1.0"
      }
    });

    return {
      ok: true,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
      location: response.headers.get("location") || ""
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      status: 0,
      headers: {},
      body: "",
      location: ""
    };
  }
}

function canonicalOf(html) {
  return html.match(
    /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i
  )?.[1] || "";
}

for (const path of SITE.liveAuditPaths) {
  const result = await request(path);

  assert.ok(result.ok, `${path}: ${result.error}`);
  assert.equal(result.status, 200, `${path} returned ${result.status}`);
  assert.match(result.headers["content-type"] || "", /text\/html/i, `${path} wrong content type`);
  assert.equal(canonicalOf(result.body), `${origin}${path}`, `${path} canonical mismatch`);

  for (const header of SITE.requiredSecurityHeaders) {
    assert.ok(result.headers[header], `${path} missing ${header}`);
  }
}

for (const path of SITE.liveAuditPaths.filter((item) => item !== "/")) {
  const noSlash = path.slice(0, -1);
  const noSlashResult = await request(noSlash);

  assert.ok([301, 308].includes(noSlashResult.status), `${noSlash} should redirect permanently`);
  assert.equal(
    new URL(noSlashResult.location, origin).href,
    `${origin}${path}`,
    `${noSlash} redirect target mismatch`
  );

  const indexPath = `${path}index.html`;
  const indexResult = await request(indexPath);

  assert.ok([301, 308].includes(indexResult.status), `${indexPath} should redirect permanently`);
  assert.equal(
    new URL(indexResult.location, origin).href,
    `${origin}${path}`,
    `${indexPath} redirect target mismatch`
  );
}

const [robots, sitemap, security, missing, manifest] = await Promise.all([
  request("/robots.txt"),
  request("/sitemap.xml"),
  request("/.well-known/security.txt"),
  request(`/__missing-${Date.now()}/`),
  request("/asset-manifest.json")
]);

assert.equal(robots.status, 200, "robots.txt missing");
assert.ok(robots.body.includes(`Sitemap: ${origin}/sitemap.xml`), "robots.txt sitemap mismatch");
assert.equal(sitemap.status, 200, "sitemap missing");
assert.ok(!/index\.html/i.test(sitemap.body), "sitemap exposes index.html");
assert.equal(security.status, 200, "security.txt missing");
assert.equal(missing.status, 404, "Missing route must return 404");
assert.match(missing.body, /name=["']robots["'][^>]*noindex/i, "404 must be noindex");
assert.equal(canonicalOf(missing.body), "", "404 must not have canonical");
assert.equal(manifest.status, 200, "asset manifest missing");

const parsedManifest = JSON.parse(manifest.body);
const asset = Object.values(parsedManifest.assets || {})[0]?.file;
assert.ok(asset, "No fingerprinted asset found");

const assetResult = await request(asset);
assert.equal(assetResult.status, 200, `Asset ${asset} missing`);
assert.match(
  assetResult.headers["cache-control"] || "",
  /immutable/i,
  "Fingerprinted asset not immutable"
);

console.log(`Live audit passed for ${origin}.`);
