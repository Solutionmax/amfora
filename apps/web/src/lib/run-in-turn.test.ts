import assert from "node:assert/strict";
import { test } from "node:test";

import { ignoreNotFound, runInTurn } from "./run-in-turn";

test("runs the actions one after the other, never two at once", async () => {
  let running = 0;
  let mostAtOnce = 0;
  const result = await runInTurn([1, 2, 3, 4], async () => {
    running++;
    mostAtOnce = Math.max(mostAtOnce, running);
    await new Promise((resolve) => setTimeout(resolve, 2));
    running--;
  });
  assert.equal(mostAtOnce, 1);
  assert.deepEqual(result, { done: 4, failed: 0 });
});

test("when one fails the others still run and the failures are counted", async () => {
  const seen: number[] = [];
  const result = await runInTurn([1, 2, 3, 4], async (item) => {
    seen.push(item);
    if (item === 2 || item === 4) throw new Error("nope");
  });
  assert.deepEqual(seen, [1, 2, 3, 4]);
  assert.deepEqual(result, { done: 2, failed: 2 });
});

test("an empty list does nothing", async () => {
  assert.deepEqual(await runInTurn([], async () => {}), { done: 0, failed: 0 });
});

test("a delete that finds the item already gone counts as done, other errors still fail", async () => {
  const gone = Object.assign(new Error("gone"), { response: { status: 404 } });
  const broken = Object.assign(new Error("broken"), { response: { status: 500 } });
  const result = await runInTurn([gone, broken, new Error("no response")], (error) =>
    Promise.reject(error).catch(ignoreNotFound)
  );
  assert.deepEqual(result, { done: 1, failed: 2 });
});
