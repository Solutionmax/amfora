import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveProgress, ProgressInput, RESTART_GRACE_MS, trimPartialFirstLine } from "./progress";

// Lines as apply.sh writes them, copied from a real host's update.log.
const DIGEST = "sha256:aecb6e66bc68aced4d4f356fd378a810176e05d1278455c03c10564c21a12563";
const IMAGE = "ghcr.io/solutionmax/amfora";

const OLD_RUN = [
  "=== update started 2026-09-22T20:46:56+00:00 ===",
  "verified release 2.0.1 -> ghcr.io/solutionmax/amfora@sha256:79b50e1edcfa1dd6ff37ce517441d76524678dd616ce8b515fb1c0b7d90b509a",
  "backed up to /opt/amfora/ota-backups/amfora-20260922-204656-before-2.0.1.tgz (20K)",
  " Container amfora-test  Recreate",
  " Container amfora-test  Started",
  "now running 2.0.1",
  "=== update finished 2026-09-22T20:47:43+00:00 ===",
];

const START = "=== update started 2026-09-22T21:52:58+00:00 ===";
const VERIFIED = `verified release 2.1.0 -> ${IMAGE}@${DIGEST}`;
const BACKED_UP = "backed up to /opt/amfora/ota-backups/amfora-20260922-215259-before-2.1.0.tgz (20K)";
const PRUNED = "pruned /opt/amfora/ota-backups/amfora-20260921-175940-before-1.2.0.tgz";
const PULL = [
  `${IMAGE}@${DIGEST}: Pulling from solutionmax/amfora`,
  "44136fa355b3: Already exists",
  "954596fdc30b: Pulling fs layer",
  "954596fdc30b: Download complete",
  "954596fdc30b: Pull complete",
  `Digest: ${DIGEST}`,
  `Status: Downloaded newer image for ${IMAGE}@${DIGEST}`,
  `${IMAGE}@${DIGEST}`,
];
const RECREATE = [
  " Container amfora-test  Recreate",
  " Container amfora-test  Recreated",
  " Container amfora-test  Starting",
  " Container amfora-test  Started",
];
const NOW_RUNNING = "now running 2.1.0";
const FINISHED = "=== update finished 2026-09-22T21:53:59+00:00 ===";

const REQUESTED_AT = Date.parse("2026-09-22T21:52:58.640Z");
const FINISHED_AT = Date.parse("2026-09-22T21:53:59Z");

function input(lines: string[] | null, overrides: Partial<ProgressInput> = {}): ProgressInput {
  return {
    log: lines ? [...OLD_RUN, ...lines].join("\n") + "\n" : null,
    request: { requestedAt: REQUESTED_AT, targetVersion: "2.1.0" },
    triggerPresent: true,
    currentVersion: "2.0.1",
    now: REQUESTED_AT + 10_000,
    ...overrides,
  };
}

test("no request and no trigger is idle", () => {
  const progress = deriveProgress(input([], { request: null, triggerPresent: false }));
  assert.equal(progress.stage, "idle");
  assert.equal(progress.finished, false);
  assert.equal(progress.ok, null);
});

test("a request the host has not picked up yet is the handover", () => {
  const progress = deriveProgress(input([]));
  assert.equal(progress.stage, "handover");
  assert.equal(progress.targetVersion, "2.1.0");
  assert.equal(progress.startedAt, null);
});

test("a stale run from before the request is ignored", () => {
  // The old run finished with "now running"; it must not count as this update being done.
  const progress = deriveProgress(input([], { currentVersion: "2.0.1" }));
  assert.equal(progress.stage, "handover");
  assert.equal(progress.finished, false);
});

test("each stage follows the lines apply.sh has written so far", () => {
  const cases: [string[], string][] = [
    [[START], "verifying"],
    [[START, VERIFIED], "backup"],
    [[START, VERIFIED, BACKED_UP, PRUNED], "pulling"],
    [[START, VERIFIED, BACKED_UP, ...PULL.slice(0, 3)], "pulling"],
    [[START, VERIFIED, BACKED_UP, ...PULL, RECREATE[0]], "restarting"],
    [[START, VERIFIED, BACKED_UP, ...PULL, ...RECREATE, NOW_RUNNING], "health"],
  ];

  for (const [lines, stage] of cases) {
    const progress = deriveProgress(input(lines));
    assert.equal(progress.stage, stage, lines.at(-1));
    assert.equal(progress.startedAt, "2026-09-22T21:52:58.000Z");
    assert.equal(progress.finished, false);
  }
});

