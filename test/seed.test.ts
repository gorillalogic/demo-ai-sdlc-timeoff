import { test } from "node:test";
import assert from "node:assert/strict";
import { store } from "../src/store.ts";
import { initSeed, type User } from "../src/seed.ts";

test("initSeed() populates three users with correct email/password/role", () => {
  initSeed();
  const users = store.get("users") as Map<string, User>;

  assert.equal(users.size, 3);

  assert.deepEqual(users.get("employee@test.com"), {
    email: "employee@test.com",
    password: "password123",
    role: "employee",
  });
  assert.deepEqual(users.get("manager@test.com"), {
    email: "manager@test.com",
    password: "password123",
    role: "manager",
  });
  assert.deepEqual(users.get("hr@test.com"), {
    email: "hr@test.com",
    password: "password123",
    role: "hr",
  });
});

test("users are retrievable by email via store.get('users').get(email)", () => {
  initSeed();
  const users = store.get("users") as Map<string, User>;
  const employee = users.get("employee@test.com");
  assert.ok(employee);
  assert.equal(employee?.role, "employee");
});

test("initSeed() is idempotent - re-seeding does not duplicate users", () => {
  initSeed();
  initSeed();
  const users = store.get("users") as Map<string, User>;
  assert.equal(users.size, 3);
});
