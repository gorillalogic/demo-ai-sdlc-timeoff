export type Role = "employee" | "manager" | "hr";

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  managerId: string | null;
}

export const users = new Map<string, User>();

export function addUser(user: User): void {
  users.set(user.id, user);
}

export function getUserById(id: string): User | undefined {
  return users.get(id);
}

export function getUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  for (const user of users.values()) {
    if (user.email.toLowerCase() === normalized) {
      return user;
    }
  }
  return undefined;
}

export function resetStore(): void {
  users.clear();
}
