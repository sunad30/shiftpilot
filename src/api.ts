import { addRun, decide, propose } from "../shared/engine";
import { seed } from "../shared/seed";
import type { State } from "../shared/types";
declare const __DEMO__: boolean;
export const browserDemo = __DEMO__;
const key = "shiftpilot-demo-v1";
type Snapshot = { state: State; mode: "rules" | "openai" };
let memory = seed();
function read(): State {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const s = JSON.parse(raw);
      if (
        s.shifts &&
        s.workers &&
        s.runs &&
        s.events &&
        Number.isInteger(s.version)
      )
        return s;
    }
  } catch {
    /* storage may be disabled */
  }
  return memory;
}
function save(state: State): Snapshot {
  memory = state;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* session-only fallback */
  }
  return { state, mode: "rules" };
}
async function request(path: string, body?: unknown): Promise<Snapshot> {
  const res = await fetch(`/api/${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
export const api = {
  load: async (): Promise<Snapshot> =>
    browserDemo ? { state: read(), mode: "rules" } : request("state"),
  run: async (shiftId: string): Promise<Snapshot> => {
    if (!browserDemo) return request("runs", { shiftId });
    const run = await propose(read(), shiftId);
    return save(addRun(read(), run));
  },
  decide: async (
    id: string,
    action: "approve" | "reject",
  ): Promise<Snapshot> =>
    browserDemo
      ? save(decide(read(), id, action))
      : request(`runs/${id}/decision`, { action }),
  reset: () => save(seed()),
};
