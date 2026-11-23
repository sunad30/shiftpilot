export type Interval = { start: string; end: string };
export type Worker = {
  id: string;
  name: string;
  skills: string[];
  availability: Interval[];
  booked: Interval[];
  hourlyRate: number;
};
export type Shift = Interval & {
  id: string;
  site: string;
  role: string;
  skills: string[];
  maxRate: number;
  priority: "urgent" | "normal";
  note: string;
  status: "open" | "assigned";
  workerId?: string;
};
export type Candidate = {
  workerId: string;
  name: string;
  eligible: boolean;
  reasons: string[];
  score: number;
  hourlyRate: number;
  evidence: string[];
};
export type Step = { tool: string; outcome: string; evidence: string[] };
export type Run = {
  id: string;
  shiftId: string;
  version: number;
  createdAt: string;
  mode: "rules" | "openai";
  status: "review" | "escalated" | "approved" | "rejected";
  workerId: string | null;
  rationale: string;
  draft: string;
  candidates: Candidate[];
  steps: Step[];
  elapsedMs: number;
};
export type Event = {
  id: string;
  at: string;
  type: string;
  detail: string;
  runId?: string;
};
export type State = {
  version: number;
  shifts: Shift[];
  workers: Worker[];
  runs: Run[];
  events: Event[];
};
export type Decision = {
  workerId: string | null;
  rationale: string;
  draft: string;
};
export type Planner = (
  shift: Shift,
  candidates: Candidate[],
) => Promise<Decision>;
