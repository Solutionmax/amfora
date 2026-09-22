import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";

// The service reads its directory from env at import time, so point it at a scratch dir first.
let dir: string;
let UpdateService: typeof import("./service").UpdateService;

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "amfora-ota-"));
  process.env.AMFORA_OTA_DIR = dir;
  process.env.AMFORA_UPDATE_CHECK = "false";
  ({ UpdateService } = await import("./service"));
});

after(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  for (const name of await fs.readdir(dir)) await fs.rm(path.join(dir, name));
});

const run = (at: string) => [
  `=== update started ${at} ===`,
  "verified release 2.1.0 -> ghcr.io/solutionmax/amfora@sha256:" + "a".repeat(64),
];

test("progress reads the recorded request and the log tail from the shared directory", async () => {
  const requestedAt = new Date(Date.now() - 2000);
  await fs.writeFile(
    path.join(dir, "update.request.json"),
    JSON.stringify({ version: "2.1.0", requestedAt: requestedAt.toISOString() })
  );
  await fs.writeFile(path.join(dir, "update.trigger"), JSON.stringify({ version: "2.1.0" }));
  // Pad well past the tail size so only the end of the file is read.
  const padding = "x".repeat(200) + "\n";
  await fs.writeFile(
    path.join(dir, "update.log"),
    padding.repeat(500) + run(new Date(requestedAt.getTime() + 1000).toISOString()).join("\n") + "\n"
  );

  const progress = await new UpdateService("2.0.1").getProgress();
  assert.equal(progress.stage, "backup");
  assert.equal(progress.targetVersion, "2.1.0");
});

test("without a recorded request a trigger alone is the handover", async () => {
  await fs.writeFile(path.join(dir, "update.trigger"), JSON.stringify({ version: "2.1.0" }));

  const progress = await new UpdateService("2.0.1").getProgress();
  assert.equal(progress.stage, "handover");
  assert.equal(progress.targetVersion, "2.1.0");
});

test("nothing in the directory is idle", async () => {
  const progress = await new UpdateService("2.0.1").getProgress();
  assert.equal(progress.stage, "idle");
});
