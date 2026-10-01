import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";
import { extractApiKey, generateApiKey, hashApiKey, isRouteAllowed, READ_ROUTES } from "./key";

// The whole route surface against a throwaway database, so the scope rules are tested on
// the routes that really exist.
const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
const registered = new Set<string>();

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { registerRoutes } = await import("../../routes");

  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook("onRoute", (route) => {
    for (const method of [route.method].flat()) registered.add(`${method} ${route.url}`);
  });
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  app.decorateRequest("jwtSign", function (this: any, payload: object) {
    return this.server.jwt.sign(payload);
  });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  for (const id of ["alice", "bob", "gone"]) {
    await prisma.user.create({
      data: {
        id,
        firstName: id,
        lastName: "Test",
        username: id,
        email: `${id}@example.test`,
        isAdmin: id === "alice",
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

const session = (userId: string) => ({ token: app.jwt.sign({ userId, isAdmin: userId === "alice" }) });
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

async function createKey(userId: string, scope: "read" | "full", expiresInDays?: number) {
  const response = await app.inject({
    method: "POST",
    url: "/api-keys",
    cookies: session(userId),
    payload: { name: `${userId} ${scope}`, scope, expiresInDays },
  });
  assert.equal(response.statusCode, 201, response.body);
  return response.json() as { token: string; apiKey: { id: string; scope: string; prefix: string } };
}

test("a key is found in either header, a session token is left alone", () => {
  assert.equal(extractApiKey({ authorization: "Bearer amf_abc" }), "amf_abc");
  assert.equal(extractApiKey({ "x-api-key": " amf_abc " }), "amf_abc");
  assert.equal(extractApiKey({ authorization: "Bearer eyJhbGciOi.session.token" }), null);
  assert.equal(extractApiKey({ authorization: `Bearer amf_${"x".repeat(300)}` }), null);
  assert.equal(extractApiKey({}), null);
});

test("scope rules: read is a fixed list, full stays inside files and links", () => {
  assert.equal(isRouteAllowed("read", "GET", "/reverse-shares"), true);
  assert.equal(isRouteAllowed("read", "HEAD", "/reverse-shares"), true);
  assert.equal(isRouteAllowed("read", "POST", "/reverse-shares"), false);
  // GET, but it hands out an upload URL.
  assert.equal(isRouteAllowed("read", "GET", "/files/presigned-url"), false);
  assert.equal(isRouteAllowed("full", "GET", "/files/presigned-url"), true);
  assert.equal(isRouteAllowed("full", "POST", "/reverse-shares"), true);
  for (const route of ["/api-keys", "/users", "/auth/login", "/app/configs", "/filesystem", "/auth/2fa/disable"]) {
    assert.equal(isRouteAllowed("full", "POST", route), false, route);
    assert.equal(isRouteAllowed("full", "GET", route), false, route);
  }
  assert.equal(isRouteAllowed("anything else", "POST", "/reverse-shares"), false);
  assert.equal(isRouteAllowed("full", "GET", undefined), false);
});

test("every route a read key may call still exists", () => {
  for (const route of READ_ROUTES) assert.ok(registered.has(route), `${route} is not a registered route`);
});

test("only the hash of a key is stored, and the key is shown once", async () => {
  const { token, apiKey } = await createKey("alice", "read");
  assert.match(token, /^amf_[A-Za-z0-9_-]{43}$/);
  assert.equal(apiKey.prefix, token.slice(0, 12));

  const row = await prisma.apiKey.findUniqueOrThrow({ where: { id: apiKey.id } });
  assert.equal(row.hash, hashApiKey(token));
  assert.ok(!JSON.stringify(row).includes(token));

  const list = await app.inject({ method: "GET", url: "/api-keys", cookies: session("alice") });
  assert.equal(list.statusCode, 200);
  assert.ok(!list.body.includes(token));
  assert.ok(!list.body.includes(row.hash));
});

test("a read key reads and stays read only", async () => {
  const { token, apiKey } = await createKey("alice", "read");
  assert.equal(apiKey.scope, "read");

  const me = await app.inject({ method: "GET", url: "/auth/me", headers: bearer(token) });
  assert.equal(me.json().user.id, "alice");

  const list = await app.inject({ method: "GET", url: "/reverse-shares", headers: { "x-api-key": token } });
  assert.equal(list.statusCode, 200, list.body);

  const create = await app.inject({
    method: "POST",
    url: "/reverse-shares",
    headers: bearer(token),
    payload: { name: "Should not exist" },
  });
  assert.equal(create.statusCode, 403);
  assert.equal(await prisma.reverseShare.count(), 0);

  const upload = await app.inject({
    method: "GET",
    url: "/files/presigned-url?filename=a&extension=txt",
    headers: bearer(token),
  });
  assert.equal(upload.statusCode, 403);
});

test("a full key creates a receive link as its owner, without admin rights", async () => {
  const { token } = await createKey("alice", "full");

  const create = await app.inject({
    method: "POST",
    url: "/reverse-shares",
    headers: bearer(token),
    payload: { name: "Ticket 42" },
  });
  assert.equal(create.statusCode, 201, create.body);
  const row = await prisma.reverseShare.findUniqueOrThrow({ where: { id: create.json().reverseShare.id } });
  assert.equal(row.creatorId, "alice");

  // alice is an administrator, her key is not.
  for (const url of ["/users", "/app/configs", "/api-keys"]) {
    const response = await app.inject({ method: "GET", url, headers: bearer(token) });
    assert.equal(response.statusCode, 403, `${url} answered ${response.statusCode}`);
  }
  const mint = await app.inject({
    method: "POST",
    url: "/api-keys",
    headers: bearer(token),
    payload: { name: "second", scope: "full" },
  });
  assert.equal(mint.statusCode, 403);
});

test("an administrator's full key gets no host figures and no trailing slash trick", async () => {
  const { token } = await createKey("alice", "full");
  for (const url of ["/storage/disk-space", "/storage/check-upload?fileSize=1", "/users/", "/api-keys/"]) {
    const response = await app.inject({ method: "GET", url, headers: bearer(token) });
    assert.equal(response.statusCode, 403, `${url} answered ${response.statusCode}`);
  }
  const head = await app.inject({ method: "HEAD", url: "/users", headers: bearer(token) });
  assert.equal(head.statusCode, 403);

  const folder = await app.inject({
    method: "POST",
    url: "/folders/",
    headers: bearer(token),
    payload: { name: "From a key", objectName: "alice/From a key" },
  });
  assert.equal(folder.statusCode, 201, folder.body);
  assert.equal((await prisma.folder.findFirstOrThrow({ where: { name: "From a key" } })).userId, "alice");
});

test("a session token in the Authorization header still works as before", async () => {
  const me = await app.inject({ method: "GET", url: "/auth/me", headers: bearer(session("bob").token) });
  assert.equal(me.json().user.id, "bob");
  const keys = await app.inject({ method: "GET", url: "/api-keys", headers: bearer(session("bob").token) });
  assert.equal(keys.statusCode, 200);
});

test("the key decides who the caller is, not a cookie sent along", async () => {
  const { token } = await createKey("bob", "read");
  const me = await app.inject({ method: "GET", url: "/auth/me", headers: bearer(token), cookies: session("alice") });
  assert.equal(me.json().user.id, "bob");
});

test("unknown, expired, deleted and deactivated keys are refused", async () => {
  const unknown = await app.inject({ method: "GET", url: "/reverse-shares", headers: bearer(generateApiKey().token) });
  assert.equal(unknown.statusCode, 401);

  const expired = await createKey("bob", "read", 1);
  await prisma.apiKey.update({ where: { id: expired.apiKey.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const afterExpiry = await app.inject({ method: "GET", url: "/reverse-shares", headers: bearer(expired.token) });
  assert.equal(afterExpiry.statusCode, 401);

  const removed = await createKey("bob", "read");
  const notYours = await app.inject({
    method: "DELETE",
    url: `/api-keys/${removed.apiKey.id}`,
    cookies: session("alice"),
  });
  assert.equal(notYours.statusCode, 404);
  const yours = await app.inject({ method: "DELETE", url: `/api-keys/${removed.apiKey.id}`, cookies: session("bob") });
  assert.equal(yours.statusCode, 200);
  const afterRemoval = await app.inject({ method: "GET", url: "/reverse-shares", headers: bearer(removed.token) });
  assert.equal(afterRemoval.statusCode, 401);

  const orphan = generateApiKey();
  await prisma.apiKey.create({
    data: { name: "x", scope: "full", hash: orphan.hash, prefix: orphan.prefix, userId: "gone" },
  });
  const inactive = await app.inject({ method: "GET", url: "/reverse-shares", headers: bearer(orphan.token) });
  assert.equal(inactive.statusCode, 401);
});

test("managing keys needs a session, and bad input is rejected", async () => {
  assert.equal((await app.inject({ method: "GET", url: "/api-keys" })).statusCode, 401);
  const badScope = await app.inject({
    method: "POST",
    url: "/api-keys",
    cookies: session("alice"),
    payload: { name: "x", scope: "admin" },
  });
  assert.equal(badScope.statusCode, 400);
  const noName = await app.inject({
    method: "POST",
    url: "/api-keys",
    cookies: session("alice"),
    payload: { name: "   ", scope: "read" },
  });
  assert.equal(noName.statusCode, 400);
});
