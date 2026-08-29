const DEFAULT_ORIGIN = "https://example.com";

export const SITE = Object.freeze({
  name: "Web Foundation",
  description: "A small reusable base for static websites with build and QA checks included.",
  defaultOrigin: DEFAULT_ORIGIN,
  language: "en",
  locale: "en_US",
  storagePrefix: "web-foundation",
  contactPath: "/contact/",
  trailingSlash: true,
  nav: [
    { href: "/", label: "Home" },
    { href: "/directory/", label: "Directory" },
    { href: "/contact/", label: "Contact" }
  ],
  liveAuditPaths: ["/", "/directory/", "/contact/"],
  requiredSecurityHeaders: [
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "strict-transport-security"
  ]
});

export function getSiteOrigin(value = process.env.SITE_URL || SITE.defaultOrigin) {
  const trimmed = String(value || "").trim().replace(/\/$/, "");

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("SITE_URL must be a complete HTTPS origin");
  }

  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SITE_URL must be an HTTPS origin without a path, query, or fragment");
  }

  return url.origin;
}
