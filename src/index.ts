import express from "express";
import cors from "cors";
import { store } from "./store.ts";
import { initSeed } from "./seed.ts";
import { authMiddleware } from "./auth.ts";
import authRouter from "./routes/auth.ts";
import homeRouter from "./routes/home.ts";

const PORT = 3000;

initSeed();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public", { index: false }));
app.use(authMiddleware);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(authRouter);
app.use(homeRouter);

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

export { app, server, store };
