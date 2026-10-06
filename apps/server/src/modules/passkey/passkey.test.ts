import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import bcrypt from "bcryptjs";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";
import { VirtualAuthenticator } from "../../../test-support/virtual-authenticator";

const database = useTestDatabase();
process.env.APP_URL = "http://localhost:3400";
const ORIGIN = "http://localhost:3400";
const PASSWORD = "correct horse battery";

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
const routeConfigs = new Map<string, any>();

const as = (userId: string) => ({ cookies: { token: app.jwt.sign({ userId, isAdmin: false }) } });
const post = (url: string, payload: object, auth?: object, headers: Record<string, string> = {}) =>
  app.inject({ method: "POST", url, payload, headers, ...(auth ?? {}) });

async function register(userId: string, authenticator: VirtualAuthenticator, name?: string) {
  const options = await post("/auth/passkeys/register/options", { password: PASSWORD }, as(userId));
  assert.equal(options.statusCode, 200, options.body);
  const challenge = options.json().challenge as string;
  const res = await post(
    "/auth/passkeys/register/verify",
    { response: authenticator.register(challenge), name },
    as(userId)
  );
  return { res, challenge, options: options.json() };
}

async function loginChallenge() {
  const res = await post("/auth/passkeys/login/options", {});
  assert.equal(res.statusCode, 200, res.body);
  return res.json().challenge as string;
}

const login = (response: object, headers: Record<string, string> = {}) =>
  post("/auth/passkeys/login/verify", { response }, undefined, headers);

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { registerRoutes } = await import("../../routes");
  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook("onRoute", (route) => {
    for (const method of [route.method].flat()) routeConfigs.set(`${method} ${route.url}`, route.config);
  });
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  app.decorateRequest("jwtSign", function (this: any, payload: object) {
    return this.server.jwt.sign(payload);
  });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  const password = await bcrypt.hash(PASSWORD, 4);
  for (const id of ["ann", "ben", "gone"]) {
    await prisma.user.create({
      data: {
        id,
        firstName: id,
        lastName: "Test",
        username: id,
        email: `${id}@example.test`,
        password,
        isActive: id !== "gone",
      },
    });
  }
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

test("adding a passkey needs the password, a wrong one makes no challenge", async () => {
  const before = await prisma.passkeyChallenge.count();
  const wrong = await post("/auth/passkeys/register/options", { password: "nope nope nope" }, as("ann"));
  assert.equal(wrong.statusCode, 400);
  assert.equal(await prisma.passkeyChallenge.count(), before);
  const none = await post("/auth/passkeys/register/options", {}, as("ann"));
  assert.equal(none.statusCode, 400);
  assert.equal((await post("/auth/passkeys/register/options", { password: PASSWORD })).statusCode, 401);
});

test("the registration options come from the configuration, whatever the request headers say", async () => {
  const res = await post("/auth/passkeys/register/options", { password: PASSWORD }, as("ann"), {
    host: "evil.example",
    origin: "https://evil.example",
    "x-forwarded-host": "evil.example",
  });
  const options = res.json();
  assert.equal(options.rp.id, "localhost");
  assert.equal(options.authenticatorSelection.userVerification, "required");
  assert.equal(options.authenticatorSelection.residentKey, "required");
});

test("a passkey is added, listed without its key, and removed again with the password", async () => {
  const phone = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  const { res } = await register("ann", phone, "My phone");
  assert.equal(res.statusCode, 200, res.body);
  const list = await app.inject({ method: "GET", url: "/auth/passkeys", ...as("ann") });
  const [entry] = list.json().passkeys;
  assert.equal(entry.name, "My phone");
  assert.equal(entry.lastUsedAt, null);
  assert.deepEqual(Object.keys(entry).sort(), ["createdAt", "id", "lastUsedAt", "name"]);
  const stored = await prisma.passkey.findFirstOrThrow({ where: { userId: "ann" } });
  assert.equal(stored.credentialId, phone.id);
  assert.equal(typeof stored.counter, "bigint");

  assert.equal((await post(`/auth/passkeys/${entry.id}/remove`, {}, as("ann"))).statusCode, 400);
  assert.equal(
    (await post(`/auth/passkeys/${entry.id}/remove`, { password: "nope nope nope" }, as("ann"))).statusCode,
    400
  );
  assert.equal(await prisma.passkey.count({ where: { userId: "ann" } }), 1);
  assert.equal((await post(`/auth/passkeys/${entry.id}/remove`, { password: PASSWORD }, as("ann"))).statusCode, 200);
  assert.equal(await prisma.passkey.count({ where: { userId: "ann" } }), 0);
});

