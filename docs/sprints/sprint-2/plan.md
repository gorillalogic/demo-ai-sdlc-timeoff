# Sprint 2 — Log in & log out

## S2-001 — Login Endpoint
- **As a** user, **I want** to submit my email and password to receive a session token, **so that** I can access my role-specific features.
- **Status:** done
- **BRD ref:** F1.1, F1.2, NF4
- **AC:**
  - POST /login accepts JSON payload with `email` (string) and `password` (string) fields
  - Returns HTTP 200 and a JWT token (in response body as `{ token: "<jwt>" }`) when credentials match a seeded user
  - JWT payload includes `email` and `role` from the authenticated user
  - JWT includes `exp` claim set to 24 hours from issue time
  - Returns HTTP 401 or 400 when credentials do not match any seeded user
  - Returns HTTP 400 when `email` or `password` field is missing from request
  - JWT is signed with HS256 using the secret from `process.env.JWT_SECRET` (defaults to `"workshop-secret"` if unset)
- **Depends on:** none

## S2-002 — Auth Middleware & Token Blocklist
- **As a** developer, **I want** protected endpoints to validate incoming JWTs and reject blocklisted tokens, **so that** only authenticated users with valid sessions can access them.
- **Status:** done
- **BRD ref:** NF1, F1.3 (prep)
- **AC:**
  - GET /health, POST /login, and GET / serve successfully without an Authorization header
  - All other routes return HTTP 401 when Authorization header is missing
  - Routes return HTTP 401 when Authorization header is present but does not start with `"Bearer "`
  - Routes return HTTP 401 when the Bearer token is invalid (bad signature or expired)
  - Routes return HTTP 401 when the Bearer token is in the logout blocklist
  - Valid Bearer token allows the request to proceed and attaches the decoded user (email, role) to the request context (e.g., `req.user`)
  - Auth middleware is applied to the Express app globally so all routes inherit its behavior
- **Depends on:** S2-001

## S2-003 — Logout Endpoint
- **As a** user, **I want** to log out and invalidate my current session token, **so that** no one can use my token to access my account.
- **Status:** done
- **BRD ref:** F1.3, NF1
- **AC:**
  - POST /logout requires a valid Bearer token in the Authorization header (protected endpoint)
  - Returns HTTP 200 with a success message (e.g., `{ message: "Logged out successfully" }`)
  - POST /logout extracts the JWT from the Authorization header and adds it to an in-memory blocklist
  - After logout, requests using the same JWT return HTTP 401 ("token is blocklisted")
  - After logout, the user can log in again and receive a new valid JWT
  - The blocklist is reset when the server restarts (in-memory store behavior)
- **Depends on:** S2-002

## S2-004 — Role-Based Home Pages
- **As a** logged-in user, **I want** to land on a home page tailored to my role, **so that** I see role-specific navigation and information.
- **Status:** done
- **BRD ref:** Theme 2 (land on role-appropriate home)
- **AC:**
  - GET / when unauthenticated (no Authorization header) serves the landing page (public/index.html) with login form
  - GET / when authenticated as `employee` returns an HTML home page with heading "Employee Home" and displays the user's email
  - GET / when authenticated as `manager` returns an HTML home page with heading "Manager Home" and displays the user's email
  - GET / when authenticated as `hr` returns an HTML home page with heading "HR Home" and displays the user's email
  - All authenticated home pages include a logout button or link that POSTs to /logout
  - Home page HTML is served from `public/home-*.html` or via a route that renders based on role (no redirect; direct 200 response from GET /)
  - After logout, GET / returns the landing page again (not the home page)
- **Depends on:** S2-002
