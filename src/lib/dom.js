export function setText(node, value) {
  if (node) node.textContent = value == null ? "" : String(value);
}

export function externalLink(anchor, href) {
  const url = new URL(href);
  if (url.protocol !== "https:") {
    throw new Error("External links must use HTTPS");
  }

  anchor.href = url.href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  return anchor;
}
