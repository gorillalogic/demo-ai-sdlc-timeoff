# Sprint 1 — App runs locally

## S1-001 — Project Bootstrap with Health Endpoint
- **As a** developer, **I want** the app to boot locally with `npm install && npm start`, **so that** I can run and develop on it.
- **Status:** done
- **BRD ref:** NF3
- **AC:**
  - Running `npm install && npm start` succeeds without errors and starts the server
  - Server listens on `http://localhost:3000`
  - `GET /health` returns `{ status: "ok" }` with HTTP 200 status
  - `package.json` lists only these dependencies: `express`, `jsonwebtoken`, `cors`
  - `src/store.ts` exists and exports an in-memory `Map` for data storage
  - All code is TypeScript; no build step required (runs directly via Node)
  - `src/routes/` directory exists (empty initially, ready for endpoint files)
- **Depends on:** none

## S1-002 — Landing Page with Login Form
- **As a** user, **I want** to see a landing page with a login form when I load the app, **so that** I understand what the app does and can attempt to log in.
- **Status:** done
- **BRD ref:** F1.1 (prep)
- **AC:**
  - Loading `http://localhost:3000` in a browser displays a "Time-Off" landing page
  - Page includes a login form with two input fields: email and password
  - Form has a submit button (text: "Log In" or similar)
  - Form layout is vanilla HTML/CSS (no frameworks); no submission logic yet (deferred to sprint 2)
  - Page title or heading clearly shows "Time-Off" or similar
- **Depends on:** S1-001

## S1-003 — Hardcoded User Seed
- **As a** developer, **I want** three hardcoded users (one per role) bootstrapped into the in-memory store on startup, **so that** future authentication logic can validate against them without a database.
- **Status:** done
- **BRD ref:** Architecture (hardcoded users), F1.1 (prep)
- **AC:**
  - `src/seed.ts` exports an `initSeed()` function
  - Function creates three users with these roles: `employee`, `manager`, `hr`
  - Each user has: `email` (string), `password` (string, plaintext for demo), `role` (string)
  - Example users: `employee@test.com` / `password123` / `employee`; `manager@test.com` / `password123` / `manager`; `hr@test.com` / `password123` / `hr`
  - `initSeed()` is called when the app starts (from `src/index.ts`)
  - Users are stored in the `Map` under key `'users'` as a `Map<email, user object>`
  - Users can be retrieved by email (e.g., `store.get('users').get('employee@test.com')`) for future login validation
- **Depends on:** S1-001
