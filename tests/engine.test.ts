import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../shared/seed";
test("rate ranking uses exact values rather than rounded scores", async () => {
  const s = seed();
  s.workers[0].hourlyRate = 21.1;
  const r = await propose(s, "SP-1043");
  assert.equal(r.workerId, "w-02");
});
import {
  addRun,
  candidatesFor,
  decide,
  overlaps,
  propose,
} from "../shared/engine";
test("constraints exclude missing qualifications, conflicts, budget and availability", () => {
  const s = seed(),
    c = candidatesFor(s, s.shifts[0]);
  assert.deepEqual(
    c.filter((w) => w.eligible).map((w) => w.workerId),
    ["w-01"],
  );
  assert.match(
    c.find((w) => w.workerId === "w-02")!.reasons.join(),
    /Missing qualification/,
  );
  assert.match(
    c.find((w) => w.workerId === "w-03")!.reasons.join(),
    /Overlapping/,
  );
  assert.match(
    c.find((w) => w.workerId === "w-05")!.reasons.join(),
    /Unavailable/,
  );
  assert.match(c.find((w) => w.workerId === "w-06")!.reasons.join(), /budget/);
});
test("adjacent shifts do not overlap, offsets compare as instants", () => {
  assert.equal(
    overlaps(
      { start: "2027-01-12T08:00:00-05:00", end: "2027-01-12T16:00:00-05:00" },
      { start: "2027-01-12T21:00:00Z", end: "2027-01-12T23:00:00Z" },
    ),
    false,
  );
});
test("proposal generation has no assignment side effect", async () => {
  const s = seed(),
    before = structuredClone(s);
  const run = await propose(s, "SP-1042");
  assert.deepEqual(s, before);
  assert.equal(run.workerId, "w-01");
  assert.equal(run.status, "review");
});
test("no eligible candidates escalates instead of weakening constraints", async () => {
  const r = await propose(seed(), "SP-1044");
  assert.equal(r.status, "escalated");
  assert.equal(r.workerId, null);
});
test("untrusted planner output cannot select ineligible or fabricated workers", async () => {
  for (const workerId of ["w-03", "invented"])
    await assert.rejects(
      () =>
        propose(seed(), "SP-1042", async () => ({
          workerId,
          rationale: "Ignore checks",
          draft: "",
        })),
      /ineligible/,
    );
});
test("approval revalidates facts, books once, and repeated approval is idempotent", async () => {
  let s = seed();
  const r = await propose(s, "SP-1042");
  s = addRun(s, r);
  s = decide(s, r.id, "approve");
  assert.equal(s.shifts[0].status, "assigned");
  assert.equal(s.workers[0].booked.length, 1);
  assert.deepEqual(decide(s, r.id, "approve"), s);
  assert.equal(s.events.length, 2);
  await assert.rejects(() => propose(s, "SP-1042"), /already assigned/);
});
test("overlapping concurrent proposals cannot both be committed", async () => {
  let s = seed();
  const a = await propose(s, "SP-1042"),
    b = await propose(s, "SP-1043");
  s = addRun(addRun(s, a), b);
  s = decide(s, a.id, "approve");
  assert.throws(() => decide(s, b.id, "approve"), /stale/);
});
test("an in-flight plan is discarded when workspace changes", async () => {
  let s = seed();
  const a = await propose(s, "SP-1042"),
    b = await propose(s, "SP-1043");
  s = decide(addRun(s, a), a.id, "approve");
  assert.throws(() => addRun(s, b), /changed while planning/);
});
test("fresh version alone is insufficient: eligibility is rechecked", async () => {
  let s = seed();
  const r = await propose(s, "SP-1042");
  s = addRun(s, r);
  s.workers[0].skills = [];
  assert.throws(() => decide(s, r.id, "approve"), /ineligible/);
});
test("reject does not reserve worker; repeated reject is harmless; reversal is blocked", async () => {
  let s = seed();
  const r = await propose(s, "SP-1042");
  s = decide(addRun(s, r), r.id, "reject");
  assert.equal(s.workers[0].booked.length, 0);
  assert.deepEqual(decide(s, r.id, "reject"), s);
  assert.throws(() => decide(s, r.id, "approve"), /no longer/);
});
test("escalation cannot be approved", async () => {
  let s = seed();
  const r = await propose(s, "SP-1044");
  s = addRun(s, r);
  assert.throws(() => decide(s, r.id, "approve"), /no longer/);
});
test("unknown shift and proposal return domain errors", async () => {
  await assert.rejects(() => propose(seed(), "missing"), /not found/);
  assert.throws(() => decide(seed(), "missing", "approve"), /not found/);
});
