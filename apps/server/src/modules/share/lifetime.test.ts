import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
const DAY = 24 * 60 * 60 * 1000;

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { registerRoutes } = await import("../../routes");

  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  app.decorateRequest("jwtSign", function (this: any, payload: object) {
    return this.server.jwt.sign(payload);
  });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  await prisma.user.create({
    data: { id: "alice", firstName: "Alice", lastName: "T", username: "alice", email: "alice@example.test" },
  });
  await prisma.file.create({
    data: { id: "f1", name: "a", extension: "txt", size: BigInt(1), objectName: "o", userId: "alice" },
  });
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const setMax = (days: number) =>
  prisma.appConfig.update({ where: { key: "shareMaxExpiryDays" }, data: { value: String(days) } });
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const asSession = () => ({ cookies: { token: app.jwt.sign({ userId: "alice", isAdmin: false }) } });

async function apiKeyHeader() {
  const created = await app.inject({
    method: "POST",
    url: "/api-keys",
    ...asSession(),
    payload: { name: "ci", scope: "full" },
  });
  assert.equal(created.statusCode, 201, created.body);
  return { authorization: `Bearer ${created.json().token}` };
}

const newShare = (auth: object, expiration?: string) =>
  app.inject({ method: "POST", url: "/shares", ...auth, payload: { name: "s", files: ["f1"], expiration } });
const newLink = (auth: object, expiration?: string) =>
  app.inject({ method: "POST", url: "/reverse-shares", ...auth, payload: { name: "r", expiration } });

test("without a maximum nothing changes", async () => {
  assert.equal((await newShare(asSession())).statusCode, 201);
  assert.equal((await newShare(asSession(), inDays(900))).statusCode, 201);
  assert.equal((await newLink(asSession())).statusCode, 201);
});

test("a share past the maximum, or without end date, is refused; at the maximum it is allowed", async () => {
  await setMax(30);
  const past = await newShare(asSession(), inDays(31));
  assert.equal(past.statusCode, 400);
  assert.match(past.json().error, /30 days/);
  assert.equal((await newShare(asSession())).statusCode, 400);
  assert.equal((await newShare(asSession(), inDays(30))).statusCode, 201);
  assert.equal((await newShare(asSession(), inDays(5))).statusCode, 201);
});

test("a receive link follows the same rule", async () => {
  await setMax(30);
  assert.equal((await newLink(asSession(), inDays(31))).statusCode, 400);
  assert.equal((await newLink(asSession())).statusCode, 400);
  assert.equal((await newLink(asSession(), inDays(30))).statusCode, 201);
});

test("the same rule holds for an API key", async () => {
  await setMax(30);
  const key = await apiKeyHeader();
  assert.equal((await newShare({ headers: key }, inDays(60))).statusCode, 400);
  assert.equal((await newLink({ headers: key }, inDays(60))).statusCode, 400);
  assert.equal((await newShare({ headers: key }, inDays(10))).statusCode, 201);
});

test("a share that runs longer already can be renamed, but not stretched or made endless", async () => {
  await setMax(0);
  const made = await newShare(asSession(), inDays(90));
  const share = made.json().share ?? made.json();
  const expiration = share.expiration as string;
  await setMax(30);

  const put = (payload: object) => app.inject({ method: "PUT", url: "/shares", ...asSession(), payload });
  const renamed = await put({ id: share.id, name: "new name", expiration });
  assert.equal(renamed.statusCode, 200, renamed.body);
  assert.equal((await put({ id: share.id, name: "x", expiration: inDays(120) })).statusCode, 400);
  assert.equal((await put({ id: share.id, name: "x" })).statusCode, 200, "a missing end date is left alone");
  assert.equal((await put({ id: share.id, expiration: null })).statusCode, 400);
  assert.equal((await put({ id: share.id, expiration: inDays(10) })).statusCode, 200);
});

test("a receive link that runs longer already can be renamed, but not stretched", async () => {
  await setMax(0);
  const made = await newLink(asSession(), inDays(90));
  const link = made.json().reverseShare ?? made.json();
  await setMax(30);

  const put = (payload: object) => app.inject({ method: "PUT", url: "/reverse-shares", ...asSession(), payload });
  assert.equal((await put({ id: link.id, name: "new name" })).statusCode, 200);
  assert.equal((await put({ id: link.id, expiration: inDays(120) })).statusCode, 400);
  assert.equal((await put({ id: link.id, expiration: inDays(10) })).statusCode, 200);
});

