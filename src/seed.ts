import { addUser, resetStore, type User } from "./store.ts";

const fixtureUsers: User[] = [
  {
    id: "u-emp-1",
    email: "employee@timeoff.local",
    password: "employee123",
    name: "Elena Employee",
    role: "employee",
    managerId: "u-mgr-1",
  },
  {
    id: "u-mgr-1",
    email: "manager@timeoff.local",
    password: "manager123",
    name: "Manuel Manager",
    role: "manager",
    managerId: null,
  },
  {
    id: "u-hr-1",
    email: "hr@timeoff.local",
    password: "hr123",
    name: "Hilda HR",
    role: "hr",
    managerId: null,
  },
];

export function seedUsers(): void {
  resetStore();
  for (const user of fixtureUsers) {
    addUser(user);
  }
}
