import jwt from "jsonwebtoken";
import type { Role, User } from "./store.ts";

export const JWT_SECRET = process.env.JWT_SECRET ?? "workshop-secret";

export interface TokenPayload {
  id: string;
  email: string;
  role: Role;
}

export function signToken(user: User): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "24h",
  });
}
