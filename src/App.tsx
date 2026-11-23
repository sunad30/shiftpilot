import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Command,
  FileCheck2,
  GitBranch,
  Code2,
  LayoutDashboard,
  LoaderCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { api, browserDemo } from "./api";
import type { State, Run } from "../shared/types";
const hours = (start: string, end: string) =>
  `${new Date(start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} – ${new Date(end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}`;
export default function App() {
  const [state, setState] = useState<State | null>(null),
    [mode, setMode] = useState("rules");
  const [selected, setSelected] = useState("SP-1042"),
    [view, setView] = useState("workspace"),
    [tab, setTab] = useState("recommendation");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [notice, setNotice] = useState(""),
    [help, setHelp] = useState(false);
  const update = (s: { state: State; mode: string }) => {
    setState(s.state);
    setMode(s.mode);
  };
  useEffect(() => {
    api
      .load()
      .then(update)
      .catch((e) => setError(e.message));
  }, []);
  const act = async (fn: () => ReturnType<typeof api.load>, message = "") => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      update(await fn());
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  if (!state)
    return (
      <main className="loading">
        <Command size={36} />
        <h1>ShiftPilot</h1>
        <p>{error || "Opening your operations workspace…"}</p>
        {error && <button onClick={() => location.reload()}>Retry</button>}
      </main>
    );
  const shift = state.shifts.find((s) => s.id === selected) ?? state.shifts[0];
  const run = state.runs.find((r) => r.shiftId === shift.id);
  const chosen = run?.candidates.find((c) => c.workerId === run.workerId);
  const open = state.shifts.filter((s) => s.status === "open").length;
  const review = state.runs.filter(
    (r) => r.status === "review" && r.version === state.version,
  ).length;
  const visible = state.shifts.filter(
    (s) =>
      (filter === "all" || s.status === filter) &&
      `${s.id} ${s.site} ${s.role}`.toLowerCase().includes(query.toLowerCase()),
  );
  const runAction = () =>
    act(
      () => api.run(shift.id),
      "Proposal generated. Review the evidence before approving.",
    );
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label="ShiftPilot home"
          onClick={(e) => {
            e.preventDefault();
            setView("workspace");
          }}
        >
          <span className="brand-icon">
            <GitBranch size={24} />
          </span>
          ShiftPilot<span className="brand-dot">•</span>
        </a>
        <div className="workspace-label">OPERATIONS WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={view === "workspace" ? "nav active" : "nav"}
            onClick={() => setView("workspace")}
          >
            <LayoutDashboard size={18} />
            Coverage desk<span className="nav-count">{open}</span>
          </button>
          <button
            className={view === "workers" ? "nav active" : "nav"}
            onClick={() => setView("workers")}
          >
            <Users size={18} />
            Worker directory
          </button>
          <button
            className={view === "audit" ? "nav active" : "nav"}
            onClick={() => setView("audit")}
          >
            <FileCheck2 size={18} />
            Activity log
            <span className="quiet-count">{state.events.length}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="safety-card">
            <ShieldCheck size={20} />
            <strong>Human judgment, always.</strong>
            <p>
              Every assignment needs your approval. Every decision leaves a
              trail.
            </p>
          </div>
          <a
            className="source-link"
            href="https://github.com/sunad30/shiftpilot"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={16} />
            Explore the source
            <ArrowUpRight size={15} />
          </a>
          <div className="profile">
            <div className="avatar">DC</div>
            <div>
              <strong>Demo coordinator</strong>
              <small>Synthetic workspace</small>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            Workspace <ChevronRight size={14} />
            <span>
              {view === "workspace"
                ? "Coverage desk"
                : view === "workers"
                  ? "Worker directory"
                  : "Activity log"}
            </span>
          </div>
          <button className="help-button" onClick={() => setHelp(!help)}>
            How this works <ArrowUpRight size={14} />
          </button>
        </header>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button
            aria-current={view === "workspace" ? "page" : undefined}
            onClick={() => setView("workspace")}
          >
            Coverage desk
          </button>
          <button
            aria-current={view === "workers" ? "page" : undefined}
            onClick={() => setView("workers")}
          >
            Workers
          </button>
          <button
            aria-current={view === "audit" ? "page" : undefined}
            onClick={() => setView("audit")}
          >
            Activity
          </button>
        </nav>
        <div className="page">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                A LITTLE LESS CHAOS. A LOT MORE CLARITY.
              </div>
              <h1>
                {view === "workspace"
                  ? "Coverage, with confidence."
                  : view === "workers"
                    ? "The people behind the plan."
                    : "A record of every decision."}
              </h1>
              <p>
                {view === "workspace"
                  ? "From an open shift to a considered decision. You stay in control."
                  : view === "workers"
                    ? "Qualifications, availability, and rates. Synthetic data, transparent constraints."
                    : "Trace proposals and approvals back to their evidence."}
              </p>
            </div>
            <span className="date-label">
              <Clock3 size={14} />
              Scenario · Jan 12, 2027
            </span>
          </div>
          <div className="demo-banner">
            <span className="status-dot" />
            <span>
              <strong>
                {mode === "openai"
                  ? "Live AI planner"
                  : "Interactive rules demo"}
              </strong>{" "}
              ·{" "}
              {browserDemo
                ? "Runs in your browser. Synthetic data; no API key required."
                : "Local workspace with SQLite persistence."}{" "}
              No messages are sent.
            </span>
            {browserDemo && (
              <button
                disabled={busy}
                onClick={() => {
                  update(api.reset());
                  setError("");
                  setNotice("Demo workspace reset.");
                }}
              >
                <RotateCcw size={13} />
                Reset demo
              </button>
            )}
          </div>
          {help && (
            <section className="help-panel">
              <button
                className="close"
                aria-label="Close explanation"
                onClick={() => setHelp(false)}
              >
                <X size={18} />
              </button>
              <h2>From request to reviewed action</h2>
              <p>
                1. Select a shift. 2. Generate a proposal. 3. Inspect candidates
                and the run trace. 4. Approve or reject.
              </p>
              <p>
                The public demo uses deterministic rules, not a live LLM. Run
                the full-stack app locally with your own OpenAI key to use
                structured model output. Hard constraints are checked
                independently in either mode. Try the inventory shift to see
                escalation when nobody qualifies.
              </p>
              <p>
                Approving reserves a synthetic worker locally. It never sends an
                invitation or confirms a real worker. Dates and rates are
                illustrative, not employment advice.
              </p>
            </section>
          )}
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Dismiss notice">
                <X size={16} />
              </button>
            </div>
          )}
          <section className="metrics" aria-label="Workspace metrics">
            <div>
              <span>Open shifts</span>
              <strong>{open.toString().padStart(2, "0")}</strong>
              <small>
                Across {new Set(state.shifts.map((s) => s.site)).size} locations
              </small>
            </div>
            <div>
              <span>Ready for review</span>
              <strong>
                {review.toString().padStart(2, "0")}
                <span className="metric-mark">
                  <Sparkles size={18} />
                </span>
              </strong>
              <small>Fresh proposals awaiting you</small>
            </div>
            <div>
              <span>Assignments approved</span>
              <strong>
                {state.shifts.length - open}
                <span className="metric-mark">
                  <CircleCheck size={18} />
                </span>
              </strong>
              <small>Human-reviewed decisions</small>
            </div>
            <div>
              <span>Approval policy</span>
              <strong className="policy-value">
                <ShieldCheck size={24} />
                Always on
              </strong>
              <small>No autonomous assignments</small>
            </div>
          </section>
          {view === "workspace" ? (
            <div className="desk">
              <section className="queue">
                <div className="section-title">
                  <h2>Coverage queue</h2>
                  <span>{visible.length} requests</span>
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Search shifts"
                    placeholder="Search site or role…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <div className="filters" aria-label="Filter shifts">
                  {["all", "open", "assigned"].map((f) => (
                    <button
                      key={f}
                      className={filter === f ? "selected" : ""}
                      onClick={() => setFilter(f)}
                    >
                      {f === "all"
                        ? "All requests"
                        : f === "open"
                          ? "Open"
                          : "Assigned"}
                    </button>
                  ))}
                </div>
                <div className="request-list">
                  {visible.length === 0 && (
                    <p className="empty-search">
                      No requests match your search.
                    </p>
                  )}
                  {visible.map((s) => (
                    <button
                      key={s.id}
                      className={`request ${selected === s.id ? "current" : ""}`}
                      onClick={() => {
                        setSelected(s.id);
                        setTab("recommendation");
                        setError("");
                        setNotice("");
                      }}
                    >
                      <div className="request-top">
                        <span className="mono">{s.id}</span>
                        <span
                          className={`badge ${s.status === "assigned" ? "green" : s.priority === "urgent" ? "amber" : "neutral"}`}
                        >
                          {s.status === "assigned"
                            ? "Assigned"
                            : s.priority === "urgent"
                              ? "Priority"
                              : "Open"}
                        </span>
                      </div>
                      <h3>{s.role}</h3>
                      <p>{s.site}</p>
                      <div className="request-time">
                        <Clock3 size={13} />
                        {hours(s.start, s.end)}
                      </div>
                      <div className="request-bottom">
                        <span>Up to ${s.maxRate}/hr</span>
                        <ArrowRight size={16} />
                      </div>
                    </button>
                  ))}
                </div>
                <div className="queue-foot">
                  <ShieldCheck size={14} />
                  Synthetic records · Eastern time
                </div>
              </section>
              <section className="detail">
                <div className="detail-header">
                  <div>
                    <span className="eyebrow">
                      {shift.id} / COVERAGE REQUEST
                    </span>
                    <h2>{shift.role}</h2>
                    <p>
                      {shift.site} <span>·</span>{" "}
                      {hours(shift.start, shift.end)} ET
                    </p>
                  </div>
                  <span
                    className={`badge ${shift.status === "assigned" ? "green" : "neutral"}`}
                  >
                    {shift.status === "assigned"
                      ? "Assigned"
                      : "Needs coverage"}
                  </span>
                </div>
                <div className="request-note">
                  <span className="avatar small">OP</span>
                  <div>
                    <strong>From the operations desk</strong>
                    <p>{shift.note}</p>
                  </div>
                </div>
                <div className="requirements">
                  <span>
                    <ShieldCheck size={14} />
                    {shift.skills.join(", ")}
                  </span>
                  <span>≤ ${shift.maxRate}/hr</span>
                  <span>Full-shift availability</span>
                </div>
                <div
                  className="tabs"
                  role="tablist"
                  aria-label="Proposal details"
                >
                  {["recommendation", "candidates", "trace"].map((t) => (
                    <button
                      role="tab"
                      aria-selected={tab === t}
                      key={t}
                      onClick={() => setTab(t)}
                    >
                      {t === "recommendation"
                        ? "Recommendation"
                        : t === "candidates"
                          ? "Candidate checks"
                          : "Run trace"}
                      {t === "trace" && run && <span>{run.steps.length}</span>}
                    </button>
                  ))}
                </div>
                {!run ? (
                  <div className="empty-state">
                    <div className="sparkle-tile">
                      <Sparkles size={27} />
                    </div>
                    <span className="eyebrow">A CLEAR NEXT STEP</span>
                    <h3>Let’s find the right coverage.</h3>
                    <p>
                      Check qualifications, availability, conflicts, and budget.
                      Get a recommendation you can inspect before acting.
                    </p>
                    <button
                      className="primary"
                      onClick={runAction}
                      disabled={busy || shift.status === "assigned"}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      Generate recommendation
                      <ArrowRight size={16} />
                    </button>
                    <small>
                      {mode === "rules"
                        ? "Deterministic planner · No LLM calls"
                        : "OpenAI structured output · Independently validated"}
                    </small>
                  </div>
                ) : (
                  <div className="run-content">
                    {tab === "recommendation" ? (
                      <>
                        <div className="run-meta">
                          <span
                            className={`badge ${run.status === "escalated" ? "amber" : "green"}`}
                          >
                            {run.status === "review"
                              ? "Ready for your review"
                              : run.status === "escalated"
                                ? "Needs coordinator intervention"
                                : run.status === "approved"
                                  ? "Assignment approved"
                                  : "Proposal rejected"}
                          </span>
                          <span>
                            {run.mode === "rules" ? "Rules planner" : "OpenAI"}{" "}
                            · {run.elapsedMs} ms
                          </span>
                        </div>
                        {run.version !== state.version &&
                          run.status === "review" && (
                            <div className="stale">
                              The schedule has changed. Generate a fresh
                              proposal before approving.
                            </div>
                          )}
                        {chosen ? (
                          <div className="candidate-hero">
                            <div className="avatar large">
                              {chosen.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <span className="eyebrow">
                                RECOMMENDED WORKER
                              </span>
                              <h3>{chosen.name}</h3>
                              <p>All four eligibility checks passed</p>
                            </div>
                            <div className="rate">
                              ${chosen.hourlyRate}
                              <small>/ hour</small>
                            </div>
                          </div>
                        ) : (
                          <h3 className="escalation-title">
                            No eligible match. Nothing assigned.
                          </h3>
                        )}
                        <div className="reason">
                          <strong>Why this recommendation</strong>
                          <p>{run.rationale}</p>
                        </div>
                        {chosen && (
                          <div className="checks">
                            {[
                              "Qualifications verified",
                              "Full shift available",
                              "No conflicting booking",
                              "Within budget",
                            ].map((c) => (
                              <span key={c}>
                                <Check size={14} />
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                        {run.draft && (
                          <div className="draft">
                            <div>
                              <strong>Outreach draft</strong>
                              <span>Not sent</span>
                            </div>
                            <p>{run.draft}</p>
                            <small>
                              Review dates and obtain worker confirmation before
                              any real assignment.
                            </small>
                          </div>
                        )}
                        {run.status === "review" && (
                          <div className="approval">
                            <ShieldCheck size={18} />
                            <p>
                              Approval reserves this worker in the demo
                              schedule. It does not send a message.
                            </p>
                          </div>
                        )}
                        <div className="actions">
                          {run.status === "review" && (
                            <>
                              <button
                                className="primary"
                                disabled={busy || run.version !== state.version}
                                onClick={() =>
                                  act(
                                    () => api.decide(run.id, "approve"),
                                    "Assignment approved and audit event recorded. No message was sent.",
                                  )
                                }
                              >
                                <Check size={16} />
                                Approve assignment
                              </button>
                              <button
                                className="secondary"
                                disabled={busy}
                                onClick={() =>
                                  act(
                                    () => api.decide(run.id, "reject"),
                                    "Proposal rejected. No assignment was made.",
                                  )
                                }
                              >
                                <X size={15} />
                                Reject
                              </button>
                            </>
                          )}
                          {shift.status === "open" && (
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={runAction}
                            >
                              {busy ? (
                                <LoaderCircle className="spin" size={14} />
                              ) : (
                                <RotateCcw size={14} />
                              )}
                              Run again
                            </button>
                          )}
                        </div>
                      </>
                    ) : tab === "candidates" ? (
                      <>
                        <p className="tab-intro">
                          Hard constraints come first. An ineligible worker
                          cannot be assigned, even if the AI suggests them.
                        </p>
                        {run.candidates.map((c) => (
                          <div className="candidate-row" key={c.workerId}>
                            <div className="candidate-line">
                              <strong>{c.name}</strong>
                              <span>${c.hourlyRate}/hr</span>
                              <span
                                className={`badge ${c.eligible ? "green" : "neutral"}`}
                              >
                                {c.eligible ? "Eligible" : "Excluded"}
                              </span>
                            </div>
                            <p>
                              {c.eligible
                                ? "All requirements met."
                                : c.reasons.join(" · ")}
                            </p>
                            <details>
                              <summary>View evidence references</summary>
                              {c.evidence.map((e) => (
                                <code key={e}>{e}</code>
                              ))}
                            </details>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <p className="tab-intro">
                          Recorded tool steps and evidence references—not hidden
                          model reasoning.
                        </p>
                        <div className="timeline">
                          {run.steps.map((s, i) => (
                            <div className="trace-step" key={s.tool}>
                              <span className="step-number">{i + 1}</span>
                              <div>
                                <code>{s.tool}</code>
                                <p>{s.outcome}</p>
                                <details>
                                  <summary>
                                    {s.evidence.length} evidence references
                                  </summary>
                                  {s.evidence.map((e, j) => (
                                    <code className="evidence" key={j}>
                                      {e}
                                    </code>
                                  ))}
                                </details>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="trace-footer">
                          Schedule version {run.version} · Run{" "}
                          {run.id.slice(0, 8)}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
            </div>
          ) : view === "workers" ? (
            <section className="panel">
              <div className="section-title">
                <h2>Worker directory</h2>
                <span>{state.workers.length} synthetic workers</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Qualifications</th>
                      <th>Rate</th>
                      <th>Bookings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.workers.map((w) => (
                      <tr key={w.id}>
                        <td>
                          <strong>{w.name}</strong>
                          <small>{w.id}</small>
                        </td>
                        <td>{w.skills.join(" · ")}</td>
                        <td>${w.hourlyRate}/hr</td>
                        <td>
                          {w.booked.length
                            ? w.booked.map((b, i) => (
                                <small key={i}>
                                  {hours(b.start, b.end)} ET
                                </small>
                              ))
                            : "No bookings"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="panel">
              <div className="section-title">
                <h2>Activity log</h2>
                <span>{state.events.length} events</span>
              </div>
              {!state.events.length ? (
                <div className="empty-state">
                  <FileCheck2 size={30} />
                  <h3>Your decision trail starts here.</h3>
                  <p>
                    Generate a proposal from the coverage desk to record the
                    first event.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => setView("workspace")}
                  >
                    Open coverage desk
                  </button>
                </div>
              ) : (
                state.events.map((e) => (
                  <div className="audit-row" key={e.id}>
                    <CircleCheck size={18} />
                    <div>
                      <strong>{e.type.replaceAll("_", " ")}</strong>
                      <p>{e.detail}</p>
                      <small>
                        {new Date(e.at).toLocaleString()} ·{" "}
                        {e.runId?.slice(0, 8)}
                      </small>
                    </div>
                  </div>
                ))
              )}
            </section>
          )}
          <footer>
            ShiftPilot <span>Built for decisions you can explain.</span>
            <a
              href="https://github.com/sunad30/shiftpilot#architecture"
              target="_blank"
              rel="noreferrer"
            >
              Architecture & trade-offs <ArrowUpRight size={13} />
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
