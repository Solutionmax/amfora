import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";
import { hashVerifier, limitError, maxCiphertextLength, secretSettings, secretStatus, verifierMatches } from "./secret";

const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { registerRoutes } = await import("../../routes");

  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyRateLimit, { global: true, max: 10_000, timeWindow: "1 minute" });
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  for (const id of ["alice", "bob", "root"]) {
    await prisma.user.create({
      data: { id, firstName: id, lastName: "Test", username: id, email: `${id}@example.test`, isAdmin: id === "root" },
    });
  }
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const session = (userId: string) => ({ token: app.jwt.sign({ userId, isAdmin: false }) });
const PROOF = "p".repeat(43);
const VERIFIER = "v".repeat(43);
const body = (extra: object = {}) => ({
  ciphertext: "c2VhbGVk",
  proof: PROOF,
  verifier: VERIFIER,
  hasPassphrase: false,
  expiresInHours: 24,
  maxOpens: 1,
  ...extra,
});

async function create(extra: object = {}, userId = "alice") {
  const response = await app.inject({
    method: "POST",
    url: "/secrets",
    cookies: session(userId),
    payload: body(extra),
  });
  assert.equal(response.statusCode, 201, response.body);
  return (response.json() as { id: string }).id;
}

// Opening is rate limited per address; every call here comes from its own, so the tests
// exercise the secret's own rules and not the limiter.
let caller = 0;
const open = (id: string, verifier = VERIFIER, proof = PROOF) =>
  app.inject({
    method: "POST",
    url: `/secrets/${id}/open`,
    payload: { proof, verifier },
    remoteAddress: `10.0.${Math.floor(++caller / 250)}.${caller % 250}`,
  });
const status = (id: string) => app.inject({ method: "GET", url: `/secrets/${id}/status` });
const setConfig = (key: string, value: string) => prisma.appConfig.update({ where: { key }, data: { value } });

test("settings fall back to defaults, anonymous is off unless switched on", () => {
  const defaults = secretSettings([]);
  assert.equal(defaults.anonymousEnabled, false);
  assert.deepEqual(defaults.anonymous, { maxHours: 168, maxOpens: 3, maxLength: 5000 });
  assert.equal(defaults.signedIn.maxHours, 720);
  const custom = secretSettings([
    { key: "secretsAnonymousEnabled", value: "true" },
    { key: "secretsAnonymousMaxDays", value: "0" },
    { key: "secretsMaxOpens", value: "abc" },
  ]);
  assert.equal(custom.anonymousEnabled, true);
  assert.equal(custom.anonymous.maxHours, 168, "a setting below one is ignored");
  assert.equal(custom.signedIn.maxOpens, 10);
});

test("status and limits", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const base = { opens: 0, maxOpens: 2, failedAttempts: 0, expiresAt: new Date("2026-01-02T00:00:00Z") };
  assert.equal(secretStatus(base, now), "waiting");
  assert.equal(secretStatus({ ...base, opens: 2 }, now), "used");
  assert.equal(secretStatus({ ...base, expiresAt: now }, now), "expired");
  assert.equal(secretStatus({ ...base, failedAttempts: 3 }, now), "burned");

  const limits = { maxHours: 24, maxOpens: 3, maxLength: 10 };
  assert.equal(limitError({ ciphertext: "a", expiresInHours: 24, maxOpens: 3 }, limits), null);
  assert.match(limitError({ ciphertext: "a", expiresInHours: 25, maxOpens: 1 }, limits)!, /1 days/);
  assert.match(limitError({ ciphertext: "a", expiresInHours: 1, maxOpens: 4 }, limits)!, /3 times/);
  const tooLong = "a".repeat(maxCiphertextLength(10) + 1);
  assert.match(limitError({ ciphertext: tooLong, expiresInHours: 1, maxOpens: 1 }, limits)!, /10 characters/);

  assert.equal(verifierMatches("right", hashVerifier("right")), true);
  assert.equal(verifierMatches("wrong", hashVerifier("right")), false);
});

test("a secret opens once and is then gone, also for its maker", async () => {
  const id = await create({ label: "Database password" });

  const before = await status(id);
  assert.deepEqual(before.json(), { hasPassphrase: false, opensLeft: 1 });
  assert.equal((await status(id)).statusCode, 200, "looking does not open");

  const first = await open(id);
  assert.equal(first.statusCode, 200, first.body);
  assert.deepEqual(first.json(), { ciphertext: "c2VhbGVk", opensLeft: 0 });
  assert.equal((await open(id)).statusCode, 404);
  assert.equal((await status(id)).statusCode, 404);

  const row = await prisma.secret.findUnique({ where: { id } });
  assert.equal(row?.ciphertext, null, "the sealed text is deleted, the record stays");

  const list = await app.inject({ method: "GET", url: "/secrets", cookies: session("alice") });
  const mine = (list.json() as { secrets: Array<Record<string, unknown>> }).secrets.find((s) => s.id === id);
  assert.equal(mine?.status, "used");
  assert.equal(mine?.opens, 1);
  assert.equal(mine?.label, "Database password");
  assert.equal("ciphertext" in mine!, false);
});

