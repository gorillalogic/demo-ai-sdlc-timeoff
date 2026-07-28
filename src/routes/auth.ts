import { Router } from "express";
import { getUserByEmail } from "../store.ts";
import { signToken } from "../auth.ts";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  if (!req.is("application/json")) {
    res.status(415).json({ error: "content-type must be application/json" });
    return;
  }

  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.trim() === "" ||
    password.trim() === ""
  ) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const user = getUserByEmail(email);

  if (!user || user.password !== password) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }

  const token = signToken(user);
  res.status(200).json({ token });
});
