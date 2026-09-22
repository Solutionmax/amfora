import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyResponse,
  formatElapsed,
  GIVE_UP_MS,
  initialView,
  nextView,
  stepState,
  type UpdateProgress,
} from "./update-progress";

const progress = (overrides: Partial<UpdateProgress>): UpdateProgress => ({
  stage: "handover",
  targetVersion: "2.1.0",
  currentVersion: "2.0.1",
  startedAt: null,
  finished: false,
  ok: null,
  error: null,
  ...overrides,
});

const poll = (overrides: Partial<UpdateProgress>) => classifyResponse(200, progress(overrides));

test("a failed request, an error status or a non JSON answer means the app is restarting", () => {
  assert.deepEqual(classifyResponse(null, null), { kind: "unreachable" });
  assert.deepEqual(classifyResponse(502, { error: "bad gateway" }), { kind: "unreachable" });
  assert.deepEqual(classifyResponse(200, "<html>starting</html>"), { kind: "unreachable" });
  assert.deepEqual(classifyResponse(200, { stage: "nonsense" }), { kind: "unreachable" });
  assert.deepEqual(classifyResponse(401, { error: "Unauthorized" }), { kind: "unauthorized" });
  assert.equal(poll({ stage: "pulling" }).kind, "progress");
});

test("the list follows the server's stage and the restart in between", () => {
  let view = initialView("2.1.0");
  view = nextView(view, poll({ stage: "verifying" }), 1000);
  assert.equal(view.step, "verifying");
  view = nextView(view, poll({ stage: "pulling" }), 2000);
  assert.equal(view.step, "pulling");
  assert.equal(stepState("backup", view), "done");
  assert.equal(stepState("pulling", view), "now");
  assert.equal(stepState("restarting", view), "pending");

  view = nextView(view, { kind: "unreachable" }, 3000);
  assert.equal(view.step, "restarting");
  assert.equal(view.sawRestart, true);

  view = nextView(view, poll({ stage: "done", currentVersion: "2.1.0", finished: true, ok: true }), 4000);
  assert.equal(view.outcome, "done");
  assert.equal(stepState("health", view), "done");
});

test("idle right after asking waits at the handover", () => {
  assert.equal(nextView(initialView("2.1.0"), poll({ stage: "idle" }), 0).step, "handover");
});

test("a failure marks the step it happened on and keeps the host's reason", () => {
  let view = nextView(initialView("2.1.0"), poll({ stage: "verifying" }), 0);
  view = nextView(view, poll({ stage: "failed", error: "the release signature is not valid" }), 1000);
  assert.equal(view.outcome, "failed");
  assert.equal(view.error, "the release signature is not valid");
  assert.equal(stepState("handover", view), "done");
  assert.equal(stepState("verifying", view), "bad");
  assert.equal(stepState("backup", view), "pending");
});

test("a 401 after the restart ends the dialog, and nothing moves after an ending", () => {
  let view = nextView(initialView("2.1.0"), { kind: "unreachable" }, 0);
  view = nextView(view, { kind: "unauthorized" }, 1000);
  assert.equal(view.outcome, "signin");
  assert.equal(view.sawRestart, true);
  assert.deepEqual(nextView(view, poll({ stage: "pulling" }), 2000), view);
});

test("after fifteen minutes it gives up", () => {
  const view = nextView(initialView("2.1.0"), { kind: "unreachable" }, GIVE_UP_MS + 1);
  assert.equal(view.outcome, "timeout");
  assert.equal(stepState("restarting", view), "bad");
});

test("the target comes from the server when the dialog did not know it", () => {
  assert.equal(nextView(initialView(null), poll({ stage: "backup" }), 0).targetVersion, "2.1.0");
});

test("elapsed time reads as m:ss", () => {
  assert.equal(formatElapsed(0), "0:00");
  assert.equal(formatElapsed(65_400), "1:05");
  assert.equal(formatElapsed(-5), "0:00");
});