test("several openings count down", async () => {
  const id = await create({ maxOpens: 3 });
  assert.equal((await open(id)).json().opensLeft, 2);
  assert.equal((await status(id)).json().opensLeft, 2);
  assert.equal((await open(id)).json().opensLeft, 1);
  assert.equal((await open(id)).json().opensLeft, 0);
  assert.equal((await open(id)).statusCode, 404);
});

test("readers at the same moment cannot take more than the allowed openings", async () => {
  const id = await create({ maxOpens: 2 });
  const results = await Promise.all(Array.from({ length: 8 }, () => open(id)));
  assert.equal(results.filter((r) => r.statusCode === 200).length, 2);
  assert.equal((await prisma.secret.findUnique({ where: { id } }))?.opens, 2);
});

test("a wrong link costs nothing, three wrong passphrases destroy the secret", async () => {
  const plain = await create();
  assert.equal((await open(plain, VERIFIER, "x".repeat(43))).statusCode, 404);
  assert.equal((await open(plain)).statusCode, 200, "the real link still works");

  const guarded = await create({ hasPassphrase: true });
  const one = await open(guarded, "wrong-1");
  assert.equal(one.statusCode, 403);
  assert.equal(one.json().attemptsLeft, 2);
  assert.equal((await open(guarded, "wrong-2")).json().attemptsLeft, 1);
  assert.equal((await open(guarded, "wrong-3")).statusCode, 404);
  assert.equal((await open(guarded)).statusCode, 404, "even the right passphrase is too late");
  assert.equal((await prisma.secret.findUnique({ where: { id: guarded } }))?.ciphertext, null);
});

test("knowing only the id cannot burn a passphrase secret", async () => {
  const id = await create({ hasPassphrase: true });
  for (let i = 0; i < 5; i++) assert.equal((await open(id, "guess", "not-the-link")).statusCode, 404);
  assert.equal((await prisma.secret.findUnique({ where: { id } }))?.failedAttempts, 0);
  assert.equal((await open(id)).statusCode, 200, "the real reader still gets in");
});

test("wrong passphrases sent at the same moment get three tries, not more", async () => {
  const id = await create({ hasPassphrase: true });
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => open(id, `guess-${i}`)));
  assert.equal(results.filter((r) => r.statusCode === 403).length <= 2, true);
  assert.equal(
    results.every((r) => r.statusCode === 403 || r.statusCode === 404),
    true
  );
  assert.equal((await open(id)).statusCode, 404);
  assert.equal((await prisma.secret.findUnique({ where: { id } }))?.ciphertext, null);
});

test("the right passphrase after a wrong one does not use up a try", async () => {
  const id = await create({ hasPassphrase: true, maxOpens: 3 });
  assert.equal((await open(id, "wrong")).json().attemptsLeft, 2);
  assert.equal((await open(id)).statusCode, 200);
  assert.equal((await open(id)).statusCode, 200);
  assert.equal((await prisma.secret.findUnique({ where: { id } }))?.failedAttempts, 1);
});

test("an expired secret cannot be opened and loses its text", async () => {
  const id = await create();
  await prisma.secret.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await status(id)).statusCode, 404);
  assert.equal((await prisma.secret.findUnique({ where: { id } }))?.ciphertext, null, "a visit is enough to drop it");
  assert.equal((await open(id)).statusCode, 404);
});

test("opening is rate limited per address", async () => {
  const id = await create({ hasPassphrase: true, maxOpens: 1 });
  const hammer = () =>
    app.inject({
      method: "POST",
      url: `/secrets/${id}/open`,
      payload: { proof: "", verifier: "" },
      remoteAddress: "10.9.9.9",
    });
  const codes = [];
  for (let i = 0; i < 12; i++) codes.push((await hammer()).statusCode);
  assert.equal(codes.includes(429), true);
  assert.equal((await status(id)).statusCode, 200, "requests that fail validation do not burn the secret");
});

