import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
process.env.APP_URL = "http://localhost:3400";
let prisma: typeof import("../../shared/prisma").prisma;
let app: Awaited<ReturnType<typeof import("../../app").buildApp>>;
let service: import("./service").AuthProvidersService;
let info: any = { sub: "subject", email: "member@example.test", email_verified: false };
const oldFetch = global.fetch;
before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { buildApp } = await import("../../app");
  const { registerRoutes } = await import("../../routes");
  const { AuthProvidersService } = await import("./service");
  service = new AuthProvidersService();
  app = await buildApp();
  registerRoutes(app);
  await app.ready();
  await prisma.user.create({
    data: { id: "member", firstName: "Member", lastName: "Test", username: "member", email: "member@example.test" },
  });
  for (const id of ["one", "two"])
    await prisma.authProvider.create({
      data: {
        id,
        name: id,
        displayName: id,
        type: "oauth",
        scope: "profile email",
        enabled: true,
        clientId: "test",
        clientSecret: "secret",
        autoRegister: false,
        authorizationEndpoint: "https://idp.test/authorize",
        tokenEndpoint: "https://idp.test/token",
        userInfoEndpoint: "https://idp.test/userinfo",
      },
    });
  global.fetch = (async (url: any) =>
    new Response(
      JSON.stringify(String(url).endsWith("/token") ? { access_token: "access", token_type: "Bearer" } : info),
      { status: 200 }
    )) as typeof fetch;
});
after(async () => {
  global.fetch = oldFetch;
  await app.close();
  await prisma.$disconnect();
  database.cleanup();
});
const identity = (userInfo: any) =>
  (service as any).findOrCreateUser(userInfo, {
    id: "one",
    name: "one",
    issuerUrl: "https://idp.test",
    autoRegister: false,
  });
test("SEC-01: unverified or verified email never implicitly claims existing local account", async () => {
  await assert.rejects(
    identity({ id: "attacker", email: "member@example.test", emailVerified: false }),
    /link|existing/i
  );
  await assert.rejects(
    identity({ id: "attacker", email: "member@example.test", emailVerified: true }),
    /link|existing/i
  );
  assert.equal(await prisma.userAuthProvider.count(), 0);
});
test("SEC-01: conflicting subject rejects; exact provider/subject remains usable", async () => {
  await prisma.userAuthProvider.create({
    data: {
      userId: "member",
      providerId: "one",
      externalId: "legitimate",
      metadata: JSON.stringify({ issuer: "https://idp.test" }),
    },
  });
  await assert.rejects(
    identity({ id: "attacker", email: "member@example.test", emailVerified: true }),
    /link|existing/i
  );
  assert.equal((await identity({ id: "legitimate", email: "member@example.test" })).id, "member");
  await prisma.user.update({ where: { id: "member" }, data: { isActive: false } });
  await assert.rejects(identity({ id: "legitimate", email: "member@example.test" }), /inactive/i);
  await prisma.user.update({ where: { id: "member" }, data: { isActive: true } });
  await assert.rejects(identity({ id: "new", email: "new@example.test", emailVerified: true }), /disabled/i);
});
async function start() {
  const res = await app.inject({
    url: "/auth/providers/one/authorize",
    headers: { host: "evil.test", "x-forwarded-host": "evil.test", "x-forwarded-proto": "https" },
  });
  assert.equal(res.statusCode, 302, res.body);
  return {
    state: new URL(res.headers.location!).searchParams.get("state")!,
    binding: res.cookies.find((c) => c.name === "oauth-binding")?.value,
    url: new URL(res.headers.location!),
  };
}
const callback = (state: string, binding?: string, provider = "one") =>
  app.inject({
    url: `/auth/providers/${provider}/callback?code=test&state=${state}`,
    cookies: binding ? { "oauth-binding": binding } : undefined,
  });
