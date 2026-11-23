import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";

import { useTestDatabase } from "../../../test-support/test-db";
import { VirtualAuthenticator } from "../../../test-support/virtual-authenticator";

const database = useTestDatabase();
process.env.APP_URL = "http://localhost:3400";
let prisma: typeof import("../../shared/prisma").prisma;
let app: Awaited<ReturnType<typeof import("../../app").buildApp>>;
let AuthService: typeof import("./service").AuthService;
const PASSWORD = "old-password-race-42";
before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ AuthService } = await import("./service"));
  const { buildApp } = await import("../../app");
  const { registerRoutes } = await import("../../routes");
  app = await buildApp();
  registerRoutes(app);
  await app.ready();
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
  database.cleanup();
});
async function user(id: string, mfa = false) {
  return prisma.user.create({
    data: {
      id,
      firstName: id,
      lastName: "Race",
      username: id,
      email: `${id}@example.test`,
      password: await bcrypt.hash(PASSWORD, 4),
      twoFactorEnabled: mfa,
      twoFactorSecret: mfa ? "JBSWY3DPEHPK3PXP" : null,
      twoFactorBackupCodes: mfa ? JSON.stringify([{ code: "ABCD-EFGH", used: false }]) : null,
    },
  });
}
function barrier() {
  let reached!: () => void, resume!: () => void;
  return {
    at: new Promise<void>((r) => {
      reached = r;
    }),
    continue: new Promise<void>((r) => {
      resume = r;
    }),
    reached: () => reached(),
    resume: () => resume(),
  };
}
async function reset(id: string) {
  const token = `reset-${id}`;
  await prisma.passwordReset.create({ data: { userId: id, token, expiresAt: new Date(Date.now() + 60000) } });
  await new AuthService().resetPassword(token, "new-password-race-42");
}
for (const method of ["password", "trusted-device", "2fa"] as const)
  test(`verified ${method} proof cannot mint a session after completed password reset`, async () => {
    const id = `race-${method}`;
    await user(id, method !== "password");
    let trusted: string | undefined, challengeId: string | undefined;
    if (method === "trusted-device") {
      const { TrustedDeviceService } = await import("./trusted-device.service");
      trusted = await new TrustedDeviceService().addTrustedDevice(id, "race-test", "127.0.0.1", 0);
    }
    if (method === "2fa") {
      const result = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { emailOrUsername: id, password: PASSWORD },
      });
      challengeId = result.json().challengeId;
      assert.ok(challengeId);
    }
    const name = method === "2fa" ? "completeTwoFactorLogin" : "login";
    const original = AuthService.prototype[name];
    const gate = barrier();
    (AuthService.prototype as any)[name] = async function (...args: any[]) {
      const verified = await (original as any).apply(this, args);
      gate.reached();
      await gate.continue;
      return verified;
    };
    const pending = app.inject({
      method: "POST",
      url: method === "2fa" ? "/auth/2fa/login" : "/auth/login",
      cookies: trusted ? { "trusted-device": trusted } : undefined,
      payload:
        method === "2fa"
          ? { userId: id, token: "ABCD-EFGH", challengeId, rememberDevice: true }
          : { emailOrUsername: id, password: PASSWORD },
    });
    try {
      await gate.at;
      await reset(id);
      gate.resume();
      const result = await pending;
      assert.equal(result.statusCode, 400, result.body);
      assert.equal(
        result.cookies.some((c) => c.name === "token"),
        false
      );
      assert.equal(await prisma.session.count({ where: { userId: id } }), 0);
      assert.equal(await prisma.trustedDevice.count({ where: { userId: id } }), 0);
      assert.equal(
        result.cookies.some((c) => c.name === "trusted-device"),
        false
      );
    } finally {
      gate.resume();
      (AuthService.prototype as any)[name] = original;
      await pending;
    }
  });
