# Checks

The current validation pass covers the problems I want caught before deployment.

## Data

- duplicate IDs
- duplicate slugs
- missing required fields

## HTML and metadata

- document titles and viewport metadata
- duplicate element IDs
- labels pointing to missing controls
- invalid JSON-LD
- canonical URL consistency
- missing local assets

## Crawl and routes

- broken internal links
- missing fragment targets
- orphan indexable pages
- duplicate canonical routes
- redirect chains
- `index.html` leaking into canonical URLs

## Content

- broad repeated blocks that look like accidental template duplication

## JavaScript

- syntax checking across source and build scripts

## Production

`npm run audit:live` checks a deployed origin for representative pages, redirects, security headers, robots, sitemap, 404 behavior, and cache headers.

The live audit is deliberately small. It is a final deployment check, not a replacement for the offline validation suite.