test("a run started in the same second as the request belongs to it", () => {
  // apply.sh stamps whole seconds; the request carries milliseconds.
  const progress = deriveProgress(input([START, VERIFIED]));
  assert.equal(progress.stage, "backup");
});

test("a finished run and the new version answering is done", () => {
  const progress = deriveProgress(
    input([START, VERIFIED, BACKED_UP, PRUNED, ...PULL, ...RECREATE, NOW_RUNNING, FINISHED], {
      currentVersion: "2.1.0",
      triggerPresent: false,
    })
  );
  assert.deepEqual(progress, {
    stage: "done",
    targetVersion: "2.1.0",
    currentVersion: "2.1.0",
    startedAt: "2026-09-22T21:52:58.000Z",
    finished: true,
    ok: true,
    error: null,
  });
});

test("a finished run while the old version still answers waits, then fails", () => {
  const lines = [START, VERIFIED, BACKED_UP, ...PULL, ...RECREATE, NOW_RUNNING, FINISHED];

  const waiting = deriveProgress(input(lines, { triggerPresent: false, now: FINISHED_AT + 5_000 }));
  assert.equal(waiting.stage, "health");
  assert.equal(waiting.finished, false);

  const late = deriveProgress(input(lines, { triggerPresent: false, now: FINISHED_AT + RESTART_GRACE_MS + 1 }));
  assert.equal(late.stage, "failed");
  assert.equal(late.ok, false);
  assert.match(String(late.error), /2\.1\.0.*2\.0\.1/);
});

test("a refused release fails with the host's reason", () => {
  const progress = deriveProgress(
    input([START, "REFUSED: the release signature is not valid", FINISHED], { triggerPresent: false })
  );
  assert.equal(progress.stage, "failed");
  assert.equal(progress.finished, true);
  assert.equal(progress.ok, false);
  assert.equal(progress.error, "the release signature is not valid");
  assert.equal(progress.targetVersion, "2.1.0");
});

test("a failed pull fails with the pull error", () => {
  const progress = deriveProgress(
    input(
      [
        START,
        VERIFIED,
        BACKED_UP,
        `Error response from daemon: Head "https://ghcr.io/v2/solutionmax/amfora/manifests/${DIGEST}": denied`,
        `REFUSED: could not pull ${IMAGE}@${DIGEST}`,
        FINISHED,
      ],
      { triggerPresent: false }
    )
  );
  assert.equal(progress.stage, "failed");
  assert.equal(progress.error, `could not pull ${IMAGE}@${DIGEST}`);
});

test("a run that stopped without a REFUSED line fails with its last message", () => {
  const progress = deriveProgress(
    input([START, VERIFIED, BACKED_UP, ...PULL, "could not find an image line to pin", FINISHED], {
      triggerPresent: false,
    })
  );
  assert.equal(progress.stage, "failed");
  assert.equal(progress.error, "could not find an image line to pin");
});

test("a request whose trigger vanished without a run fails, unless the version already changed", () => {
  const gone = deriveProgress(input([], { triggerPresent: false }));
  assert.equal(gone.stage, "failed");
  assert.equal(gone.error, "the host did not start the update");

  // An unreadable log must not hide an update that did land.
  const landed = deriveProgress(input(null, { triggerPresent: false, currentVersion: "2.1.0" }));
  assert.equal(landed.stage, "done");
  assert.equal(landed.ok, true);
});

test("the target falls back to the verified release when the request did not name one", () => {
  const progress = deriveProgress(
    input([START, VERIFIED], { request: { requestedAt: REQUESTED_AT, targetVersion: null } })
  );
  assert.equal(progress.targetVersion, "2.1.0");
});

test("a tail that starts mid file loses its cut off first line", () => {
  assert.equal(trimPartialFirstLine("ete\nnow running 2.1.0\n", true), "now running 2.1.0\n");
  assert.equal(trimPartialFirstLine("now running 2.1.0\n", false), "now running 2.1.0\n");
  assert.equal(trimPartialFirstLine("no newline at all", true), "");
});
