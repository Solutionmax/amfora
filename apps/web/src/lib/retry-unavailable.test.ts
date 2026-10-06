import assert from "node:assert/strict";
import { test } from "node:test";

import { retryWhenUnavailable } from "./retry-unavailable";

const unavailable = () => Object.assign(new Error("503"), { response: { status: 503 } });

test("a 503 is tried again and the answer of the next try is returned", async () => {
  let calls = 0;
  const result = await retryWhenUnavailable(async () => {
    if (++calls < 3) throw unavailable();
    return "ok";
  }, [0, 0, 0]);
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("after three tries again the 503 is thrown", async () => {
  let calls = 0;
  await assert.rejects(
    retryWhenUnavailable(async () => {
      calls++;
      throw unavailable();
    }, [0, 0, 0]),
    /503/
  );
  assert.equal(calls, 4);
});

test("any other error is thrown at once", async () => {
  let calls = 0;
  await assert.rejects(
    retryWhenUnavailable(async () => {
      calls++;
      throw Object.assign(new Error("400"), { response: { status: 400 } });
    }, [0, 0, 0]),
    /400/
  );
  assert.equal(calls, 1);
});
