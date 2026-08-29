# web-foundation

I made this after running into the same website problems more than once: broken internal links, inconsistent canonical URLs, stale assets, duplicate IDs, bad redirects, and small changes that caused regressions somewhere else.

Instead of fixing those from scratch on every project, I pulled the reusable parts into one small foundation.

It is meant for static sites and Cloudflare-hosted projects. The example site is intentionally plain so the repository stays focused on structure and checks instead of a specific design.

## What is included

- one site config for the domain, navigation, and route rules
- build-time canonical, sitemap, robots, and redirect generation
- checks for broken internal links and missing fragment targets
- duplicate ID and slug checks
- JSON-LD validation
- basic content repetition checks
- small browser helpers for search, local storage, drawers, and request timeouts
- hashed CSS and JavaScript filenames for safer caching
- a GitHub Actions workflow that runs the same verification locally and in CI
- a live audit command for checking redirects and headers after deployment

## Run it

Node 20 or newer is enough. There are no package dependencies right now.

```bash
npm run verify
```

To preview the generated output, serve the `dist` folder with any local static server.

For a deployed site:

```bash
SITE_URL=https://example.com npm run audit:live
```

## Starting a new site

1. Update `site.config.mjs`.
2. Replace the example pages and data in `src/`.
3. Keep shared browser code in `src/lib/`.
4. Run `npm run verify` before pushing or deploying.
5. Run the live audit after the site is online.

## Why this repo exists

This is not a framework and I do not want it to become one. It is a place for the boring pieces that I would rather solve once and keep tested.

If a bug shows up in one project and the same kind of bug could happen elsewhere, the useful fix belongs here as a general check or helper.

See [docs/architecture.md](docs/architecture.md) for how the pieces are split up and [docs/checks.md](docs/checks.md) for the current validation rules.
