# Sprint 1 — App runs locally

## S1-001 — Set up Express server and in-memory user store
- **As a** developer, **I want** the Node.js app to start with `npm start` and listen on `localhost:3000`, **so that** the Time-Off system is ready for development and testing.
- **Status:** in-progress — QA pass 1: [B1-001](bugs/B1-001-silent-false-success-when-port-3000-busy.md) (high), [B1-003](bugs/B1-003-readme-contradicts-itself-on-demo-credentials.md) (low)
- **BRD ref:** NF6 (app must run locally with npm install + npm start)
- **AC:**
  - `npm install` completes without errors
  - `npm start` starts an Express server on `localhost:3000`
  - Server logs a startup message indicating it is listening
  - Hitting `localhost:3000` in a browser receives a response (200 or 404, not connection refused)
  - Hardcoded users (one employee, one manager, one HR) are initialized in an in-memory store on startup
  - State resets on server restart (in-memory only, no persistence)
- **Depends on:** none

## S1-002 — Serve landing page with login form
- **As a** first-time user, **I want** to see a landing page with "Time-Off" branding and a login form when I access the app, **so that** I can authenticate and access my account.
- **Status:** done
- **BRD ref:** F1.1, NF2 (server returns JSON for API; landing page is vanilla HTML)
- **AC:**
  - `GET /` returns HTTP 200
  - Response is vanilla HTML with no build step required
  - Page displays "Time-Off" as a heading or title
  - HTML form contains email input field
  - HTML form contains password input field
  - HTML form contains a submit button
  - Form method is POST and action points to `/login`
- **Depends on:** S1-001

## S1-003 — Implement GET /health endpoint
- **As a** operator, **I want** to call `GET /health` and receive a status response, **so that** I can monitor application availability without requiring authentication.
- **Status:** done
- **BRD ref:** NF3 (`GET /health` returns `{ status: "ok" }` with 200)
- **AC:**
  - `GET /health` returns HTTP 200
  - Response body is JSON with `{ "status": "ok" }`
  - Endpoint does not require JWT authentication
  - Response `Content-Type` is `application/json`
- **Depends on:** S1-001

## S1-004 — Implement POST /login endpoint with JWT
- **As a** user, **I want** to submit email and password to receive a JWT token, **so that** subsequent requests can be authenticated.
- **Status:** in-progress — QA pass 1: [B1-002](bugs/B1-002-client-errors-reported-as-500.md) (low). See also open question Q1 in [questions.md](questions.md) (400 vs 415 on non-JSON `POST /login`) — architect decision needed, not a developer call.
- **BRD ref:** F1.1, F1.2, NF1, NF4 (authenticate with email+password, return 24-hour JWT, HS256 signed)
- **AC:**
  - `POST /login` accepts JSON body with `email` and `password` keys
  - Valid credentials (matching one hardcoded user) return HTTP 200 with `{ "token": "<JWT>" }`
  - Invalid email or password returns HTTP 401 and does not issue a token
  - JWT is signed with HS256 using secret from `process.env.JWT_SECRET` (defaults to `"workshop-secret"` if unset)
  - JWT contains `exp` claim set to 24 hours from issue time
  - JWT payload includes user `id` and `role` (employee, manager, or hr)
  - Invalid JSON or missing fields return HTTP 400
- **Depends on:** S1-001
