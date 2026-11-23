import type {
  Candidate,
  Decision,
  Interval,
  Planner,
  Run,
  Shift,
  State,
} from "./types";
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
const t = (s: string) => new Date(s).getTime();
export const overlaps = (a: Interval, b: Interval) =>
  t(a.start) < t(b.end) && t(b.start) < t(a.end);
export function candidatesFor(state: State, shift: Shift): Candidate[] {
  return state.workers
    .map((w) => {
      const reasons: string[] = [];
      const missing = shift.skills.filter((s) => !w.skills.includes(s));
      if (missing.length)
        reasons.push(`Missing qualification: ${missing.join(", ")}`);
      if (
        !w.availability.some(
          (a) => t(a.start) <= t(shift.start) && t(a.end) >= t(shift.end),
        )
      )
        reasons.push("Unavailable for the full shift");
      if (w.booked.some((b) => overlaps(b, shift)))
        reasons.push("Overlapping assignment");
      if (w.hourlyRate > shift.maxRate)
        reasons.push(
          `Rate $${w.hourlyRate}/hr exceeds $${shift.maxRate}/hr budget`,
        );
      return {
        workerId: w.id,
        name: w.name,
        eligible: reasons.length === 0,
        reasons,
        // Skill fit is a gate, not a proxy for personal attributes. Among eligible workers prefer lower rate.
        score: reasons.length
          ? 0
          : Math.round(100 - (w.hourlyRate / shift.maxRate) * 20),
        hourlyRate: w.hourlyRate,
        evidence: [
          `workers/${w.id}/skills`,
          `workers/${w.id}/availability`,
          `workers/${w.id}/booked`,
          `shifts/${shift.id}/maxRate`,
        ],
      };
    })
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        a.hourlyRate - b.hourlyRate ||
        a.workerId.localeCompare(b.workerId),
    );
}
export const rulesPlanner: Planner = async (shift, candidates) => {
  const best = candidates.find((c) => c.eligible);
  return best
    ? {
        workerId: best.workerId,
        rationale: `${best.name} meets every required qualification, is available for the entire shift, has no overlapping assignment, and is within the $${shift.maxRate}/hr budget. Lowest hourly rate among eligible workers; ties use worker ID.`,
        draft: `Hi ${best.name.split(" ")[0]}, are you available for the ${shift.role.toLowerCase()} shift at ${shift.site}? The rate is $${best.hourlyRate}/hr. Please confirm with the coordinator.`,
      }
    : {
        workerId: null,
        rationale:
          "No worker meets all qualifications, availability, conflict, and budget constraints. Escalate to a coordinator; do not relax the requirements automatically.",
        draft: "",
      };
};
export function validateDecision(decision: Decision, candidates: Candidate[]) {
  if (
    decision.workerId !== null &&
    !candidates.some((c) => c.workerId === decision.workerId && c.eligible)
  )
    throw new DomainError(
      "Planner selected an unknown or ineligible worker",
      422,
    );
}
export async function propose(
  state: State,
  shiftId: string,
  planner: Planner = rulesPlanner,
  mode: Run["mode"] = "rules",
): Promise<Run> {
  const start = performance.now();
  const shift = state.shifts.find((s) => s.id === shiftId);
  if (!shift) throw new DomainError("Shift not found", 404);
  if (shift.status !== "open")
    throw new DomainError("Shift is already assigned");
  const candidates = candidatesFor(state, shift);
  const decision = await planner(shift, candidates);
  validateDecision(decision, candidates);
  return {
    id: crypto.randomUUID(),
    shiftId,
    version: state.version,
    createdAt: new Date().toISOString(),
    mode,
    status: decision.workerId ? "review" : "escalated",
    ...decision,
    candidates,
    elapsedMs: Math.round(performance.now() - start),
    steps: [
      {
        tool: "read_shift",
        outcome: `Loaded ${shift.id}: ${shift.role} at ${shift.site}`,
        evidence: [`shifts/${shift.id}`],
      },
      {
        tool: "check_eligibility",
        outcome: `${candidates.filter((c) => c.eligible).length} eligible of ${candidates.length} workers. Checked qualifications, availability, conflicts, and budget.`,
        evidence: candidates.flatMap((c) => c.evidence),
      },
      {
        tool: mode === "rules" ? "rank_with_rules" : "recommend_with_llm",
        outcome: decision.rationale,
        evidence: decision.workerId ? [`workers/${decision.workerId}`] : [],
      },
      {
        tool: "validate_proposal",
        outcome: decision.workerId
          ? "Recommendation passed deterministic constraints. Waiting for human approval."
          : "No assignment proposed. Human intervention required.",
        evidence: [`state/version/${state.version}`],
      },
    ],
  };
}
export function addRun(state: State, run: Run): State {
  if (state.version !== run.version)
    throw new DomainError("Schedule changed while planning. Run again.");
  return {
    ...state,
    runs: [run, ...state.runs],
    events: [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        type: "proposal_created",
        detail: `${run.shiftId}: ${run.status === "escalated" ? "escalated" : "ready for review"}`,
        runId: run.id,
      },
      ...state.events,
    ],
  };
}
export function decide(
  state: State,
  runId: string,
  action: "approve" | "reject",
): State {
  const run = state.runs.find((r) => r.id === runId);
  if (!run) throw new DomainError("Proposal not found", 404);
  const target = action === "approve" ? "approved" : "rejected";
  if (run.status === target) return state; // idempotent replay: no second booking or audit event
  if (run.status !== "review")
    throw new DomainError("This proposal is no longer awaiting review");
  const next = structuredClone(state),
    edited = next.runs.find((r) => r.id === runId)!;
  if (action === "approve") {
    if (run.version !== state.version)
      throw new DomainError(
        "This proposal is stale. Generate a fresh recommendation.",
      );
    const shift = next.shifts.find((s) => s.id === run.shiftId)!;
    if (shift.status !== "open")
      throw new DomainError("Shift is already assigned");
    if (!run.workerId) throw new DomainError("Escalations cannot be approved");
    validateDecision(run, candidatesFor(next, shift)); // recheck current facts at commit time
    const worker = next.workers.find((w) => w.id === run.workerId)!;
    worker.booked.push({ start: shift.start, end: shift.end });
    shift.status = "assigned";
    shift.workerId = worker.id;
    next.version++;
  }
  edited.status = target;
  next.events.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    type: `proposal_${target}`,
    detail: `${run.shiftId}: ${target} by demo coordinator; no external message sent`,
    runId,
  });
  return next;
}
