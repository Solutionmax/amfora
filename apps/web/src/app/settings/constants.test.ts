import assert from "node:assert/strict";
import { test } from "node:test";

import { blocksFor } from "./constants";

test("places known keys in their blocks and pairs", () => {
  const blocks = blocksFor("security", [
    "maxLoginAttempts",
    "loginBlockDuration",
    "passwordMinLength",
    "passwordResetTokenExpiration",
    "passwordAuthEnabled",
  ]);

  assert.deepEqual(
    blocks.map((block) => block.id),
    ["signingIn", "bruteForce"]
  );
  assert.deepEqual(blocks[0].rows, ["passwordAuthEnabled", ["passwordMinLength", "passwordResetTokenExpiration"]]);
});

test("a pair with one missing key becomes a single row", () => {
  const blocks = blocksFor("email", ["smtpEnabled", "smtpHost"]);

  assert.deepEqual(blocks[0].rows, ["smtpEnabled", "smtpHost"]);
});

test("unknown keys land in a closing more block, empty blocks disappear", () => {
  const blocks = blocksFor("general", ["hideVersion", "somethingNew"]);

  assert.deepEqual(
    blocks.map((block) => block.id),
    ["behaviour", "more"]
  );
  assert.deepEqual(blocks[1].rows, ["somethingNew"]);
});

test("activity and webhook settings have their own blocks, the key between address and switches", () => {
  const blocks = blocksFor("security", [
    "webhookSecretOpened",
    "webhookSecret",
    "activityPlace",
    "webhookUrl",
    "activityRetentionDays",
    "webhookFilesReceived",
    "webhookShareDownloaded",
  ]);

  assert.deepEqual(blocks, [
    { id: "activity", rows: [["activityRetentionDays", "activityPlace"]] },
    {
      id: "webhooks",
      rows: ["webhookUrl", "webhookSecret", "webhookFilesReceived", "webhookShareDownloaded", "webhookSecretOpened"],
    },
  ]);
});

test("notification switches follow outgoing mail", () => {
  const blocks = blocksFor("email", ["notifySecretOpenedEnabled", "notifyDownloadEnabled", "notifyExpiryEnabled"]);

  assert.deepEqual(blocks, [
    { id: "notifications", rows: ["notifyDownloadEnabled", "notifyExpiryEnabled", "notifySecretOpenedEnabled"] },
  ]);
});

test("unknown group puts everything in more", () => {
  assert.deepEqual(blocksFor("other", ["a", "b"]), [{ id: "more", rows: ["a", "b"] }]);
});

test("the two link lifetime settings sit side by side under the storage limits", () => {
  const blocks = blocksFor("storage", [
    "maxFileSize",
    "maxTotalStoragePerUser",
    "shareDefaultExpiryDays",
    "shareMaxExpiryDays",
  ]);

  assert.deepEqual(
    blocks.map((block) => block.id),
    ["limits", "linkLifetime"]
  );
  assert.deepEqual(blocks[1].rows, [["shareDefaultExpiryDays", "shareMaxExpiryDays"]]);
});