test("verified passkey proof cannot mint a session after recovery", async () => {
  const id = "race-passkey";
  await user(id);
  const { testSession } = await import("../../../test-support/session");
  const token = await testSession(app, { userId: id, isAdmin: false });
  const key = new VirtualAuthenticator("localhost", "http://localhost:3400", id);
  const registration = await app.inject({
    method: "POST",
    url: "/auth/passkeys/register/options",
    cookies: { token },
    payload: { password: PASSWORD },
  });
  assert.equal(registration.statusCode, 200, registration.body);
  const registered = await app.inject({
    method: "POST",
    url: "/auth/passkeys/register/verify",
    cookies: { token },
    payload: { response: key.register(registration.json().challenge) },
  });
  assert.equal(registered.statusCode, 200, registered.body);
  const options = await app.inject({ method: "POST", url: "/auth/passkeys/login/options", payload: {} });
  const original = prisma.loginAttempt.deleteMany.bind(prisma.loginAttempt);
  const gate = barrier();
  (prisma.loginAttempt as any).deleteMany = async function (args: any) {
    const result = await original(args);
    if (args.where?.userId === id) {
      gate.reached();
      await gate.continue;
    }
    return result;
  };
  const pending = app.inject({
    method: "POST",
    url: "/auth/passkeys/login/verify",
    payload: { response: key.assert(options.json().challenge) },
  });
  try {
    await gate.at;
    await reset(id);
    gate.resume();
    const result = await pending;
    assert.equal(result.statusCode, 400, result.body);
    assert.equal(
      result.cookies.some((c) => c.name === "token"),
      false
    );
  } finally {
    gate.resume();
    (prisma.loginAttempt as any).deleteMany = original;
    await pending;
  }
});
test("verified provider identity cannot mint a session after recovery", async () => {
  const id = "race-provider";
  await user(id);
  const { AuthProvidersService } = await import("../auth-providers/service");
  await prisma.authProvider.create({
    data: {
      id: "race-idp",
      name: "race-idp",
      displayName: "Race",
      type: "oauth2",
      scope: "profile email",
      enabled: true,
      clientId: "client",
      authorizationEndpoint: "https://race-idp.test/authorize",
      tokenEndpoint: "https://race-idp.test/token",
      userInfoEndpoint: "https://race-idp.test/userinfo",
    },
  });
  await prisma.userAuthProvider.create({
    data: {
      userId: id,
      providerId: "race-idp",
      externalId: "race-subject",
      metadata: JSON.stringify({ issuer: "https://race-idp.test" }),
    },
  });
  const oldFetch = global.fetch;
  global.fetch = (async (url: any) =>
    new Response(
      JSON.stringify(
        String(url).endsWith("/token")
          ? { access_token: "access", token_type: "Bearer" }
          : { sub: "race-subject", email: `${id}@example.test`, email_verified: true }
      ),
      { headers: { "content-type": "application/json" } }
    )) as typeof fetch;
  const original = (AuthProvidersService.prototype as any).findOrCreateUser;
  const gate = barrier();
  (AuthProvidersService.prototype as any).findOrCreateUser = async function (...args: any[]) {
    const verified = await original.apply(this, args);
    gate.reached();
    await gate.continue;
    return verified;
  };
  const authorization = await app.inject({ url: "/auth/providers/race-idp/authorize" });
  const state = new URL(authorization.headers.location!).searchParams.get("state");
  const binding = authorization.cookies.find((c) => c.name === "oauth-binding")!.value;
  const pending = app.inject({
    url: `/auth/providers/race-idp/callback?code=code&state=${state}`,
    cookies: { "oauth-binding": binding },
  });
  try {
    await gate.at;
    await reset(id);
    gate.resume();
    const result = await pending;
    assert.equal(
      result.cookies.some((c) => c.name === "token"),
      false,
      result.headers.location
    );
  } finally {
    gate.resume();
    (AuthProvidersService.prototype as any).findOrCreateUser = original;
    global.fetch = oldFetch;
    await pending;
  }
});
test("logout persistence failure is reported without clearing a still-active session", async () => {
  const id = "logout-fault";
  await user(id);
  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { emailOrUsername: id, password: PASSWORD },
  });
  const token = login.cookies.find((c) => c.name === "token")!.value;
  await prisma.$executeRawUnsafe(
    "CREATE TRIGGER reject_logout BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT, 'injected revoke failure'); END"
  );
  try {
    const result = await app.inject({ method: "POST", url: "/auth/logout", cookies: { token } });
    assert.equal(result.statusCode, 503, result.body);
    assert.equal(
      result.cookies.some((c) => c.name === "token"),
      false
    );
    assert.equal((await app.inject({ url: "/files", cookies: { token } })).statusCode, 200);
    assert.doesNotMatch(result.body, /Logout successful/);
  } finally {
    await prisma.$executeRawUnsafe("DROP TRIGGER reject_logout");
  }
  assert.equal((await app.inject({ method: "POST", url: "/auth/logout", cookies: { token } })).statusCode, 200);
  assert.equal((await app.inject({ url: "/files", cookies: { token } })).statusCode, 401);
});
test("deactivation followed by reactivation cannot revive a pending verified login", async () => {
  const id = "race-reactivation";
  await user(id);
  const gate = barrier();
  const original = AuthService.prototype.login;
  AuthService.prototype.login = async function (...args: Parameters<typeof original>) {
    const verified = await original.apply(this, args);
    gate.reached();
    await gate.continue;
    return verified;
  };
  const pending = app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { emailOrUsername: id, password: PASSWORD },
  });
  try {
    await gate.at;
    const { UserService } = await import("../user/service");
    await new UserService().deactivateUser(id);
    await new UserService().activateUser(id);
    gate.resume();
    const result = await pending;
    assert.equal(result.statusCode, 400, result.body);
    assert.equal(
      result.cookies.some((c) => c.name === "token"),
      false
    );
  } finally {
    gate.resume();
    AuthService.prototype.login = original;
    await pending;
  }
});
test("logout verification read failure cannot be treated as an invalid credential", async () => {
  const id = "logout-read-fault";
  await user(id);
  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { emailOrUsername: id, password: PASSWORD },
  });
  const token = login.cookies.find((c) => c.name === "token")!.value;
  await prisma.$executeRawUnsafe("ALTER TABLE sessions RENAME TO sessions_unavailable");
  try {
    const result = await app.inject({ method: "POST", url: "/auth/logout", cookies: { token } });
    assert.equal(result.statusCode, 503, result.body);
    assert.equal(
      result.cookies.some((c) => c.name === "token"),
      false
    );
    assert.doesNotMatch(result.body, /Logout successful/);
  } finally {
    await prisma.$executeRawUnsafe("ALTER TABLE sessions_unavailable RENAME TO sessions");
  }
  assert.equal((await app.inject({ url: "/files", cookies: { token } })).statusCode, 200);
});
