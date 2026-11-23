import express from "express";
import { z } from "zod";
import {
  addRun,
  decide,
  DomainError,
  propose,
  rulesPlanner,
} from "../shared/engine";
import type { Planner, Run } from "../shared/types";
import type { Store } from "./store";
export function createApp(
  store: Store,
  planner: Planner = rulesPlanner,
  mode: Run["mode"] = "rules",
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "8kb" }));
  // Local demo only. Do not publish this unauthenticated API on a public interface.
  app.use("/api", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      try {
        const u = new URL(origin);
        if (!["localhost", "127.0.0.1"].includes(u.hostname))
          return res.status(403).json({ error: "Origin not allowed" });
      } catch {
        return res.status(403).json({ error: "Invalid origin" });
      }
    }
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.get("/api/state", (_req, res) => res.json({ state: store.read(), mode }));
  let planning = false;
  app.post("/api/runs", async (req, res, next) => {
    if (planning)
      return res
        .status(429)
        .json({ error: "A recommendation is already running. Please wait." });
    planning = true;
    try {
      const { shiftId } = z
        .object({ shiftId: z.string().min(1).max(80) })
        .strict()
        .parse(req.body);
      const run = await propose(store.read(), shiftId, planner, mode);
      const state = store.transact((s) => addRun(s, run));
      res.status(201).json({ state, mode });
    } catch (e) {
      next(e);
    } finally {
      planning = false;
    }
  });
  app.post("/api/runs/:id/decision", (req, res, next) => {
    try {
      const { action } = z
        .object({ action: z.enum(["approve", "reject"]) })
        .strict()
        .parse(req.body);
      res.json({
        state: store.transact((s) => decide(s, String(req.params.id), action)),
        mode,
      });
    } catch (e) {
      next(e);
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Endpoint not found" }),
  );
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err instanceof DomainError)
        return res.status(err.status).json({ error: err.message });
      if (err instanceof z.ZodError)
        return res
          .status(400)
          .json({ error: "Invalid request or planner response" });
      if (err instanceof SyntaxError)
        return res.status(400).json({ error: "Invalid JSON" });
      res
        .status(502)
        .json({
          error:
            "Recommendation could not be completed. No assignment was made. Try again or use rules mode.",
        });
    },
  );
  return app;
}
