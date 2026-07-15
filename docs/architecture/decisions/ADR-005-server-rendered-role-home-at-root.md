# ADR-005 — Server-rendered, role-based home page at `GET /` (optional auth, no redirect)

- **Status:** Accepted
- **Date:** 2026-07-15
- **Sprint:** 2
- **Drivers:** S2-004

## Context

S2-004 requires `GET /` to serve the static landing page (`public/index.html`) when the
caller is unauthenticated, and a role-specific home page ("Employee Home" / "Manager Home"
/ "HR Home") that shows the user's email when the caller is authenticated, with "no
redirect; direct 200 response from GET /". Sprint 1 served `index.html` at `/` implicitly
through `express.static("public")`. That implicit behavior now conflicts with the need to
branch on role at the same URL, and the home page must inject a per-user value (email) that
a purely static file cannot provide.

## Decision

`GET /` is handled by a dedicated route (`src/routes/home.ts`), not by static serving, and
performs *optional* authentication.

`express.static` is reconfigured to `{ index: false }` so it no longer auto-serves
`index.html` at `/`; it continues to serve other public assets (`styles.css`, `app.js`).
`GET /` is on the auth middleware's public allowlist, so the request reaches the handler
without a token. The handler itself inspects the `Authorization` header: if a valid,
non-blocklisted token is present, it renders a role-specific home page from a server-side
template string, interpolating the user's email and including a logout control; if no valid
token is present (absent, malformed, expired, or blocklisted), it serves
`public/index.html`. The response is always a direct `200` from `/` with no redirect.

Home pages are generated as template strings rather than stored as static
`public/home-*.html` files, because the email must be injected server-side and templating
three tiny pages is simpler than three static files plus client-side data fetching.

## Consequences

- One URL (`/`) is the entry point for both anonymous and authenticated users, matching the
  AC's "no redirect" requirement and keeping the browser flow simple.
- Optional auth is a second, deliberate auth path distinct from the strict global guard
  (ADR-003); the home handler must swallow verification errors and fall back to the landing
  page rather than returning `401`. This is the only place that treats a bad token as
  "anonymous" instead of "rejected".
- Because navigation cannot carry an `Authorization` header, the authenticated home is
  fetched by client JS (`public/app.js`) that holds the token; the design.md records this
  as an assumption. Server behavior remains testable directly via an explicit header.
- HTML is assembled with string interpolation; the only interpolated value is the seeded
  email, so XSS surface is negligible for the demo, but any future user-controlled field
  rendered this way must be escaped.
