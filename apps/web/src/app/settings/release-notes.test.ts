import assert from "node:assert/strict";
import { test } from "node:test";

import packageJson from "../../../package.json";
import { bundledNotesFor, noteLines, RELEASE_NOTES, releaseNotesUrl } from "./release-notes";

const triple = (version: string) => version.split("-")[0].split(".").map(Number);

test("the notes that ship with the app are never older than the app itself", () => {
  const [notes, app] = [triple(RELEASE_NOTES.version), triple(packageJson.version)];
  const firstDifference = notes.map((part, index) => part - app[index]).find((difference) => difference !== 0) ?? 0;

  assert.ok(
    firstDifference >= 0,
    `release-notes.ts describes ${RELEASE_NOTES.version}, the app is ${packageJson.version}`
  );
  assert.ok(RELEASE_NOTES.items.length > 0);
});

test("the shipped notes show for their own release and its betas, not for another version", () => {
  const { version, items } = RELEASE_NOTES;

  assert.deepEqual(bundledNotesFor(version), items);
  assert.deepEqual(bundledNotesFor(`${version}-beta.1`), items);
  assert.equal(bundledNotesFor("1.0.0"), null);
  assert.equal(bundledNotesFor(null), null);
  assert.equal(bundledNotesFor("not a version"), null);
});

test("the notes of a signed release become one line per change", () => {
  assert.deepEqual(noteLines("Select all on the Shares page.\n- Bulk delete works again.\r\n\n  • Meter fixed.  "), [
    "Select all on the Shares page.",
    "Bulk delete works again.",
    "Meter fixed.",
  ]);
  assert.deepEqual(noteLines("A fix release: one sentence."), ["A fix release: one sentence."]);
  assert.deepEqual(noteLines(""), []);
  assert.deepEqual(noteLines("  \n "), []);
});

test("the link to the full notes points at the release on the website", () => {
  assert.equal(releaseNotesUrl("2.4.0"), "https://amfora.solutionmax.net/releases/#v2-4-0");
  assert.equal(releaseNotesUrl("2.4.0-beta.1"), "https://amfora.solutionmax.net/releases/#v2-4-0");
  assert.equal(releaseNotesUrl(null), "https://amfora.solutionmax.net/releases/");
});
