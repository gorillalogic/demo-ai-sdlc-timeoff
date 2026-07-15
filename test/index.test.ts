import { test, after } from "node:test";
import assert from "node:assert/strict";
import { server } from "../src/index.ts";

const BASE_URL = "http://localhost:3000";

after(() => {
  server.close();
});

test("GET /health returns 200 with { status: 'ok' } as JSON", async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /application\/json/);
  const body = await res.json();
  assert.deepEqual(body, { status: "ok" });
});

test("GET / serves the Time-Off landing page with a login form", async () => {
  const res = await fetch(`${BASE_URL}/`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /Time-Off/);
  assert.match(body, /type="email"/);
  assert.match(body, /type="password"/);
  assert.match(body, /Log In/);
});
