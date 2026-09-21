import assert from "node:assert/strict";
import { test } from "node:test";

import { greetingKey } from "./greeting";

test("greeting follows the hour", () => {
  assert.equal(greetingKey(6), "morning");
  assert.equal(greetingKey(12), "afternoon");
  assert.equal(greetingKey(18), "evening");
  assert.equal(greetingKey(23), "night");
  assert.equal(greetingKey(2), "night");
});