test("without a name the passkey is called Passkey", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  const { res } = await register("ann", key);
  assert.equal(res.statusCode, 200, res.body);
  assert.equal((await prisma.passkey.findFirstOrThrow({ where: { credentialId: key.id } })).name, "Passkey");
  await prisma.passkey.deleteMany({ where: { userId: "ann" } });
});

test("a registration challenge works once, and not after it expired", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  const { res, challenge } = await register("ann", key);
  assert.equal(res.statusCode, 200);
  const again = await post("/auth/passkeys/register/verify", { response: key.register(challenge) }, as("ann"));
  assert.equal(again.statusCode, 400);

  const options = await post("/auth/passkeys/register/options", { password: PASSWORD }, as("ann"));
  const late = options.json().challenge as string;
  await prisma.passkeyChallenge.update({ where: { id: late }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const other = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  const expired = await post("/auth/passkeys/register/verify", { response: other.register(late) }, as("ann"));
  assert.equal(expired.statusCode, 400);
  assert.equal(await prisma.passkey.count({ where: { credentialId: other.id } }), 0);
  await prisma.passkey.deleteMany({ where: { userId: "ann" } });
});

test("a challenge made for one user cannot register a key for another", async () => {
  const options = await post("/auth/passkeys/register/options", { password: PASSWORD }, as("ann"));
  const challenge = options.json().challenge as string;
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ben");
  const res = await post("/auth/passkeys/register/verify", { response: key.register(challenge) }, as("ben"));
  assert.equal(res.statusCode, 400);
  assert.equal(await prisma.passkey.count({ where: { credentialId: key.id } }), 0);
});

test("a registration answer made for another origin or relying party is refused", async () => {
  for (const [origin, rpID] of [
    ["https://evil.example", "localhost"],
    [ORIGIN, "evil.example"],
  ]) {
    const options = await post("/auth/passkeys/register/options", { password: PASSWORD }, as("ann"));
    const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
    const res = await post(
      "/auth/passkeys/register/verify",
      { response: key.register(options.json().challenge, origin, rpID) },
      as("ann")
    );
    assert.equal(res.statusCode, 400, `${origin} ${rpID}`);
  }
});

test("signing in with a passkey is a complete sign in, and writes the usual line", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", key, "Laptop");
  const res = await login(key.assert(await loginChallenge()));
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().user.id, "ann");
  const cookie = res.cookies.find((c) => c.name === "token");
  assert.ok(cookie?.httpOnly);
  const me = await app.inject({ method: "GET", url: "/auth/me", cookies: { token: cookie!.value } });
  assert.equal(me.json().user.id, "ann");

  const stored = await prisma.passkey.findFirstOrThrow({ where: { credentialId: key.id } });
  assert.equal(stored.counter, BigInt(1));
  assert.ok(stored.lastUsedAt);
  const line = await prisma.activityEvent.findFirstOrThrow({ where: { action: "account.signed_in", ownerId: "ann" } });
  assert.equal(line.detail, "passkey");
  assert.equal(line.actorName, "ann Test");
});

test("a login challenge is single use, and a registration challenge does not sign anybody in", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", key);
  const challenge = await loginChallenge();
  const answer = key.assert(challenge);
  assert.equal((await login(answer)).statusCode, 200);
  assert.equal((await login(answer)).statusCode, 400);

  const registration = await post("/auth/passkeys/register/options", { password: PASSWORD }, as("ann"));
  const wrongPurpose = await login(key.assert(registration.json().challenge));
  assert.equal(wrongPurpose.statusCode, 400);
  assert.equal(wrongPurpose.cookies.length, 0);
});

test("a login challenge cannot register a key", async () => {
  const challenge = await loginChallenge();
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ben");
  const res = await post("/auth/passkeys/register/verify", { response: key.register(challenge) }, as("ben"));
  assert.equal(res.statusCode, 400);
  assert.equal(await prisma.passkey.count({ where: { credentialId: key.id } }), 0);
});

