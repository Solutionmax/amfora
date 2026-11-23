import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
process.env.APP_URL = "http://localhost:3400";
process.env.TRUST_CLIENT_IP_HEADERS = "false";
let app: Awaited<ReturnType<typeof import("../../app").buildApp>>;
let prisma: typeof import("../../shared/prisma").prisma;
const PASSWORD = "original-password-42";
let loginCount = 1;
let updateCount = 1;
async function login(id = "member") {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    remoteAddress: `127.0.1.${loginCount++}`,
    payload: { emailOrUsername: id, password: PASSWORD },
  });
  assert.equal(res.statusCode, 200, res.body);
  return res.cookies.find((c) => c.name === "token")!.value;
}
const get = (url: string, token: string) => app.inject({ url, cookies: { token } });
before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { buildApp } = await import("../../app");
  const { registerRoutes } = await import("../../routes");
  app = await buildApp();
  registerRoutes(app);
  app.get("/test-session-callback", (request, reply) => {
    request.jwtVerify((error, claims) => {
      if (error) return reply.status(401).send({ error: error.message });
      return reply.send({ userId: (claims as any).userId });
    });
  });
  await app.ready();
  for (const id of ["member", "admin", "other"])
    await prisma.user.create({
      data: {
        id,
        firstName: id,
        lastName: "Test",
        username: id,
        email: `${id}@example.test`,
        password: await bcrypt.hash(PASSWORD, 4),
        isAdmin: id === "admin",
      },
    });
  await prisma.file.create({
    data: {
      id: "private-file",
      userId: "member",
      name: "private.txt",
      extension: "txt",
      size: 1n,
      objectName: "private-object",
    },
  });
});
after(async () => {
  await app?.close();
  await prisma.$disconnect();
  database.cleanup();
});
test("SEC-03: inactive account cannot list/create workspace or get upload grants", async () => {
  const token = await login();
  await prisma.user.update({ where: { id: "member" }, data: { isActive: false } });
  for (const url of ["/files", "/folders", "/files/presigned-url?filename=x.txt&extension=txt"])
    assert.equal((await get(url, token)).statusCode, 401, url);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/folders",
        payload: { name: "blocked", objectName: "blocked-folder" },
        cookies: { token },
      })
    ).statusCode,
    401
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { emailOrUsername: "member", password: PASSWORD },
      })
    ).statusCode,
    400
  );
  await prisma.user.update({ where: { id: "member" }, data: { isActive: true } });
});
test("SEC-04: logout revokes saved token for metadata and private download", async () => {
  const token = await login();
  assert.equal((await get("/files", token)).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: "/auth/logout", cookies: { token } })).statusCode, 200);
  assert.equal((await get("/files", token)).statusCode, 401);
  assert.equal((await get("/files/download-url?objectName=private-object", token)).statusCode, 401);
  assert.equal((await get("/files", await login())).statusCode, 200);
});
test("SEC-04: reset revokes old sessions and trusted devices; fresh login works", async () => {
  const token = await login();
  await prisma.trustedDevice.create({
    data: { userId: "member", deviceHash: "old-trusted", expiresAt: new Date(Date.now() + 60000) },
  });
  await prisma.passwordReset.create({
    data: { userId: "member", token: "session-reset", expiresAt: new Date(Date.now() + 60000) },
  });
  const { AuthService } = await import("./service");
  await new AuthService().resetPassword("session-reset", PASSWORD);
  assert.equal((await get("/files", token)).statusCode, 401);
  assert.equal((await get("/files/download-url?objectName=private-object", token)).statusCode, 401);
  assert.equal(await prisma.trustedDevice.count({ where: { userId: "member" } }), 0);
  assert.equal((await get("/files", await login())).statusCode, 200);
});
test("SEC-04: legacy JWT missing required session fields fails closed", async () => {
  const token = app.jwt.sign({ userId: "member", isAdmin: true });
  assert.equal((await get("/files", token)).statusCode, 401);
});
test("SEC-10: session alone cannot change own password/email; fresh password works", async () => {
  const token = await login();
  const update = (payload: object, cookie = token) =>
    app.inject({
      method: "PUT",
      url: "/users",
      remoteAddress: `127.0.2.${updateCount++}`,
      cookies: { token: cookie },
      payload,
    });
  assert.equal((await update({ id: "member", password: "replacement-password" })).statusCode, 400);
  assert.equal((await update({ id: "member", email: "changed@example.test" })).statusCode, 400);
  assert.equal(
    (await update({ id: "member", password: "replacement-password", currentPassword: "wrong" })).statusCode,
    400
  );
  assert.equal((await update({ id: "other", firstName: "attack" })).statusCode, 403);
  assert.equal((await update({ id: "member", isAdmin: true })).statusCode, 403);
  const success = await update({ id: "member", email: "changed@example.test", currentPassword: PASSWORD });
  assert.equal(success.statusCode, 200, success.body);
  const replacement = success.cookies.find((c) => c.name === "token")?.value;
  assert.ok(replacement);
  assert.equal((await get("/files", token)).statusCode, 401);
  assert.equal((await get("/files", replacement)).statusCode, 200);
  assert.equal((await update({ id: "other", email: "managed@example.test" }, await login("admin"))).statusCode, 200);
});
test("SEC-06: rotating spoofed address shares direct-ingress quota and cannot affect place", async () => {
  const remaining: number[] = [];
  for (const address of ["198.51.100.221", "198.51.100.221", "198.51.100.222"]) {
    const res = await app.inject({
      url: "/auth/config",
      headers: { "cf-connecting-ip": address, "x-forwarded-for": address },
    });
    remaining.push(Number(res.headers["x-ratelimit-remaining"]));
  }
  assert.deepEqual(remaining, [remaining[0], remaining[0] - 1, remaining[0] - 2]);
  const { clientAddress } = await import("../activity/place");
  assert.equal(clientAddress({ headers: { "cf-connecting-ip": "198.51.100.222" }, ip: "127.0.0.1" }), "127.0.0.1");
});
test("SEC-10: credential proof is one-use and bound to user/session/version", async () => {
  const { createCredentialProof } = await import("./session");
  const token = await login();
  const claims = app.jwt.decode(token) as any;
  const proof = await createCredentialProof(claims);
  const secondSession = await login();
  const update = (cookie: string, credentialProof: string, email: string, id = "member") =>
    app.inject({
      method: "PUT",
      url: "/users",
      remoteAddress: `127.0.2.${updateCount++}`,
      cookies: { token: cookie, "credential-proof": credentialProof },
      payload: { id, email },
    });
  assert.equal((await update(secondSession, proof, "bad@example.test")).statusCode, 400);
  assert.equal((await update(token, proof, "proof@example.test")).statusCode, 200);
  assert.equal((await update(await login(), proof, "reuse@example.test")).statusCode, 400);
  const other = await login("other");
  assert.equal((await update(other, proof, "wrong-user@example.test", "other")).statusCode, 400);
  const logoutToken = await login();
  const logoutProof = await createCredentialProof(app.jwt.decode(logoutToken) as any);
  await app.inject({ method: "POST", url: "/auth/logout", cookies: { token: logoutToken } });
  assert.equal((await update(logoutToken, logoutProof, "logout@example.test")).statusCode, 401);
});
test("SEC-04: signed viaApiKey flag cannot bypass persisted session validation", async () => {
  const forged = app.jwt.sign({ userId: "member", isAdmin: false, viaApiKey: true });
  assert.equal((await get("/files", forged)).statusCode, 401);
});
test("SEC-10: expired proof cannot change credentials; deactivation blocks proof", async () => {
  const { createCredentialProof, secretHash } = await import("./session");
  const token = await login();
  const proof = await createCredentialProof(app.jwt.decode(token) as any);
  await prisma.credentialProof.update({
    where: { id: secretHash(proof) },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const update = () =>
    app.inject({
      method: "PUT",
      url: "/users",
      remoteAddress: `127.0.2.${updateCount++}`,
      cookies: { token, "credential-proof": proof },
      payload: { id: "member", email: "expired@example.test" },
    });
  assert.equal((await update()).statusCode, 400);
  await prisma.user.update({ where: { id: "member" }, data: { isActive: false } });
  assert.equal((await update()).statusCode, 401);
  await prisma.user.update({ where: { id: "member" }, data: { isActive: true } });
});

test("central guard preserves the verifier callback overload", async () => {
  const token = await login();
  const res = await get("/test-session-callback", token);
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().userId, "member");
});
test("SEC-10: a request reaching the service after logout cannot use its former session", async () => {
  const token = await login();
  const claims = app.jwt.decode(token) as any;
  await app.inject({ method: "POST", url: "/auth/logout", cookies: { token } });
  const { UserService } = await import("../user/service");
  await assert.rejects(
    new UserService().updateUser(
      "member",
      { email: "revoked-service@example.test", currentPassword: PASSWORD },
      claims
    ),
    /revoked|verification/i
  );
});
