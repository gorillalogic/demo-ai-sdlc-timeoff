import { test, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { server } from "../src/index.ts";
import { getSecret, getBlocklist } from "../src/auth.ts";

const BASE_URL = "http://localhost:3000";

after(() => {
  server.close();
});

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return body.token as string;
}

test("POST /login returns 200 and a JWT for valid credentials", async () => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "employee@test.com", password: "password123" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(typeof body.token === "string");

  const decoded = jwt.verify(body.token, getSecret()) as jwt.JwtPayload;
  assert.equal(decoded.email, "employee@test.com");
  assert.equal(decoded.role, "employee");
  assert.ok(typeof decoded.exp === "number");
  assert.ok(typeof decoded.iat === "number");
  assert.equal(decoded.exp - decoded.iat, 24 * 60 * 60);
});

test("POST /login returns 401 for wrong password", async () => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "employee@test.com", password: "wrong" }),
  });
  assert.equal(res.status, 401);
});

test("POST /login returns 401 for unknown email", async () => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nobody@test.com", password: "password123" }),
  });
  assert.equal(res.status, 401);
});

test("POST /login returns 400 when password is missing", async () => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "employee@test.com" }),
  });
  assert.equal(res.status, 400);
});

test("POST /login returns 400 when email is missing", async () => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "password123" }),
  });
  assert.equal(res.status, 400);
});

test("JWT is signed with HS256 using JWT_SECRET (default workshop-secret)", async () => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "manager@test.com", password: "password123" }),
  });
  const { token } = await res.json();
  const decodedHeader = JSON.parse(
    Buffer.from(token.split(".")[0], "base64url").toString("utf8"),
  );
  assert.equal(decodedHeader.alg, "HS256");
  assert.doesNotThrow(() => jwt.verify(token, "workshop-secret"));
});

test("GET /health, POST /login, and GET / serve without an Authorization header", async () => {
  const health = await fetch(`${BASE_URL}/health`);
  assert.equal(health.status, 200);

  const login_ = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "employee@test.com", password: "password123" }),
  });
  assert.equal(login_.status, 200);

  const root = await fetch(`${BASE_URL}/`);
  assert.equal(root.status, 200);
});

test("other routes return 401 when Authorization header is missing", async () => {
  const res = await fetch(`${BASE_URL}/some-protected-route`);
  assert.equal(res.status, 401);
});

test("other routes return 401 when Authorization header does not start with 'Bearer '", async () => {
  const res = await fetch(`${BASE_URL}/some-protected-route`, {
    headers: { Authorization: "Basic abc123" },
  });
  assert.equal(res.status, 401);
});

test("other routes return 401 when the Bearer token has a bad signature", async () => {
  const badToken = jwt.sign({ email: "employee@test.com", role: "employee" }, "wrong-secret", {
    algorithm: "HS256",
  });
  const res = await fetch(`${BASE_URL}/some-protected-route`, {
    headers: { Authorization: `Bearer ${badToken}` },
  });
  assert.equal(res.status, 401);
});

test("other routes return 401 when the Bearer token is expired", async () => {
  const expiredToken = jwt.sign(
    { email: "employee@test.com", role: "employee" },
    getSecret(),
    { algorithm: "HS256", expiresIn: -10 },
  );
  const res = await fetch(`${BASE_URL}/some-protected-route`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  assert.equal(res.status, 401);
});

test("other routes return 401 when the Bearer token is in the logout blocklist", async () => {
  const token = await login("employee@test.com", "password123");
  getBlocklist().add(token);
  const res = await fetch(`${BASE_URL}/some-protected-route`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 401);
  getBlocklist().delete(token);
});

test("valid Bearer token allows the request past the auth middleware", async () => {
  const token = await login("employee@test.com", "password123");
  const res = await fetch(`${BASE_URL}/some-protected-route`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // No route handler exists at this path, so Express falls through to its
  // default 404 rather than the middleware's 401 - proof the token passed.
  assert.notEqual(res.status, 401);
  assert.equal(res.status, 404);
});

test("POST /logout requires a valid Bearer token", async () => {
  const res = await fetch(`${BASE_URL}/logout`, { method: "POST" });
  assert.equal(res.status, 401);
});

test("POST /logout returns 200 with a success message for a valid token", async () => {
  const token = await login("manager@test.com", "password123");
  const res = await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { message: "Logged out successfully" });
});

test("after logout, requests using the same JWT return 401", async () => {
  const token = await login("manager@test.com", "password123");
  await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const res = await fetch(`${BASE_URL}/some-protected-route`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 401);
});

test("after logout, the user can log in again and receive a new valid JWT", async () => {
  const token = await login("hr@test.com", "password123");
  await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  // JWT `iat` has one-second resolution: per design.md's documented edge case,
  // a re-login within the same wall-clock second as the logout can yield an
  // identical (still-blocklisted) token. Cross a second boundary so this test
  // deterministically exercises the "new token works" AC.
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const newToken = await login("hr@test.com", "password123");
  assert.ok(typeof newToken === "string");
  assert.notEqual(newToken, token);

  const res = await fetch(`${BASE_URL}/some-protected-route`, {
    headers: { Authorization: `Bearer ${newToken}` },
  });
  assert.notEqual(res.status, 401);
});

test("GET / unauthenticated serves the landing page with a login form", async () => {
  const res = await fetch(`${BASE_URL}/`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /Time-Off/);
  assert.match(body, /type="email"/);
  assert.match(body, /type="password"/);
});

test("GET / as employee returns the Employee Home page with the user's email", async () => {
  const token = await login("employee@test.com", "password123");
  const res = await fetch(`${BASE_URL}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /Employee Home/);
  assert.match(body, /employee@test\.com/);
  assert.match(body, /logout/i);
});

test("GET / as manager returns the Manager Home page with the user's email", async () => {
  const token = await login("manager@test.com", "password123");
  const res = await fetch(`${BASE_URL}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /Manager Home/);
  assert.match(body, /manager@test\.com/);
});

test("GET / as hr returns the HR Home page with the user's email", async () => {
  const token = await login("hr@test.com", "password123");
  const res = await fetch(`${BASE_URL}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /HR Home/);
  assert.match(body, /hr@test\.com/);
});

test("after logout, GET / returns the landing page again", async () => {
  const token = await login("employee@test.com", "password123");
  await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const res = await fetch(`${BASE_URL}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /type="email"/);
  assert.doesNotMatch(body, /Employee Home/);
});