test("an expired login challenge is refused", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", key);
  const challenge = await loginChallenge();
  await prisma.passkeyChallenge.update({ where: { id: challenge }, data: { expiresAt: new Date(Date.now() - 1) } });
  assert.equal((await login(key.assert(challenge))).statusCode, 400);
});

test("origin and relying party id come from the configuration, not from the headers", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", key);
  const evilHeaders = { host: "evil.example", origin: "https://evil.example", "x-forwarded-host": "evil.example" };
  const good = await login(key.assert(await loginChallenge()), evilHeaders);
  assert.equal(good.statusCode, 200, good.body);
  for (const forged of [
    { origin: "https://evil.example" },
    { rpID: "evil.example" },
    { origin: "https://evil.example", rpID: "evil.example" },
  ]) {
    const bad = await login(key.assert(await loginChallenge(), forged), evilHeaders);
    assert.equal(bad.statusCode, 400, JSON.stringify(forged));
  }
});

test("a deactivated user cannot sign in with a passkey, and neither after the passkey was removed", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "gone");
  await prisma.passkey.create({
    data: { userId: "gone", credentialId: key.id, publicKey: Buffer.from([1]), name: "x" },
  });
  const res = await login(key.assert(await loginChallenge()));
  assert.equal(res.statusCode, 400);
  assert.equal(res.cookies.length, 0);

  const removed = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", removed);
  const stored = await prisma.passkey.findFirstOrThrow({ where: { credentialId: removed.id } });
  assert.equal((await post(`/auth/passkeys/${stored.id}/remove`, { password: PASSWORD }, as("ann"))).statusCode, 200);
  assert.equal((await login(removed.assert(await loginChallenge()))).statusCode, 400);
});

test("a counter that goes backwards is refused and does not move the stored one", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ben");
  await register("ben", key);
  assert.equal((await login(key.assert(await loginChallenge(), { counter: 5 }))).statusCode, 200);
  const back = await login(key.assert(await loginChallenge(), { counter: 3 }));
  assert.equal(back.statusCode, 400);
  const same = await login(key.assert(await loginChallenge(), { counter: 5 }));
  assert.equal(same.statusCode, 400);
  assert.equal((await prisma.passkey.findFirstOrThrow({ where: { credentialId: key.id } })).counter, BigInt(5));
  assert.equal((await login(key.assert(await loginChallenge(), { counter: 6 }))).statusCode, 200);
});

test("a user handle that belongs to somebody else is refused", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ben", key);
  assert.equal((await login(key.assert(await loginChallenge()))).statusCode, 400);
});

test("failures look the same whether the credential exists or not, and are counted and logged", async () => {
  const known = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", known);
  await prisma.loginAttempt.deleteMany({});
  const stranger = new VirtualAuthenticator("localhost", ORIGIN, "ann");

  const unknown = await login(stranger.assert(await loginChallenge()));
  const badSignature = known.assert(await loginChallenge());
  badSignature.response.signature = stranger.assert(await loginChallenge()).response.signature;
  const forged = await login(badSignature);
  assert.equal(unknown.statusCode, forged.statusCode);
  assert.equal(unknown.body, forged.body);

  const attempt = await prisma.loginAttempt.findUniqueOrThrow({ where: { userId: "ann" } });
  assert.equal(attempt.attempts, 1);
  const lines = await prisma.activityEvent.findMany({ where: { action: "account.sign_in_failed" } });
  assert.ok(lines.length >= 1);
  assert.ok(lines.every((line) => line.detail === "passkey"));
});

test("too many failures block the passkey just as they block the password", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", key);
  await prisma.loginAttempt.deleteMany({});
  const max = Number((await prisma.appConfig.findUniqueOrThrow({ where: { key: "maxLoginAttempts" } })).value);
  const stranger = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  for (let i = 0; i < max; i++) {
    const forged = key.assert(await loginChallenge());
    forged.response.signature = stranger.assert("x").response.signature;
    assert.equal((await login(forged)).statusCode, 400);
  }
  const blocked = await login(key.assert(await loginChallenge()));
  assert.equal(blocked.statusCode, 400);
  assert.equal(blocked.cookies.length, 0);
  await prisma.loginAttempt.deleteMany({});
  assert.equal((await login(key.assert(await loginChallenge()))).statusCode, 200);
});

