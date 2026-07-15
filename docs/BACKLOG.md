# Backlog

1. [DONE] App runs locally — `npm install && npm start` boots the app on `localhost:3000`; the browser shows a "Time-Off" landing page with a login form; `GET /health` returns `{ status: "ok" }`
2. [PLANNED] Log in & log out — sign in with email + password, land on a role-appropriate home (employee / manager / HR), and log out (session invalidated)
3. Submit a request — employee fills a form (dates, type, reason) and sees it appear as `submitted`
4. See & cancel my requests — employee views their own list and cancels one while it's still `submitted`
5. Manager decides — manager sees their team's pending requests and approves/rejects with an optional comment; managers cannot approve their own requests
6. Decision notification — employee sees a notification badge and message when their request is decided
7. HR dashboard — HR opens a table of all requests and filters by date range, status, and employee
8. HR export to CSV — HR clicks "Export" and downloads the filtered list as a `.csv` file
