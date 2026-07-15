# Time-Off Request System — BRD

## Overview
Internal employee time-off request system. Employees submit requests, managers
approve or reject, HR runs reports.

## Roles
- **Employee** — submits requests, views own status
- **Manager** — approves or rejects requests for direct reports
- **HR** — full read access, runs reports

## Functional Requirements

### F1. Authentication
- F1.1. Users authenticate with email and password
- F1.2. On success, return a JWT valid for 24 hours
- F1.3. Logout invalidates the current session

### F2. Time-off Requests
- F2.1. Employees submit requests with `start_date`, `end_date`, `type`
  (`vacation` | `sick` | `personal`), and optional `reason`
- F2.2. Status flow: `submitted` → `approved` | `rejected` | `cancelled`
- F2.3. Employees can cancel a request only while it is in `submitted` status
- F2.4. Employees can list their own requests

### F3. Manager Workflow
- F3.1. Managers see pending requests from their direct reports
- F3.2. Managers approve or reject with an optional comment
- F3.3. Approval or rejection notifies the employee in-app (no email needed)
- F3.4. Managers cannot approve their own requests

### F4. Reporting
- F4.1. HR can list all requests, filtered by date range, status, and employee
- F4.2. HR can export the filtered list as CSV

## Non-Functional
- NF1. All endpoints require authentication except `POST /login` and `GET /health`
- NF2. Server returns JSON
- NF3. `GET /health` returns `{ status: "ok" }` (200)
- NF4. JWT signed with HS256, secret read from `process.env.JWT_SECRET`
  (defaults to `"workshop-secret"` if unset, so `npm start` works with zero config)
- NF5. Logging via `console.log` is acceptable for the demo (no APM)
- NF6. Persistence is an **in-memory** mock store — no files, no external DB,
  no Docker, no cloud services. State reset on restart is expected. The full
  system (BE + FE) must run locally with only `npm install` + `npm start`.
  This applies across all sprints.
