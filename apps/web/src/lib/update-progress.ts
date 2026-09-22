/**
 * What the update dialog shows, worked out from one poll of /api/update/progress.
 *
 * The app cannot watch its own replacement: the host recreates this container. So a poll
 * that fails, or answers with something that is not the progress JSON, means Amfora is
 * restarting, and the list moves on to that step until the new version answers.
 */

export const UPDATE_STEPS = [
  "requested",
  "handover",
  "verifying",
  "backup",
  "pulling",
  "restarting",
  "health",
] as const;

export type UpdateStep = (typeof UPDATE_STEPS)[number];

export type ServerStage =
  | "idle"
  | "handover"
  | "verifying"
  | "backup"
  | "pulling"
  | "restarting"
  | "health"
  | "done"
  | "failed";

export interface UpdateProgress {
  stage: ServerStage;
  targetVersion: string | null;
  currentVersion: string | null;
  startedAt: string | null;
  finished: boolean;
  ok: boolean | null;
  error: string | null;
}

export type Poll = { kind: "progress"; progress: UpdateProgress } | { kind: "unreachable" } | { kind: "unauthorized" };

export type Outcome = "running" | "done" | "failed" | "signin" | "timeout";

export interface UpdateView {
  step: UpdateStep;
  outcome: Outcome;
  /** The host's own words when it failed. */
  error: string | null;
  /** Set once the app stopped answering, so a later 401 is read as the restart ending. */
  sawRestart: boolean;
  targetVersion: string | null;
}

export const POLL_MS = 1500;
export const GIVE_UP_MS = 15 * 60 * 1000;

const STAGES = new Set<string>(["idle", ...UPDATE_STEPS, "done", "failed"]);

export function initialView(targetVersion: string | null): UpdateView {
  return { step: "handover", outcome: "running", error: null, sawRestart: false, targetVersion };
}

/** Anything that is not the progress JSON counts as the app being away. */
export function classifyResponse(status: number | null, body: unknown): Poll {
  if (status === 401) return { kind: "unauthorized" };
  if (status === null || status < 200 || status >= 300) return { kind: "unreachable" };
  if (!body || typeof body !== "object") return { kind: "unreachable" };

  const stage = (body as { stage?: unknown }).stage;
  if (typeof stage !== "string" || !STAGES.has(stage)) return { kind: "unreachable" };

  return { kind: "progress", progress: body as UpdateProgress };
}

export function nextView(view: UpdateView, poll: Poll, elapsedMs: number): UpdateView {
  if (view.outcome !== "running") return view;

  if (poll.kind === "unauthorized") return { ...view, outcome: "signin" };

  if (poll.kind === "unreachable") {
    const next = { ...view, step: "restarting" as const, sawRestart: true };
    return elapsedMs > GIVE_UP_MS ? { ...next, outcome: "timeout" } : next;
  }

  const { progress } = poll;
  const targetVersion = view.targetVersion ?? progress.targetVersion;

  if (progress.stage === "done") return { ...view, targetVersion, outcome: "done", step: "health" };
  if (progress.stage === "failed") {
    return { ...view, targetVersion, outcome: "failed", error: progress.error };
  }

  // Idle right after asking means the request is not visible yet; wait at the handover.
  const step: UpdateStep = progress.stage === "idle" ? "handover" : progress.stage;
  const next = { ...view, targetVersion, step };

  return elapsedMs > GIVE_UP_MS ? { ...next, outcome: "timeout" } : next;
}

export function stepIndex(step: UpdateStep): number {
  return UPDATE_STEPS.indexOf(step);
}

export type StepState = "pending" | "now" | "done" | "bad";

/** How one row in the list looks for the current view. */
export function stepState(step: UpdateStep, view: UpdateView): StepState {
  if (view.outcome === "done" || (view.outcome === "signin" && view.sawRestart)) return "done";

  const at = stepIndex(view.step);
  const index = stepIndex(step);

  if (index < at) return "done";
  if (index > at) return "pending";
  if (view.outcome === "failed" || view.outcome === "timeout") return "bad";
  // Signed out before the restart: the dialog ends without knowing how far it got.
  return view.outcome === "signin" ? "pending" : "now";
}

export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