const putShare = (auth: object, payload: object) => app.inject({ method: "PUT", url: "/shares", ...auth, payload });
const putLink = (auth: object, payload: object) =>
  app.inject({ method: "PUT", url: "/reverse-shares", ...auth, payload });
const created = (res: { json: () => any }) => {
  const body = res.json();
  return body.share ?? body.reverseShare ?? body;
};

test("a share update without an end date leaves the end date alone, also past the maximum", async () => {
  await setMax(0);
  const share = created(await newShare(asSession(), inDays(90)));
  await setMax(30);
  const renamed = await putShare(asSession(), { id: share.id, name: "only a new name" });
  assert.equal(renamed.statusCode, 200, renamed.body);
  assert.equal(renamed.json().share.expiration, share.expiration);
  assert.equal(renamed.json().share.name, "only a new name");
});

test("a null end date clears it when there is no maximum, and is refused when there is one", async () => {
  await setMax(0);
  const share = created(await newShare(asSession(), inDays(20)));
  const cleared = await putShare(asSession(), { id: share.id, expiration: null });
  assert.equal(cleared.statusCode, 200, cleared.body);
  assert.equal(cleared.json().share.expiration, null);

  const other = created(await newShare(asSession(), inDays(20)));
  await setMax(30);
  const refused = await putShare(asSession(), { id: other.id, expiration: null });
  assert.equal(refused.statusCode, 400);
  const still = await prisma.share.findUnique({ where: { id: other.id } });
  assert.equal(still!.expiration?.toISOString(), other.expiration);
});

test("a receive link follows the same rule for a missing and a null end date", async () => {
  await setMax(0);
  const link = created(await newLink(asSession(), inDays(20)));
  const cleared = await putLink(asSession(), { id: link.id, expiration: null });
  assert.equal(cleared.statusCode, 200, cleared.body);
  assert.equal(cleared.json().reverseShare.expiration, null);

  const other = created(await newLink(asSession(), inDays(20)));
  await setMax(30);
  assert.equal((await putLink(asSession(), { id: other.id, expiration: null })).statusCode, 400);
  const renamed = await putLink(asSession(), { id: other.id, name: "kept" });
  assert.equal(renamed.statusCode, 200, renamed.body);
  assert.equal(renamed.json().reverseShare.expiration, other.expiration);
});

test("a refused share update changes nothing: password and recipients stay as they were", async () => {
  await setMax(0);
  const share = created(
    await app.inject({
      method: "POST",
      url: "/shares",
      ...asSession(),
      payload: { name: "s", files: ["f1"], expiration: inDays(10), password: "old-password", recipients: ["a@x.test"] },
    })
  );
  await setMax(30);
  const refused = await putShare(asSession(), {
    id: share.id,
    expiration: inDays(200),
    password: "new-password",
    maxViews: 3,
    recipients: ["b@x.test"],
  });
  assert.equal(refused.statusCode, 400);

  const stored = await prisma.share.findUnique({
    where: { id: share.id },
    include: { security: true, recipients: true },
  });
  const bcrypt = (await import("bcryptjs")).default;
  assert.equal(await bcrypt.compare("old-password", stored!.security.password!), true);
  assert.equal(stored!.security.maxViews, null);
  assert.deepEqual(
    stored!.recipients.map((r) => r.email),
    ["a@x.test"]
  );
});

test("a share can be shortened below its current end date even when still past the maximum", async () => {
  await setMax(0);
  const share = created(await newShare(asSession(), inDays(400)));
  await setMax(30);
  assert.equal((await putShare(asSession(), { id: share.id, expiration: inDays(300) })).statusCode, 200);
  assert.equal((await putShare(asSession(), { id: share.id, expiration: inDays(350) })).statusCode, 400);
});

test("an API key update of a share follows the lifetime rule too", async () => {
  await setMax(0);
  const share = created(await newShare(asSession(), inDays(20)));
  await setMax(30);
  const key = { headers: await apiKeyHeader() };
  assert.equal((await putShare(key, { id: share.id, expiration: inDays(90) })).statusCode, 400);
  assert.equal((await putShare(key, { id: share.id, expiration: null })).statusCode, 400);
  assert.equal((await putShare(key, { id: share.id, name: "renamed by key" })).statusCode, 200);
  assert.equal((await putShare(key, { id: share.id, expiration: inDays(10) })).statusCode, 200);
});
