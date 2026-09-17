import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";

import { PATCH as activate } from "../app/api/(proxy)/reverse-shares/activate/[id]/route";
import { PATCH as deactivate } from "../app/api/(proxy)/reverse-shares/deactivate/[id]/route";

for (const [action, handler] of [
  ["activate", activate],
  ["deactivate", deactivate],
] as const) {
  test(`reverse share ${action} sends a bodyless PATCH without a JSON content type`, async (context) => {
    let called = false;
    context.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
      called = true;
      assert.ok(url.endsWith(`/reverse-shares/test-id/${action}`));
      assert.equal(options.method, "PATCH");
      assert.equal(options.body, undefined);
      const headers = new Headers(options.headers);
      assert.equal(headers.get("content-type"), null);
      assert.equal(headers.get("cookie"), "session=test-session");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    const response = await handler(
      new NextRequest("http://localhost/api/test", {
        method: "PATCH",
        headers: { cookie: "session=test-session" },
      }),
      { params: Promise.resolve({ id: "test-id" }) }
    );
    assert.equal(response.status, 200);
    assert.ok(called);
  });
}
