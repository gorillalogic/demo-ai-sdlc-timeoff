# ADR-004 — Serve the frontend as same-origin static files from the Express process

- **Status:** Accepted
- **Date:** 2026-07-28
- **Sprint:** 1
- **Drives stories:** S1-002, S1-004

## Context

S1-002 requires `GET /` to return a vanilla HTML landing page with a login form, while NF2
requires the server to return JSON and S1-004 requires `POST /login` to accept a JSON body and
respond with `{ "token": "<JWT>" }`. NF6 forbids a second process or a build step, so the page
cannot come from a separate dev server, a template engine or a bundler. The plan also states
that the form element itself must carry `method="POST"` and `action="/login"`, which on its own
would make the browser send `application/x-www-form-urlencoded` and expect an HTML response.

## Decision

Static assets live in `public/` and are served by `app.use(express.static("public"))` mounted at
the root. `GET /` therefore resolves to `public/index.html` through the static middleware's
default index behaviour, with no route handler and no template engine. The frontend is three
files: `public/index.html`, `public/styles.css` and `public/app.js`, all plain and loaded
directly by the browser.

Frontend and API share one origin and one port, 3000. `cors()` is still mounted, as the
architecture permits, so that a page or tool served from another origin can call the API during
a demo, but the application itself never depends on it.

The login form keeps the markup the story asks for, `<form method="POST" action="/login">` with
email and password inputs and a submit button, and `public/app.js` intercepts the `submit`
event, calls `preventDefault()` and posts `{ email, password }` as `application/json` via
`fetch`. The markup attributes are the no-JavaScript fallback and satisfy the story's
acceptance criteria literally; the intercepted path is what actually runs and keeps the endpoint
JSON-only per NF2. The server therefore mounts `express.json()` and does not mount
`express.urlencoded()`, so a genuine non-JavaScript form post would be rejected as a 400 rather
than silently half-working.

The static middleware is mounted before the API routes, and unknown paths fall through to a
JSON 404 handler rather than to an HTML error page, so every non-asset response is JSON.

## Consequences

One process serves everything, so `npm start` is genuinely the whole system and there is no
CORS problem, no proxy configuration and no port juggling. Token handling in theme 2 gets to
use ordinary same-origin `fetch`.

The cost is that the fallback form post is decorative: with JavaScript disabled the user gets a
400 JSON body instead of a login. That is a deliberate trade to satisfy both the story's markup
criteria and the JSON-only API rule, and it is recorded here so a reviewer does not read it as
an oversight.

Because the static mount sits at the root, any file added to `public/` becomes publicly
readable without authentication. Nothing secret may be placed there in any sprint.
