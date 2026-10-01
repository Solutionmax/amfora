import assert from "node:assert/strict";
import { test } from "node:test";

import { changedConfigs, isDraftDirty, radiusFeel, rebaseDraft, remToPx, type BrandDraft } from "./draft";

const stored: BrandDraft = {
  name: "Amfora",
  description: "Secure",
  color: "#0079d2",
  radiusPx: 8,
  font: "",
  theme: "stage",
  playback: false,
  showCredit: true,
  css: "",
};

test("nothing changed means clean and no writes", () => {
  assert.equal(isDraftDirty(stored, { ...stored }), false);
  assert.deepEqual(changedConfigs(stored, { ...stored }), []);
});

test("changed fields become config writes with stored formats", () => {
  const draft = { ...stored, color: "#E5641B", radiusPx: 12, playback: true, showCredit: false, name: " Hoasted " };

  assert.equal(isDraftDirty(stored, draft), true);
  assert.deepEqual(changedConfigs(stored, draft), [
    { key: "appName", value: "Hoasted" },
    { key: "appPrimaryColor", value: "#e5641b" },
    { key: "appRadius", value: "0.75rem" },
    { key: "appSharePlayback", value: "true" },
    { key: "appHideCredit", value: "true" },
  ]);
});

test("skipped fields are not written", () => {
  const draft = { ...stored, css: "a{}", showCredit: false };

  assert.deepEqual(changedConfigs(stored, draft, ["css", "showCredit"]), []);
});

test("rebase keeps edits and takes fresh stored values elsewhere", () => {
  const next = { ...stored, description: "New from server" };
  const draft = { ...stored, name: "Edited" };

  assert.deepEqual(rebaseDraft(stored, next, draft), { ...next, name: "Edited" });
});

test("radius helpers", () => {
  assert.equal(remToPx("0.5rem"), 8);
  assert.equal(remToPx("nonsense"), 8);
  assert.equal(radiusFeel(2), "sharp");
  assert.equal(radiusFeel(8), "soft");
  assert.equal(radiusFeel(14), "round");
});
