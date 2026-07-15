import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { User } from "./seed.ts";
import { store } from "./store.ts";

export interface AuthUser {
  email: string;
  role: User["role"];
}

export function getSecret(): string {
  return process.env.JWT_SECRET ?? "workshop-secret";
}

export function signToken(user: Pick<User, "email" | "role">): string {
  return jwt.sign({ email: user.email, role: user.role }, getSecret(), {
    algorithm: "HS256",
    expiresIn: "24h",
  });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, getSecret(), { algorithms: ["HS256"] }) as AuthUser;
}

export function getBlocklist(): Set<string> {
  let blocklist = store.get("blocklist") as Set<string> | undefined;
  if (!blocklist) {
    blocklist = new Set<string>();
    store.set("blocklist", blocklist);
  }
  return blocklist;
}

const PUBLIC_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/health" },
  { method: "POST", path: "/login" },
  { method: "GET", path: "/" },
];

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isPublic = PUBLIC_ROUTES.some(
    (route) => route.method === req.method && route.path === req.path,
  );
  if (isPublic) {
    next();
    return;
  }

  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing or invalid authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length);

  let decoded: AuthUser;
  try {
    decoded = verifyToken(token);
  } catch {
    res.status(401).json({ error: "invalid token" });
    return;
  }

  if (getBlocklist().has(token)) {
    res.status(401).json({ error: "token is blocklisted" });
    return;
  }

  req.user = decoded;
  next();
}
