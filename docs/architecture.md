# Architecture

The repository is split into a few small layers so site-specific code does not get mixed with reusable checks.

## `site.config.mjs`

This is the first file to change for a new project. It holds the site name, public origin, navigation, route style, storage prefix, and the pages used by the live audit.

## `src/`

This is the editable site source. The sample pages are only there to make the project runnable out of the box.

`src/lib/` is for browser code that is useful across projects, such as search debouncing, local storage, drawer behavior, request timeouts, and DOM helpers.

## `scripts/`

The build script creates `dist/` and writes the generated SEO and hosting files. The validation scripts then inspect the final output instead of assuming the source is correct.

That distinction matters because routing, generated links, and build transforms can introduce problems that are not visible in the source files alone.

## `dist/`

Generated output. It is ignored by Git and should be rebuilt instead of edited directly.

## CI

The GitHub Actions workflow runs `npm run verify`. The goal is to keep local and CI checks the same so there is no separate set of rules to remember.

The live audit is separate because some things, such as CDN headers and redirects, only exist after deployment.
