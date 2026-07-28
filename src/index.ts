import express from "express";
import cors from "cors";
import { seedUsers } from "./seed.ts";
import { healthRouter } from "./routes/health.ts";
import { authRouter } from "./routes/auth.ts";

const PORT = 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use(healthRouter);
app.use(authRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "invalid json body" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "internal server error" });
  },
);

seedUsers();

app.listen(PORT, () => {
  console.log(`Time-Off server listening on http://localhost:${PORT}`);
});
