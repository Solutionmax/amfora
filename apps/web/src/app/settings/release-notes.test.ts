import assert from "node:assert/strict";
import { test } from "node:test";

import enUS from "../../../messages/en-US.json";
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
  assert.ok(RELEASE_NOTES.order.length > 0);
});

test("the shipped notes show for their own release and its betas, not for another version", () => {
  const { version, order } = RELEASE_NOTES;

  assert.deepEqual(bundledNotesFor(version), order);
  assert.deepEqual(bundledNotesFor(`${version}-beta.1`), order);
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

test("every key in the order list has a text, and every text is in the order list", () => {
  const texts = (enUS as { releaseNotes?: { items?: Record<string, unknown> } }).releaseNotes?.items ?? {};
  const keys = Object.keys(texts);

  assert.equal(new Set(RELEASE_NOTES.order).size, RELEASE_NOTES.order.length, "a key is listed twice");
  assert.deepEqual(
    RELEASE_NOTES.order.filter((key) => typeof texts[key] !== "string" || texts[key] === ""),
    [],
    "keys without a text in en-US"
  );
  assert.deepEqual(
    keys.filter((key) => !(RELEASE_NOTES.order as readonly string[]).includes(key)),
    [],
    "texts in en-US that are not in the order list"
  );
});

test("the notes are short: at most 14 lines", () => {
  assert.ok(RELEASE_NOTES.order.length <= 14);
});
