import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../env";
import { ReleaseManifest, verifyManifest } from "./manifest";
import { isNewer } from "./version";

/** How long a successful check is reused before the app asks again. */
const CACHE_MS = 6 * 60 * 60 * 1000;

/** A stuck update host must not hold a settings page open. */
const FETCH_TIMEOUT_MS = 8000;

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

    await fs.writeFile(
      this.otaPath("update.trigger"),
      `${JSON.stringify({ version: manifest.version, image: manifest.image, digest: manifest.digest })}\n`,
      { mode: 0o600 }
    );

    return { requested: true };
  }
}
