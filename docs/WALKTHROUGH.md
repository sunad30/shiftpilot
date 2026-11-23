# Explain ShiftPilot clearly

## The short explanation

ShiftPilot is a new portfolio prototype for AI-assisted shift coverage. A coordinator selects an open shift, gets a recommendation with evidence, and approves or rejects it. The important boundary is that the AI can recommend, but deterministic code decides eligibility and the coordinator authorizes the assignment. All data is synthetic, and the hosted demo uses rules; optional live AI runs on the local backend.

## Follow one request through the code

1. `src/App.tsx` calls `api.run(shift.id)`. The UI disables actions while a request is running and renders failures rather than reporting success.
2. In full-stack mode, `src/api.ts` posts to `/api/runs`.
3. `server/app.ts` validates the body and snapshots SQLite state. A single in-process planning flag limits concurrent provider calls in this local prototype.
4. `shared/engine.ts` checks every candidate. Availability must cover the whole interval. Bookings use half-open intervals, so an assignment ending at 4 PM does not overlap one beginning at 4 PM. Dates contain offsets and compare as instants.
5. The selected planner returns a worker ID or null, an explanation, and a draft. Rules mode is deterministic. OpenAI mode receives only the synthetic request and candidate facts, with strict structured output.
6. `validateDecision` rejects IDs outside the eligible set. A model cannot turn an excluded candidate into an eligible one.
7. `addRun` refuses to save an already-outdated proposal. The proposal and a creation event persist together. No assignment exists yet.
8. Approval runs inside `Store.transact`. It checks the proposal is pending, checks its workspace version, rechecks eligibility, adds the booking, updates the shift and proposal, increments the version, and adds the audit event before committing.
9. Replaying an already-approved run returns the state unchanged. Rejecting a pending proposal does not reserve a worker. Reversing a final decision is not permitted.

## Questions worth being ready for

**Why use an LLM for something rules can solve?** The matching criteria here are structured enough for rules. The LLM is an optional experiment for explanations and draft language. The useful engineering exercise is integrating probabilistic output into a reliable product, not pretending the model is necessary for every step. A stronger next experiment would compare coordinator usability and factuality against the deterministic baseline.

**Is this autonomous agent orchestration?** It is a bounded AI workflow with explicit stages, not a multi-agent system or arbitrary tool-calling loop. Say that plainly. There is no model-selected tool execution.

**What if the model invents an ID?** `validateDecision` rejects it. Malformed JSON, schema failures, incomplete responses and timeouts fail without assigning anyone. The adapter test mocks these cases. It does not prove live-model factuality.

**What if the facts change while the provider is running?** The proposal carries the snapshot version. Saving and later approving both compare that version with current state. Approval also recomputes eligibility inside the transaction. A changed schedule requires a fresh proposal.

**What if two coordinators approve overlapping proposals?** SQLite serializes writes. The first assignment increments the workspace version; the second proposal is stale and fails. The global version is safe but overconservative; a real system would use narrower versions and database-level overlap constraints.

**What does approval actually do?** It reserves a synthetic worker in a local schedule. It does not send messages, obtain worker consent, verify real credentials, or modify an external staffing system.

**Why SQLite rather than PostgreSQL?** No infrastructure is needed to run the complete example. It is intentionally a single-workspace prototype. Explain the snapshot storage limitation and the PostgreSQL migration described in the README.

**What are the measured results?** Quote only checks that have run: build/typecheck, domain/API tests and deterministic policy cases. Do not call policy test pass rates LLM accuracy. There is no production time-saving or user-adoption metric.

**How did AI tools contribute?** This project was created with substantial Codex assistance. Be explicit about that if asked. Before claiming personal ownership of its implementation, work through this document, run the test suite, and make a change you can defend.

## Ownership exercise before sharing in an interview

Run the app and trace `propose`, `addRun`, and `decide`. Then add a worker-preference constraint or a certification-expiry gate yourself, write a failing test first, and explain what belongs in deterministic policy versus a prompt. Do not describe that extension as complete until it is implemented and tested.
