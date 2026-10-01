import assert from "node:assert/strict";
import { test } from "node:test";

import {
  filesInFolder,
  filterShares,
  folderWithContents,
  matchesFilter,
  parseViewLimit,
  shareUrl,
  toLocalInputValue,
  topLevelItems,
} from "./share-list";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

const shares = [
  { id: "a", name: "Offer for Hoasted", expiration: null },
  { id: "b", name: "Launch video", expiration: future },
  { id: "c", name: "Brand photos", expiration: past },
];

test("active holds shares that never expire or are not expired yet", () => {
  assert.equal(matchesFilter(shares[0], "active"), true);
  assert.equal(matchesFilter(shares[1], "active"), true);
  assert.equal(matchesFilter(shares[2], "active"), false);
});

test("expired holds only shares whose end date has passed", () => {
  assert.deepEqual(
    filterShares(shares, "expired", "").map((s) => s.id),
    ["c"]
  );
});

test("search matches the name case-insensitively and combines with the filter", () => {
  assert.deepEqual(
    filterShares(shares, "all", "  LAUNCH ").map((s) => s.id),
    ["b"]
  );
  assert.deepEqual(filterShares(shares, "expired", "launch"), []);
  assert.equal(filterShares([{ id: "x", name: null, expiration: null }], "all", "a").length, 0);
});

test("share url uses the /s/ route with the alias", () => {
  assert.equal(shareUrl("https://share.example", "offerte-demo"), "https://share.example/s/offerte-demo");
});

const tree = {
  folders: [
    { id: "f1", parentId: null },
    { id: "f2", parentId: "f1" },
    { id: "f3", parentId: "f2" },
    { id: "other", parentId: "not-shared" },
  ],
  files: [
    { id: "loose", folderId: null },
    { id: "in-f1", folderId: "f1" },
    { id: "in-f3", folderId: "f3" },
    { id: "in-unshared", folderId: "elsewhere" },
  ],
};

test("top level shows root folders and files outside shared folders", () => {
  const { folders, files } = topLevelItems(tree);
  assert.deepEqual(
    folders.map((f) => f.id),
    ["f1", "other"]
  );
  assert.deepEqual(
    files.map((f) => f.id),
    ["loose", "in-unshared"]
  );
});

test("a folder is removed together with everything shared below it", () => {
  const { folders, files } = folderWithContents(tree, "f1");
  assert.deepEqual(folders.sort(), ["f1", "f2", "f3"]);
  assert.deepEqual(files.sort(), ["in-f1", "in-f3"]);
  assert.equal(filesInFolder(tree, "f2"), 1);
});

test("datetime-local value is in local time without seconds", () => {
  assert.equal(toLocalInputValue(new Date(2026, 9, 5, 7, 3, 59)), "2026-10-05T07:03");
});

test("view limit accepts empty or a whole number of 1 or more", () => {
  assert.deepEqual(parseViewLimit(""), { ok: true, value: null });
  assert.deepEqual(parseViewLimit(" 10 "), { ok: true, value: 10 });
  assert.deepEqual(parseViewLimit("0"), { ok: false });
  assert.deepEqual(parseViewLimit("2.5"), { ok: false });
  assert.deepEqual(parseViewLimit("-3"), { ok: false });
});