test("only the maker lists and deletes, and a session is required", async () => {
  const id = await create();
  assert.equal((await app.inject({ method: "GET", url: "/secrets" })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/secrets", payload: body() })).statusCode, 401);

  const bobs = await app.inject({ method: "GET", url: "/secrets", cookies: session("bob") });
  assert.equal((bobs.json() as { secrets: unknown[] }).secrets.length, 0);
  const stolen = await app.inject({ method: "DELETE", url: `/secrets/${id}`, cookies: session("bob") });
  assert.equal(stolen.statusCode, 404);

  const removed = await app.inject({ method: "DELETE", url: `/secrets/${id}`, cookies: session("alice") });
  assert.equal(removed.statusCode, 200);
  assert.equal((await open(id)).statusCode, 404);
});

test("limits for signed-in users are enforced", async () => {
  const tooLong = await app.inject({
    method: "POST",
    url: "/secrets",
    cookies: session("alice"),
    payload: body({ expiresInHours: 31 * 24 }),
  });
  assert.equal(tooLong.statusCode, 400);
  const tooMany = await app.inject({
    method: "POST",
    url: "/secrets",
    cookies: session("alice"),
    payload: body({ maxOpens: 11 }),
  });
  assert.equal(tooMany.statusCode, 400);
  const badText = await app.inject({
    method: "POST",
    url: "/secrets",
    cookies: session("alice"),
    payload: body({ ciphertext: "not base64url!" }),
  });
  assert.equal(badText.statusCode, 400);
});

test("anonymous secrets: off by default, tighter limits, rate limited, no record kept", async () => {
  const anonymous = (extra: object = {}) =>
    app.inject({ method: "POST", url: "/secrets/anonymous", payload: body(extra) });

  assert.equal((await anonymous()).statusCode, 403);
  const limitsOff = await app.inject({ method: "GET", url: "/secrets/limits" });
  assert.equal(limitsOff.json().anonymousEnabled, false);

  await setConfig("secretsAnonymousEnabled", "true");
  await setConfig("secretsAnonymousPerHour", "4");
  assert.equal((await app.inject({ method: "GET", url: "/secrets/limits" })).json().anonymousEnabled, true);

  assert.equal((await anonymous({ expiresInHours: 8 * 24 })).statusCode, 400, "longer than 7 days");
  assert.equal((await anonymous({ maxOpens: 4 })).statusCode, 400, "more than 3 openings");

  const made = await anonymous({ label: "ignored" });
  assert.equal(made.statusCode, 201, made.body);
  const id = made.json().id as string;
  const row = await prisma.secret.findUnique({ where: { id } });
  assert.equal(row?.creatorId, null);
  assert.equal(row?.label, null, "an anonymous secret carries no label");

  assert.equal((await open(id)).statusCode, 200);
  await status(id);
  assert.equal(await prisma.secret.findUnique({ where: { id } }), null, "a spent anonymous secret is forgotten");

  // Four requests were counted (one refused while off, two over the limits, one made).
  assert.equal((await anonymous()).statusCode, 429);
});

test("the count of ownerless secrets is for administrators, and is only a number", async () => {
  const stats = (userId?: string) =>
    app.inject({ method: "GET", url: "/secrets/stats", cookies: userId ? session(userId) : undefined });
  assert.equal((await stats()).statusCode, 401);
  assert.equal((await stats("alice")).statusCode, 403);

  const before = (await stats("root")).json().anonymousWaiting as number;
  await prisma.secret.create({
    data: {
      id: "stats-test",
      ciphertext: "AAAA",
      proofHash: "x",
      verifierHash: "y",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  assert.deepEqual((await stats("root")).json(), { anonymousWaiting: before + 1 });
});

test("an API key lists and makes secrets with full access, reads with read access, never the count", async () => {
  const key = async (userId: string, scope: string) => {
    const made = await app.inject({
      method: "POST",
      url: "/api-keys",
      cookies: session(userId),
      payload: { name: scope, scope },
    });
    return { authorization: `Bearer ${made.json().token}` };
  };
  const read = await key("alice", "read");
  const full = await key("alice", "full");
  const adminFull = await key("root", "full");

  assert.equal((await app.inject({ method: "GET", url: "/secrets", headers: read })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: "/secrets/limits", headers: read })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: "/secrets", headers: read, payload: body() })).statusCode, 403);

  const made = await app.inject({ method: "POST", url: "/secrets", headers: full, payload: body({ label: "by key" }) });
  assert.equal(made.statusCode, 201, made.body);
  const id = made.json().id as string;
  assert.equal((await prisma.secret.findUnique({ where: { id } }))?.creatorId, "alice");
  assert.equal((await app.inject({ method: "DELETE", url: `/secrets/${id}`, headers: read })).statusCode, 403);
  assert.equal((await app.inject({ method: "DELETE", url: `/secrets/${id}`, headers: full })).statusCode, 200);

  assert.equal((await app.inject({ method: "GET", url: "/secrets/stats", headers: adminFull })).statusCode, 403);
});
