import { Router } from "express";
import { store } from "../store.ts";
import type { User } from "../seed.ts";
import { signToken, getBlocklist } from "../auth.ts";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const users = store.get("users") as Map<string, User>;
  const user = users.get(email);

  if (!user || user.password !== password) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }

  const token = signToken(user);
  res.status(200).json({ token });
});

router.post("/logout", (req, res) => {
  const header = req.headers["authorization"] ?? "";
  const token = header.slice("Bearer ".length);
  getBlocklist().add(token);
  res.status(200).json({ message: "Logged out successfully" });
});

export default router;
