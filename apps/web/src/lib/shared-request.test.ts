import assert from "node:assert/strict";
import { test } from "node:test";

import { sharedRequest } from "./shared-request";

const counter = () => {
  let calls = 0;
  return { load: async () => ++calls, calls: () => calls };
};

test("callers at the same moment share one request", async () => {
  const c = counter();
  const request = sharedRequest(c.load, 1000);
  const answers = await Promise.all([request.get(), request.get(), request.get()]);
  assert.deepEqual(answers, [1, 1, 1]);
  assert.equal(c.calls(), 1);
});

test("a caller right after the answer still gets it, a later one asks again", async () => {
  const c = counter();
  const request = sharedRequest(c.load, 30);
  assert.equal(await request.get(), 1);
  assert.equal(await request.get(), 1);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(await request.get(), 2);
});

test("fresh always asks again, and later callers get that answer", async () => {
  const c = counter();
  const request = sharedRequest(c.load, 1000);
  await request.get();
  assert.equal(await request.fresh(), 2);
  assert.equal(await request.get(), 2);
});

test("reset drops what was kept, and a failed request is not kept", async () => {
  let calls = 0;
  const request = sharedRequest(async () => {
    calls++;
    if (calls === 1) throw new Error("down");
    return calls;
  }, 1000);
  await assert.rejects(request.get());
  assert.equal(await request.get(), 2);
  request.reset();
  assert.equal(await request.get(), 3);
});
