import { DEFAULT_BRAND } from "@/lib/brand";

/**
 * What changed in the release this build belongs to, shown under Settings. Replaced at every
 * release, together with docs/RELEASE-<version>.md. The texts live in the message files under
 * `releaseNotes.items.<key>`, so they follow the language; `order` is the order they are shown in,
 * the most important first. The notes of a waiting update come from the signed manifest instead
 * (infra/release-manifest.sh) and stay English.
 */
export const RELEASE_NOTES = {
  version: "2.4.0",
  order: [
    "security",
    "trash",
    "twoFactor",
    "groups",
    "notifications",
    "virusScan",
    "monitoring",
    "settingsNotes",
    "storage",
    "emails",
    "activity",
    "customization",
    "externalSignIn",
    "repairs",
  ],
} as const;

/** The release a version belongs to: a beta of 2.4.0 belongs to 2.4.0. */
function releaseOf(version: string | null | undefined): string | null {
  return /^\d+\.\d+\.\d+/.exec(version ?? "")?.[0] ?? null;
}

/** The keys of the shipped notes, when they describe the version that is running. */
export function bundledNotesFor(runningVersion: string | null | undefined): readonly string[] | null {
  return releaseOf(runningVersion) === RELEASE_NOTES.version ? RELEASE_NOTES.order : null;
}

/** The notes of a signed release as lines: one change per line, list markers dropped. */
export function noteLines(notes: string): string[] {
  return notes
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s+/, "").trim())
    .filter(Boolean);
}

/** Where the full notes of a release are; without a version, the page with all of them. */
export function releaseNotesUrl(version: string | null | undefined): string {
  const release = releaseOf(version);

  return `${DEFAULT_BRAND.url}releases/${release ? `#v${release.replaceAll(".", "-")}` : ""}`;
}
