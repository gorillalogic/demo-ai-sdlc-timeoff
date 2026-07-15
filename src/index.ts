import express from "express";
import cors from "cors";
import { store } from "./store.ts";
import { initSeed } from "./seed.ts";

const PORT = 3000;

initSeed();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

export { app, server, store };
