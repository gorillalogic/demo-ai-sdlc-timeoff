import { Router } from "express";
import { verifyToken, getBlocklist } from "../auth.ts";

const ROLE_TITLES: Record<string, string> = {
  employee: "Employee Home",
  manager: "Manager Home",
  hr: "HR Home",
};

function renderHome(title: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Time-Off - ${title}</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <main class="landing">
    <h1>${title}</h1>
    <p>Signed in as ${email}</p>
    <button type="button" id="logout-button">Log Out</button>
  </main>
  <script src="/app.js"></script>
</body>
</html>`;
}

const router = Router();

router.get("/", (req, res) => {
  const header = req.headers["authorization"];

  if (header && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length);
    try {
      const decoded = verifyToken(token);
      if (!getBlocklist().has(token)) {
        const title = ROLE_TITLES[decoded.role];
        res.status(200).send(renderHome(title, decoded.email));
        return;
      }
    } catch {
      // fall through to landing page
    }
  }

  res.status(200).sendFile("index.html", { root: "public" });
});

export default router;
