import assert from "node:assert/strict";
import { test } from "node:test";

import { createNotificationStore } from "./notification-store";

const later = () => new Promise((resolve) => setTimeout(resolve, 5));

test("a count is stored, and asked for once for everybody who asks at the same moment", async () => {
  let asked = 0;
  const store = createNotificationStore(
    async () => (++asked, 3),
    () => false
  );
  await Promise.all([store.getState().load(), store.getState().load()]);
  assert.equal(store.getState().count, 3);
  assert.equal(asked, 1);
});

test("nothing is asked while the tab is hidden", async () => {
  let asked = 0;
  let hidden = true;
  const store = createNotificationStore(
    async () => (++asked, 2),
    () => hidden
  );
  await store.getState().load();
  assert.equal(asked, 0);
  hidden = false;
  await store.getState().load();
  assert.equal(asked, 1);
});

test("an answer that arrives after clear is dropped, so the next user never sees the old count", async () => {
  const store = createNotificationStore(
    async () => {
      await later();
      return 7;
    },
    () => false
  );
  const pending = store.getState().load();
  store.getState().clear();
  await pending;
  assert.equal(store.getState().count, 0);
  await store.getState().load();
  assert.equal(store.getState().count, 7, "a new question after clear is answered");
});

test("an answer that is no count resets to zero", async () => {
  let fail = false;
  const store = createNotificationStore(
    async () => (fail ? Promise.reject(new Error("no")) : 4),
    () => false
  );
  await store.getState().load();
  assert.equal(store.getState().count, 4);
  fail = true;
  await store.getState().load();
  assert.equal(store.getState().count, 0);
});
