import "dotenv/config";
import { mkdirSync } from "node:fs";
import express from "express";
import { resolve } from "node:path";
import { Store } from "./store";
import { createApp } from "./app";
import { openAIPlanner } from "./planner";
mkdirSync("data", { recursive: true });
const store = new Store("data/shiftpilot.sqlite");
const key = process.env.OPENAI_API_KEY;
const app = createApp(
  store,
  key
    ? openAIPlanner(key, process.env.OPENAI_MODEL || "gpt-4.1-mini")
    : undefined,
  key ? "openai" : "rules",
);
app.use(express.static(resolve("dist")));
const server = app.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
  console.log(
    `ShiftPilot: http://127.0.0.1:${process.env.PORT || 3001} · ${key ? "OpenAI" : "deterministic rules"} mode`,
  ),
);
process.on("SIGTERM", () =>
  server.close(() => {
    store.close();
    process.exit(0);
  }),
);
