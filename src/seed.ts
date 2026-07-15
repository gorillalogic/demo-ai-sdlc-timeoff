import { store } from "./store.ts";

export interface User {
  email: string;
  password: string;
  role: "employee" | "manager" | "hr";
}

export function initSeed(): void {
  const users: Map<string, User> = new Map();

  const seedUsers: User[] = [
    { email: "employee@test.com", password: "password123", role: "employee" },
    { email: "manager@test.com", password: "password123", role: "manager" },
    { email: "hr@test.com", password: "password123", role: "hr" },
  ];

  for (const user of seedUsers) {
    users.set(user.email, user);
  }

  store.set("users", users);
}
