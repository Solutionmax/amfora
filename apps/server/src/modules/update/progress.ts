/**
 * Works out how far an over the air update has come, from what the host leaves behind.
 *
 * The host script (ota/apply.sh) only appends to update.log, and the copy installed on
 * existing hosts is never replaced by a release. So nothing here asks the host for more
 * than it already writes: every stage is read from lines apply.sh has always printed.
 */

/** The step that is in progress, or how it ended. */
export type UpdateStage =
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
  stage: UpdateStage;
  targetVersion: string | null;
  currentVersion: string | null;
  /** When the host started the run that belongs to this request (ISO), null before that. */
  startedAt: string | null;
  finished: boolean;
  /** True on success, false on failure, null while it runs. */
  ok: boolean | null;
  error: string | null;
}

/** What the app knows about the request it made. */
export interface UpdateRequest {
  requestedAt: number;
  targetVersion: string | null;
}

export interface ProgressInput {
  /** The tail of update.log, or null when there is none or it cannot be read. */
  log: string | null;
  request: UpdateRequest | null;
  /** Whether update.trigger is still there, which apply.sh removes when it finishes. */
  triggerPresent: boolean;
  currentVersion: string | null;
  now: number;
}

/**
 * How long a finished run may report the new version while this server still answers with
 * the old one. Docker compose has already started the new container by then, so anything
 * beyond a short gap means the new version did not come up.
 */
export const RESTART_GRACE_MS = 3 * 60 * 1000;

const STARTED = /^=== update started (\S+) ===$/;
const FINISHED = /^=== update finished (\S+) ===$/;
const REFUSED = /^REFUSED: (.*)$/;
const VERIFIED = /^verified release (\S+) -> /;
const BACKED_UP = /^backed up to /;
const PULLING =
  /(: Pulling from |Pulling fs layer|Already exists|Download complete|Pull complete|^Digest: sha256:|^Status: )/;
const RECREATING = /^\s*Container \S+\s+(Recreate|Recreated|Starting|Started|Created|Creating|Running)/;
const NOW_RUNNING = /^now running (\S+)/;

interface Block {
  startedAt: number;
  startedIso: string;
  lines: string[];
}

/** Splits the log into runs, oldest first. Lines before the first marker belong to none. */
function splitBlocks(log: string): Block[] {
  const blocks: Block[] = [];

  for (const raw of log.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const start = STARTED.exec(line);

    if (start) {
      const startedAt = Date.parse(start[1]);
      if (!Number.isNaN(startedAt)) {
        blocks.push({ startedAt, startedIso: new Date(startedAt).toISOString(), lines: [] });
        continue;
      }
    }

    blocks.at(-1)?.lines.push(line);
  }

  return blocks;
}

/**
 * The newest run that began after the request. apply.sh stamps whole seconds, so the
 * request is rounded down to its second: a run started in the same second still counts.
 */
function blockForRequest(blocks: Block[], requestedAt: number): Block | null {
  const since = Math.floor(requestedAt / 1000) * 1000;

  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].startedAt >= since) return blocks[i];
  }

  return null;
}

/** The last line that says something, for a run that stopped without a REFUSED line. */
function lastMeaningfulLine(lines: string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line && !FINISHED.test(line) && !PULLING.test(line) && !/^pruned /.test(line)) return line;
  }

  return null;
}

function result(
  input: ProgressInput,
  targetVersion: string | null,
  stage: UpdateStage,
  extra: Partial<UpdateProgress> = {}
): UpdateProgress {
  const finished = stage === "done" || stage === "failed";

  return {
    stage,
    targetVersion,
    currentVersion: input.currentVersion,
    startedAt: null,
    finished,
    ok: stage === "done" ? true : stage === "failed" ? false : null,
    error: null,
    ...extra,
  };
}

function stageOfBlock(input: ProgressInput, block: Block, requestTarget: string | null): UpdateProgress {
  let verified: string | null = null;
  let backedUp = false;
  let pulling = false;
  let recreating = false;
  let running: string | null = null;
  let finishedAt: number | null = null;

  for (const line of block.lines) {
    const refused = REFUSED.exec(line);
    if (refused) {
      return result(input, requestTarget ?? verified, "failed", {
        startedAt: block.startedIso,
        error: refused[1].trim() || "the host refused the update",
      });
    }

    const version = VERIFIED.exec(line);
    if (version) verified = version[1];
    if (BACKED_UP.test(line)) backedUp = true;
    if (PULLING.test(line)) pulling = true;
    if (RECREATING.test(line)) recreating = true;

    const now = NOW_RUNNING.exec(line);
    if (now) running = now[1];

    const finished = FINISHED.exec(line);
    if (finished) finishedAt = Date.parse(finished[1]);
  }

  const target = requestTarget ?? running ?? verified;
  const at = { startedAt: block.startedIso };

  if (running) {
    if (finishedAt === null) return result(input, target, "health", at);
    if (input.currentVersion && input.currentVersion === target) return result(input, target, "done", at);

    // The host says it is done but this server still reports the old version.
    if (Number.isNaN(finishedAt) || input.now - finishedAt < RESTART_GRACE_MS) {
      return result(input, target, "health", at);
    }

    return result(input, target, "failed", {
      ...at,
      error: `the host installed ${running}, but Amfora still reports ${input.currentVersion ?? "an unknown version"}`,
    });
  }

  if (finishedAt !== null) {
    // set -e ended the script on a command that has no REFUSED message of its own.
    return result(input, target, "failed", {
      ...at,
      error: lastMeaningfulLine(block.lines) ?? "the update stopped before it finished",
    });
  }

  if (recreating) return result(input, target, "restarting", at);
  if (backedUp || pulling) return result(input, target, "pulling", at);
  if (verified) return result(input, target, "backup", at);
  return result(input, target, "verifying", at);
}

export function deriveProgress(input: ProgressInput): UpdateProgress {
  const { request } = input;

  if (!request) {
    return result(input, null, input.triggerPresent ? "handover" : "idle");
  }

  const block = input.log ? blockForRequest(splitBlocks(input.log), request.requestedAt) : null;

  if (block) return stageOfBlock(input, block, request.targetVersion);

  if (input.triggerPresent) return result(input, request.targetVersion, "handover");

  // No run in the log and no trigger left. Either the log could not be read and the
  // update did land, or the request was withdrawn before the host ever picked it up.
  if (request.targetVersion && input.currentVersion === request.targetVersion) {
    return result(input, request.targetVersion, "done");
  }

  return result(input, request.targetVersion, "failed", {
    error: "the host did not start the update",
  });
}

/** Drops the first line of a tail that begins mid file, since it is probably cut off. */
export function trimPartialFirstLine(tail: string, startedMidFile: boolean): string {
  if (!startedMidFile) return tail;
  const newline = tail.indexOf("\n");
  return newline === -1 ? "" : tail.slice(newline + 1);
}
