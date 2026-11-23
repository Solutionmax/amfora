import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";

import { POST } from "../app/api/(proxy)/auth/login/route";
import { clientAddressHeaders } from "./share-password";

let forwarded = 0;
const originalFetch = global.fetch;
const request = (contentType: string, origin: string, url = "http://localhost:3400/api/auth/login") =>
  new NextRequest(url, {
    method: "POST",
    headers: { "content-type": contentType, origin },
    body: JSON.stringify({ emailOrUsername: "attacker", password: "correct-password" }),
  });
test("SEC-05: text/plain malicious-origin login never reaches backend or sets session", async () => {
  global.fetch = (async () => {
    forwarded++;
    return new Response("{}", { headers: { "set-cookie": "token=attacker; HttpOnly" } });
  }) as typeof fetch;
  try {
    const res = await POST(request("text/plain", "https://evil.test"));
    assert.ok(res.status === 403 || res.status === 415);
    assert.equal(res.headers.has("set-cookie"), false);
    assert.equal(forwarded, 0);
  } finally {
    global.fetch = originalFetch;
  }
});
test("SEC-05: same-origin JSON login remains functional", async () => {
  global.fetch = (async () =>
    new Response('{"user":{"id":"member"}}', { headers: { "set-cookie": "token=valid; HttpOnly" } })) as typeof fetch;
  try {
    const res = await POST(request("application/json", "http://localhost:3400"));
    assert.equal(res.status, 200);
    assert.equal(res.headers.has("set-cookie"), true);
  } finally {
    global.fetch = originalFetch;
  }
});
test("SEC-06: direct ingress does not forward attacker identity", () => {
  process.env.TRUST_CLIENT_IP_HEADERS = "false";
  for (const ip of ["198.51.100.1", "198.51.100.2", "198.51.100.3"])
    assert.deepEqual(clientAddressHeaders(new Headers({ "cf-connecting-ip": ip, "x-forwarded-for": ip })), {});
});
test("SEC-05: public JSON upload/secret mutations and explicit nonbrowser API clients remain usable", async () => {
  const { mutationBoundary } = await import("./request-boundary");
  for (const path of [
    "/api/secrets/open",
    "/api/reverse-shares/alias/test/register-file",
    "/api/files/multipart/create",
  ])
    assert.equal(
      mutationBoundary(request("application/json", "http://localhost:3400", `http://localhost:3400${path}`)),
      null
    );
  assert.equal(
    mutationBoundary(
      new NextRequest("http://localhost:3400/api/files", { method: "DELETE", headers: { "x-api-key": "amfora-test" } })
    ),
    null
  );
  assert.equal(
    mutationBoundary(request("application/json", "https://evil.test", "http://localhost:3400/api/secrets/open"))
      ?.status,
    403
  );
});
test("logout proxy forwards the session and preserves separate cookie revocations", async () => {
  const { POST: logout } = await import("../app/api/(proxy)/auth/logout/route");
  const headers = new Headers();
  headers.append("set-cookie", "token=; Max-Age=0; Path=/");
  headers.append("set-cookie", "credential-proof=; Max-Age=0; Path=/");
  let supplied = "";
  global.fetch = (async (_input: any, options: any) => {
    supplied = options.headers.cookie;
    return new Response('{"message":"Logout successful"}', { headers });
  }) as typeof fetch;
  try {
    const res = await logout(
      new NextRequest("http://localhost:3400/api/auth/logout", {
        method: "POST",
        headers: { cookie: "token=saved; credential-proof=proof", origin: "http://localhost:3400" },
      })
    );
    assert.equal(supplied, "token=saved; credential-proof=proof");
    assert.equal(res.headers.getSetCookie().length, 2);
  } finally {
    global.fetch = originalFetch;
  }
});
test("actual middleware accepts public LAN Host with internal standalone URL", async () => {
  const { middleware } = await import("../middleware");
  const res = middleware(
    new NextRequest("http://0.0.0.0:5487/api/auth/login", {
      method: "POST",
      headers: {
        host: "192.168.1.20:5487",
        origin: "http://192.168.1.20:5487",
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
      },
      body: "{}",
    })
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-middleware-next"), "1");
});
test("actual middleware accepts configured canonical HTTPS origin behind internal HTTP", async () => {
  const { middleware } = await import("../middleware");
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://share.solutionmax.net";
  try {
    const res = middleware(
      new NextRequest("http://0.0.0.0:5487/api/secrets/anonymous", {
        method: "POST",
        headers: {
          host: "share.solutionmax.net",
          origin: "https://share.solutionmax.net",
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
        },
        body: "{}",
      })
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-middleware-next"), "1");
  } finally {
    if (previous === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previous;
  }
});
test("internal topology never trusts foreign Origin or spoofed forwarding Host", async () => {
  const { middleware } = await import("../middleware");
  for (const origin of ["https://evil.test", "http://0.0.0.0:5487", "http://192.168.1.20:5487/"]) {
    const res = middleware(
      new NextRequest("http://0.0.0.0:5487/api/auth/login", {
        method: "POST",
        headers: {
          host: "192.168.1.20:5487",
          origin,
          "x-forwarded-host": "evil.test",
          "content-type": "application/json",
          "sec-fetch-site": origin.startsWith("https://evil") ? "cross-site" : "same-origin",
        },
        body: "{}",
      })
    );
    assert.equal(res.status, 403, origin);
  }
});
test("logout proxy preserves revocation failure and sends no clearing cookies", async () => {
  const { POST: logout } = await import("../app/api/(proxy)/auth/logout/route");
  global.fetch = (async () =>
    new Response('{"error":"Session revocation failed. Try again."}', {
      status: 503,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  try {
    const result = await logout(
      new NextRequest("http://localhost:3400/api/auth/logout", { method: "POST", headers: { cookie: "token=saved" } })
    );
    assert.equal(result.status, 503);
    assert.equal(result.headers.getSetCookie().length, 0);
    assert.doesNotMatch(await result.text(), /Logout successful/);
  } finally {
    global.fetch = originalFetch;
  }
});
