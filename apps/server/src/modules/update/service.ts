import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../env";
import { ReleaseManifest, verifyManifest } from "./manifest";
import { deriveProgress, trimPartialFirstLine, UpdateProgress, UpdateRequest } from "./progress";
import { isNewer } from "./version";

/** How long a successful check is reused before the app asks again. */
const CACHE_MS = 6 * 60 * 60 * 1000;

/** A stuck update host must not hold a settings page open. */
const FETCH_TIMEOUT_MS = 8000;

/** Only the end of update.log matters: one run is a few kilobytes, the file only grows. */
const LOG_TAIL_BYTES = 64 * 1024;

/**
 * Written next to the trigger when an update is requested. apply.sh never reads it, and
 * unlike the trigger it survives the run, so the new version can still tell which run in
 * update.log belongs to the request.
 */
const REQUEST_FILE = "update.request.json";

/**
 * A trigger newer than the recorded request by more than this was written by something
 * else (an older version of the app, or by hand), so it is the better source.
 */
const TRIGGER_NEWER_MS = 5000;

export interface UpdateStatus {
  /** Null when the running version could not be read, which also disables the comparison. */
  currentVersion: string | null;
  latestVersion: string | null;
  notes: string;
  releasedAt: string;
  updateAvailable: boolean;
  checkedAt: string | null;
  checkError: string | null;
  /** True once the host side is installed, which is what makes applying possible. */
  canApply: boolean;
  /** True between requesting an update and the host finishing it. */
  applying: boolean;
  checkEnabled: boolean;
}

interface CachedCheck {
  manifest: ReleaseManifest | null;
  checkedAt: number;
  error: string | null;
}

export class UpdateService {
  private cache: CachedCheck | null = null;
  private inFlight: Promise<CachedCheck> | null = null;

  constructor(private readonly currentVersion: string | null) {}

  private otaPath(name: string): string {
    return path.join(env.AMFORA_OTA_DIR, name);
  }

  private async exists(file: string): Promise<boolean> {
    try {
      await fs.access(file);
      return true;
    } catch {
      return false;
    }
  }

  private get checkEnabled(): boolean {
    return env.AMFORA_UPDATE_CHECK === "true" && !!env.AMFORA_UPDATE_URL;
  }

  private async fetchManifest(): Promise<CachedCheck> {
    const checkedAt = Date.now();

    try {
      const response = await fetch(env.AMFORA_UPDATE_URL, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { accept: "text/plain" },
      });

      if (!response.ok) {
        return { manifest: null, checkedAt, error: `update host answered ${response.status}` };
      }

      const token = await response.text();
      const manifest = verifyManifest(token, env.AMFORA_RELEASE_PUBLIC_KEY);

      if (!manifest) {
        return { manifest: null, checkedAt, error: "the release manifest failed signature verification" };
      }

      return { manifest, checkedAt, error: null };
    } catch (error: any) {
      return { manifest: null, checkedAt, error: error?.message || "could not reach the update host" };
    }
  }

  /** Runs at most one check at a time; callers share the result. */
  private async refresh(): Promise<CachedCheck> {
    if (!this.inFlight) {
      this.inFlight = this.fetchManifest().then((result) => {
        this.cache = result;
        this.inFlight = null;
        return result;
      });
    }

    return this.inFlight;
  }

  async getStatus({ force = false }: { force?: boolean } = {}): Promise<UpdateStatus> {
    let check = this.cache;

    if (this.checkEnabled && (force || !check || Date.now() - check.checkedAt > CACHE_MS)) {
      check = await this.refresh();
    }

    const manifest = this.checkEnabled ? (check?.manifest ?? null) : null;

    return {
      currentVersion: this.currentVersion,
      latestVersion: manifest?.version ?? null,
      notes: manifest?.notes ?? "",
      releasedAt: manifest?.released_at ?? "",
      updateAvailable: !!manifest && !!this.currentVersion && isNewer(manifest.version, this.currentVersion),
      checkedAt: check ? new Date(check.checkedAt).toISOString() : null,
      checkError: this.checkEnabled ? (check?.error ?? null) : null,
      canApply: await this.exists(this.otaPath("ota-installed")),
      applying: await this.exists(this.otaPath("update.trigger")),
      checkEnabled: this.checkEnabled,
    };
  }

  private async readLogTail(): Promise<string | null> {
    let handle: fs.FileHandle | null = null;

    try {
      handle = await fs.open(this.otaPath("update.log"), "r");
      const { size } = await handle.stat();
      const length = Math.min(size, LOG_TAIL_BYTES);
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, size - length);
      return trimPartialFirstLine(buffer.toString("utf8"), size > length);
    } catch {
      return null;
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  private async readRecordedRequest(): Promise<UpdateRequest | null> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.otaPath(REQUEST_FILE), "utf8"));
      const requestedAt = Date.parse(parsed?.requestedAt);
      if (Number.isNaN(requestedAt)) return null;
      return {
        requestedAt,
        targetVersion: typeof parsed?.version === "string" ? parsed.version : null,
      };
    } catch {
      return null;
    }
  }

  /** The trigger itself, as a request: its time is when it was written. */
  private async readTrigger(): Promise<UpdateRequest | null> {
    const file = this.otaPath("update.trigger");

    try {
      const { mtimeMs } = await fs.stat(file);
      let targetVersion: string | null = null;
      try {
        const parsed = JSON.parse(await fs.readFile(file, "utf8"));
        if (typeof parsed?.version === "string") targetVersion = parsed.version;
      } catch {
        // An unreadable trigger still means an update was asked for.
      }
      return { requestedAt: mtimeMs, targetVersion };
    } catch {
      return null;
    }
  }

  /** Where the most recent update request stands, read from the files the host shares. */
  async getProgress(): Promise<UpdateProgress> {
    const [recorded, trigger, log] = await Promise.all([
      this.readRecordedRequest(),
      this.readTrigger(),
      this.readLogTail(),
    ]);

    const request =
      trigger && (!recorded || trigger.requestedAt > recorded.requestedAt + TRIGGER_NEWER_MS) ? trigger : recorded;

    return deriveProgress({
      log,
      request,
      triggerPresent: !!trigger,
      currentVersion: this.currentVersion,
      now: Date.now(),
    });
  }

  /**
   * Asks the host to apply the update by dropping a trigger file in the shared directory.
   *
   * The container never runs the update itself: doing so would need the Docker socket,
   * which is root on the host. The trigger carries the verified version and digest, so
   * the host pulls exactly what was signed rather than whatever is newest at that moment.
   */
  async requestApply(): Promise<{ requested: boolean; reason?: string }> {
    const status = await this.getStatus();

    if (!status.canApply) return { requested: false, reason: "over the air updating is not installed on the host" };
    if (!status.updateAvailable) return { requested: false, reason: "already up to date" };
    if (status.applying) return { requested: false, reason: "an update is already running" };

    const manifest = this.cache?.manifest;
    if (!manifest) return { requested: false, reason: "no verified release to apply" };

    // Recorded first: the trigger starts the host at once, and the progress of that run
    // is matched against this time.
    await fs.writeFile(
      this.otaPath(REQUEST_FILE),
      `${JSON.stringify({ version: manifest.version, requestedAt: new Date().toISOString() })}\n`,
      { mode: 0o600 }
    );

    await fs.writeFile(
      this.otaPath("update.trigger"),
      `${JSON.stringify({ version: manifest.version, image: manifest.image, digest: manifest.digest })}\n`,
      { mode: 0o600 }
    );

    return { requested: true };
  }
}