test("SEC-02: authorize binds browser and uses canonical callback, ignoring caller redirect", async () => {
  const { binding, url } = await start();
  assert.ok(binding);
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:3400/api/auth/providers/one/callback");
  const res = await app.inject({ url: "/auth/providers/one/authorize?redirect_uri=https://evil.test/callback" });
  assert.equal(res.statusCode, 400);
});
test("SEC-02: missing/different browser and wrong provider cannot set session", async () => {
  for (const mode of ["missing", "different", "provider"]) {
    const flow = await start();
    const res = await callback(
      flow.state,
      mode === "missing" ? undefined : mode === "different" ? "wrong" : flow.binding,
      mode === "provider" ? "two" : "one"
    );
    assert.equal(
      res.cookies.some((c) => c.name === "token"),
      false,
      mode
    );
  }
});
test("SEC-02: same-browser succeeds once; expired state rejects", async () => {
  info = { sub: "legitimate", email: "member@example.test", email_verified: true };
  const flow = await start();
  const res = await callback(flow.state, flow.binding);
  assert.equal(
    res.cookies.some((c) => c.name === "token"),
    true,
    res.headers.location
  );
  assert.equal(
    (await callback(flow.state, flow.binding)).cookies.some((c) => c.name === "token"),
    false
  );
  const expired = await start();
  // Advance app clock so expiry is checked at callback, independent of cleanup timers.
  const oldNow = Date.now;
  Date.now = () => oldNow() + 700000;
  try {
    assert.equal(
      (await callback(expired.state, expired.binding)).cookies.some((c) => c.name === "token"),
      false
    );
  } finally {
    Date.now = oldNow;
  }
});
test("SEC-01: same subject from a changed issuer cannot reuse a pinned account association", async () => {
  await prisma.userAuthProvider.update({
    where: { userId_providerId: { userId: "member", providerId: "one" } },
    data: { metadata: JSON.stringify({ issuer: "https://idp.test" }) },
  });
  await assert.rejects(
    (service as any).findOrCreateUser(
      { id: "legitimate", email: "member@example.test" },
      { id: "one", name: "one", issuerUrl: "https://different.test", autoRegister: false }
    ),
    /issuer/i
  );
});
test("SEC-01: verified new registration works; unverified email and disabled registration reject", async () => {
  const provider = { id: "two", name: "two", issuerUrl: "https://idp.test", autoRegister: true };
  await assert.rejects(
    (service as any).findOrCreateUser(
      { id: "unverified", email: "unverified@example.test", emailVerified: false },
      provider
    ),
    /verified/i
  );
  assert.equal(
    (
      await (service as any).findOrCreateUser(
        { id: "new-verified", email: "new-verified@example.test", emailVerified: true },
        provider
      )
    ).email,
    "new-verified@example.test"
  );
});
test("SEC-10: provider-only account step-up binds exact subject and current session, produces no URL proof", async () => {
  const { testSession } = await import("../../../test-support/session");
  const token = await testSession(app, { userId: "member", viaProvider: true });
  async function reauthenticate(subject: string, cookie = token) {
    info = { sub: subject, email: "member@example.test", email_verified: true };
    const begin = await app.inject({ url: "/auth/providers/one/authorize?reauthenticate=true", cookies: { token } });
    assert.equal(begin.statusCode, 302, begin.body);
    const state = new URL(begin.headers.location!).searchParams.get("state");
    const binding = begin.cookies.find((c) => c.name === "oauth-binding")!.value;
    return app.inject({
      url: `/auth/providers/one/callback?code=reauth-code&state=${state}`,
      cookies: { token: cookie, "oauth-binding": binding },
    });
  }
  const wrong = await reauthenticate("attacker");
  assert.equal(
    wrong.cookies.some((c) => c.name === "credential-proof"),
    false
  );
  const different = await reauthenticate("legitimate", await testSession(app, { userId: "member", viaProvider: true }));
  assert.equal(
    different.cookies.some((c) => c.name === "credential-proof"),
    false
  );
  const valid = await reauthenticate("legitimate");
  const proof = valid.cookies.find((c) => c.name === "credential-proof")?.value;
  assert.ok(proof, valid.headers.location);
  assert.equal(valid.headers.location, "http://localhost:3400/profile");
  assert.equal(valid.headers.location!.includes(proof), false);
  const update = await app.inject({
    method: "PUT",
    url: "/users",
    cookies: { token, "credential-proof": proof },
    payload: { id: "member", email: "provider-proof@example.test" },
  });
  assert.equal(update.statusCode, 200, update.body);
  const stale = await app.inject({ url: "/auth/providers/one/authorize?reauthenticate=true", cookies: { token } });
  assert.equal(stale.statusCode, 400);
});
