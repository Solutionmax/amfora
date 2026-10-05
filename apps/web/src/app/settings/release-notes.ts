import { DEFAULT_BRAND } from "@/lib/brand";

/**
 * What changed in the release this build belongs to, shown under Settings. Replaced at every
 * release, together with docs/RELEASE-<version>.md; the same lines go into the signed manifest
 * (infra/release-manifest.sh), which is what an installation that has not updated yet reads.
 * English only, like the release pages.
 */
export const RELEASE_NOTES: { version: string; items: readonly string[] } = {
  version: "2.4.0",
  items: [
    "Settings shows the release notes: what the version you run brought, and what a waiting update brings.",
    "Administrators get a notice at the bottom of the menu when an update is available.",
    "The storage meter in the menu is a ring, with what is in use and what is still free.",
    "The preview under Customization is the real download page in the theme you pick. Press it to see it large.",
    "A font chosen under Customization is applied again. The default font of older versions, which is no longer included, shows as Default.",
    "External sign-in starts with Authentik, GitHub and Google. Providers that were never set up leave the list; any other service is still added with Add provider.",
    "Download pages no longer play video and audio. The switch for it is gone from Settings and Customization.",
    "Opening a sign-in provider no longer downloads every icon set (13 MB). The icon picker loads when you press its field.",
  ],
};

/** The release a version belongs to: a beta of 2.4.0 belongs to 2.4.0. */
function releaseOf(version: string | null | undefined): string | null {
  return /^\d+\.\d+\.\d+/.exec(version ?? "")?.[0] ?? null;
}

/** The shipped notes, when they describe the version that is running. */
export function bundledNotesFor(runningVersion: string | null | undefined): readonly string[] | null {
  return releaseOf(runningVersion) === RELEASE_NOTES.version ? RELEASE_NOTES.items : null;
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
