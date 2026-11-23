import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../server/store";
import { createApp } from "../server/app";
import { addRun, decide, propose } from "../shared/engine";
import { openAIPlanner } from "../server/planner";
import { seed } from "../shared/seed";
test("SQLite survives reopening and rolls back failed transactions", async () => {
  const dir = mkdtempSync(join(tmpdir(), "shiftpilot-"));
  const path = join(dir, "test.sqlite");
  let store = new Store(path);
  const r = await propose(store.read(), "SP-1042");
  store.transact((s) => addRun(s, r));
  store.transact((s) => decide(s, r.id, "approve"));
  store.close();
  store = new Store(path);
  assert.equal(store.read().shifts[0].status, "assigned");
  assert.throws(() =>
    store.transact((s) => {
      s.version = 999;
      throw new Error("fail");
    }),
  );
  assert.equal(store.read().version, 2);
  store.close();
  rmSync(dir, { recursive: true });
});
test("API returns errors for malformed input and performs reviewed assignment", async () => {
  const store = new Store(":memory:");
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const post = (path: string, body: unknown) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await post("/runs", { shiftId: 42 })).status, 400);
    assert.equal((await post("/runs", { shiftId: "missing" })).status, 404);
    assert.equal(
      (
        await fetch(base + "/state", {
          headers: { Origin: "https://evil.example" },
        })
      ).status,
      403,
    );
    const res = await post("/runs", { shiftId: "SP-1042" });
    assert.equal(res.status, 201);
    const { state } = await res.json();
    assert.equal(state.shifts[0].status, "open");
    const id = state.runs[0].id;
    assert.equal(
      (await post(`/runs/${id}/decision`, { action: "send" })).status,
      400,
    );
    const accepted = await post(`/runs/${id}/decision`, { action: "approve" });
    assert.equal(accepted.status, 200);
    const replay = await post(`/runs/${id}/decision`, { action: "approve" });
    const { state: final } = await replay.json();
    assert.equal(final.workers[0].booked.length, 1);
    assert.equal(final.events.length, 2);
  } finally {
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
    store.close();
  }
});
test("OpenAI adapter uses structured output and fails closed on refusal, bad JSON, invalid schema, and HTTP failure", async () => {
  const good = {
    workerId: "w-01",
    rationale: "Eligible",
    draft: "Please confirm.",
  };
  let captured: any;
  const mock = (payload: unknown, status = 200) =>
    (async (_input: unknown, init: any) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify(payload), { status });
    }) as typeof fetch;
  const data = (text: string) => ({
    status: "completed",
    output: [{ content: [{ type: "output_text", text }] }],
  });
  const s = seed();
  assert.deepEqual(
    await openAIPlanner(
      "test-key",
      "test-model",
      mock(data(JSON.stringify(good))),
    )(s.shifts[0], []),
    good,
  );
  assert.equal(captured.store, false);
  assert.equal(captured.text.format.strict, true);
  for (const payload of [
    { status: "incomplete" },
    data("not-json"),
    data(JSON.stringify({ workerId: 42 })),
    { status: "completed", output: [{ content: [{ type: "refusal" }] }] },
  ]) {
    await assert.rejects(() =>
      openAIPlanner("test", "model", mock(payload))(s.shifts[0], []),
    );
  }
  await assert.rejects(
    () => openAIPlanner("test", "model", mock({}, 429))(s.shifts[0], []),
    /429/,
  );
});