test("a success clears the failed attempts", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", key);
  await prisma.loginAttempt.deleteMany({});
  await prisma.loginAttempt.create({ data: { userId: "ann", attempts: 2, lastAttempt: new Date() } });
  assert.equal((await login(key.assert(await loginChallenge()))).statusCode, 200);
  assert.equal(await prisma.loginAttempt.count({ where: { userId: "ann" } }), 0);
});

test("nobody can remove the passkey of somebody else", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", key);
  const stored = await prisma.passkey.findFirstOrThrow({ where: { credentialId: key.id } });
  const res = await post(`/auth/passkeys/${stored.id}/remove`, { password: PASSWORD }, as("ben"));
  assert.equal(res.statusCode, 404);
  assert.equal(await prisma.passkey.count({ where: { id: stored.id } }), 1);
  const list = await app.inject({ method: "GET", url: "/auth/passkeys", ...as("ben") });
  assert.ok(!list.json().passkeys.some((p: { id: string }) => p.id === stored.id));
});

test("the public passkey routes are rate limited like the sign in route", async () => {
  const signIn = routeConfigs.get("POST /auth/login").rateLimit;
  assert.ok(signIn);
  for (const route of [
    "POST /auth/passkeys/login/options",
    "POST /auth/passkeys/login/verify",
    "POST /auth/passkeys/register/options",
    "POST /auth/passkeys/register/verify",
    "POST /auth/passkeys/:id/remove",
  ]) {
    assert.deepEqual(routeConfigs.get(route)?.rateLimit, signIn, route);
  }
});

test("a user who must set up a second step can do it with a passkey, and it satisfies the gate", async () => {
  await prisma.appConfig.update({ where: { key: "twoFactorRequired" }, data: { value: "all" } });
  try {
    await prisma.passkey.deleteMany({ where: { userId: "ben" } });
    assert.equal((await app.inject({ method: "GET", url: "/files", ...as("ben") })).statusCode, 403);
    const key = new VirtualAuthenticator("localhost", ORIGIN, "ben");
    const { res } = await register("ben", key);
    assert.equal(res.statusCode, 200, res.body);
    assert.notEqual((await app.inject({ method: "GET", url: "/files", ...as("ben") })).statusCode, 403);
    assert.equal((await post("/auth/passkeys/login/options", {}, as("ben"))).statusCode, 200);
    // Removing is not on the set up path.
    const stored = await prisma.passkey.findFirstOrThrow({ where: { credentialId: key.id } });
    assert.equal((await post(`/auth/passkeys/${stored.id}/remove`, { password: PASSWORD }, as("ben"))).statusCode, 200);
    assert.equal((await post(`/auth/passkeys/${stored.id}/remove`, { password: PASSWORD }, as("ben"))).statusCode, 403);
  } finally {
    await prisma.appConfig.update({ where: { key: "twoFactorRequired" }, data: { value: "off" } });
  }
});

test("deleting a user deletes the passkeys", async () => {
  await prisma.user.create({
    data: { id: "temp", firstName: "t", lastName: "t", username: "temp", email: "temp@example.test" },
  });
  await prisma.passkey.create({
    data: { userId: "temp", credentialId: "c-temp", publicKey: Buffer.from([1]), name: "x" },
  });
  await prisma.user.delete({ where: { id: "temp" } });
  assert.equal(await prisma.passkey.count({ where: { userId: "temp" } }), 0);
});

test("when passkeys cannot work (no https, not localhost) the routes say why and the config says so", async () => {
  const saved = process.env.APP_URL;
  process.env.APP_URL = "http://192.168.1.5:3400";
  try {
    const options = await post("/auth/passkeys/login/options", {});
    assert.equal(options.statusCode, 400);
    assert.match(options.json().error, /https/);
    assert.equal((await post("/auth/passkeys/register/options", { password: PASSWORD }, as("ann"))).statusCode, 400);
    assert.equal((await app.inject({ method: "GET", url: "/auth/config" })).json().passkeysAvailable, false);
    process.env.APP_URL = "https://files.example.com";
    assert.equal((await app.inject({ method: "GET", url: "/auth/config" })).json().passkeysAvailable, true);
  } finally {
    process.env.APP_URL = saved;
  }
});

test("garbage in the answer is a clean 400, not a crash", async () => {
  assert.equal((await post("/auth/passkeys/login/verify", {})).statusCode, 400);
  assert.equal((await post("/auth/passkeys/login/verify", { response: { id: "x" } })).statusCode, 400);
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  const answer = key.assert(await loginChallenge());
  answer.response.clientDataJSON = "!!!";
  assert.equal((await login(answer)).statusCode, 400);
});

const attemptsOf = async (userId: string) =>
  (await prisma.loginAttempt.findUnique({ where: { userId } }))?.attempts ?? 0;
const maxAttempts = async () =>
  Number((await prisma.appConfig.findUniqueOrThrow({ where: { key: "maxLoginAttempts" } })).value);

test("a wrong password for adding or removing a passkey counts as a failed sign in", async () => {
  await prisma.loginAttempt.deleteMany({});
  const wrong = await post("/auth/passkeys/register/options", { password: "nope nope nope" }, as("ann"));
  assert.equal(wrong.statusCode, 400);
  assert.equal(await attemptsOf("ann"), 1);
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", key);
  const stored = await prisma.passkey.findFirstOrThrow({ where: { credentialId: key.id } });
  await post(`/auth/passkeys/${stored.id}/remove`, { password: "nope nope nope" }, as("ann"));
  assert.equal(await attemptsOf("ann"), 2);
  await prisma.passkey.deleteMany({ where: { userId: "ann" } });
});

test("a stolen session cannot guess the password past the lockout, and the right one is refused while blocked", async () => {
  await prisma.loginAttempt.deleteMany({});
  const max = await maxAttempts();
  for (let i = 0; i < max; i++) {
    await post("/auth/passkeys/register/options", { password: "nope nope nope" }, as("ann"));
  }
  assert.equal(await attemptsOf("ann"), max);
  const before = await prisma.passkeyChallenge.count();
  const blocked = await post("/auth/passkeys/register/options", { password: PASSWORD }, as("ann"));
  assert.equal(blocked.statusCode, 400);
  assert.equal(await prisma.passkeyChallenge.count(), before);
  // A refused attempt while blocked neither counts nor renews the block.
  assert.equal(await attemptsOf("ann"), max);
  await prisma.loginAttempt.deleteMany({});
});

test("a right password does not wipe the failures: only a real sign in does", async () => {
  await prisma.loginAttempt.deleteMany({});
  await prisma.loginAttempt.create({ data: { userId: "ann", attempts: 2, lastAttempt: new Date() } });
  assert.equal((await post("/auth/passkeys/register/options", { password: PASSWORD }, as("ann"))).statusCode, 200);
  assert.equal(await attemptsOf("ann"), 2);
  await prisma.loginAttempt.deleteMany({});
});

test("a blocked account's failed passkey sign in does not count again or renew the block", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", key);
  const max = await maxAttempts();
  const long = new Date(Date.now() - 60_000);
  await prisma.loginAttempt.deleteMany({});
  await prisma.loginAttempt.create({ data: { userId: "ann", attempts: max, lastAttempt: long } });
  assert.equal((await login(key.assert(await loginChallenge()))).statusCode, 400);
  const after = await prisma.loginAttempt.findUniqueOrThrow({ where: { userId: "ann" } });
  assert.equal(after.attempts, max);
  assert.equal(after.lastAttempt.getTime(), long.getTime());
  await prisma.loginAttempt.deleteMany({});
  await prisma.passkey.deleteMany({ where: { userId: "ann" } });
});

test("with password sign in switched off passkeys are refused with the generic answer and reported unavailable", async () => {
  const key = new VirtualAuthenticator("localhost", ORIGIN, "ann");
  await register("ann", key);
  await prisma.appConfig.update({ where: { key: "passwordAuthEnabled" }, data: { value: "false" } });
  try {
    const config = await app.inject({ method: "GET", url: "/auth/config" });
    assert.equal(config.json().passkeysAvailable, false);
    const options = await post("/auth/passkeys/login/options", {});
    assert.equal(options.statusCode, 400);
    const res = await post("/auth/passkeys/login/verify", { response: key.assert("x") });
    assert.equal(res.statusCode, 400);
    assert.equal(res.cookies.length, 0);
  } finally {
    await prisma.appConfig.update({ where: { key: "passwordAuthEnabled" }, data: { value: "true" } });
  }
  assert.equal((await app.inject({ method: "GET", url: "/auth/config" })).json().passkeysAvailable, true);
  assert.equal((await login(key.assert(await loginChallenge()))).statusCode, 200);
  await prisma.passkey.deleteMany({ where: { userId: "ann" } });
});
