import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";
import { SETUP_PATH } from "./second-step";

const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;

const setRequirement = (value: string) =>
  prisma.appConfig.update({ where: { key: "twoFactorRequired" }, data: { value } });
const as = (userId: string, extra: object = {}) => ({
  cookies: { token: app.jwt.sign({ userId, isAdmin: userId === "admin", ...extra }) },
});

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

  for (const id of ["admin", "member", "totp", "keyholder", "passkeyuser"]) {
    await prisma.user.create({
      data: {
        id,
        firstName: id,
        lastName: "Test",
        username: id,
        email: `${id}@example.test`,
        isAdmin: id === "admin",
        twoFactorEnabled: id === "totp",
        twoFactorSecret: id === "totp" ? "JBSWY3DPEHPK3PXP" : null,
      },
    });
  }
  await prisma.passkey.create({
    data: { userId: "passkeyuser", credentialId: "cred-1", publicKey: Buffer.from([1, 2, 3]), name: "Key" },
  });
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const BLOCKED = [
  ["GET", "/files"],
  ["GET", "/folders"],
  ["GET", "/shares/me"],
  ["GET", "/reverse-shares"],
  ["GET", "/secrets"],
  ["GET", "/users"],
  ["GET", "/app/configs"],
  ["PATCH", "/app/configs"],
  ["GET", "/api-keys"],
  ["POST", "/api-keys"],
  ["GET", "/activity"],
  ["GET", "/trash"],
  ["GET", "/auth/trusted-devices"],
  ["POST", "/auth/2fa/disable"],
  ["POST", "/auth/2fa/backup-codes"],
] as const;

const ALLOWED = [
  ["GET", "/auth/me"],
  ["POST", "/auth/logout"],
  ["GET", "/auth/config"],
  ["GET", "/app/configs/public"],
  ["GET", "/auth/2fa/status"],
  ["POST", "/auth/2fa/setup"],
] as const;

const call = (method: string, url: string, auth: object) =>
  app.inject({ method: method as "GET", url, ...auth, payload: method === "GET" ? undefined : {} });

test("with the requirement off nobody is held back", async () => {
  await setRequirement("off");
  for (const [method, url] of BLOCKED) {
    const res = await call(method, url, as("member"));
    assert.notEqual(res.json()?.code, "TWO_FACTOR_SETUP_REQUIRED", `${method} ${url}`);
  }
});

test("for everyone: a user without a second step is refused everywhere but the set up path", async () => {
  await setRequirement("all");
  for (const [method, url] of BLOCKED) {
    const res = await call(method, url, as("member"));
    assert.equal(res.statusCode, 403, `${method} ${url} answered ${res.statusCode}`);
    assert.equal(res.json().code, "TWO_FACTOR_SETUP_REQUIRED", `${method} ${url}`);
  }
  for (const [method, url] of ALLOWED) {
    const res = await call(method, url, as("member"));
    assert.notEqual(res.json()?.code, "TWO_FACTOR_SETUP_REQUIRED", `${method} ${url}`);
    assert.ok(res.statusCode < 400, `${method} ${url} answered ${res.statusCode}`);
  }
});

test("the administrator is held to it too, and the set up path stays open for them", async () => {
  await setRequirement("all");
  assert.equal((await call("GET", "/users", as("admin"))).json().code, "TWO_FACTOR_SETUP_REQUIRED");
  assert.equal((await call("POST", "/auth/2fa/setup", as("admin"))).statusCode, 200);
});

test("for administrators only: members carry on, administrators are held", async () => {
  await setRequirement("admins");
  assert.notEqual((await call("GET", "/files", as("member"))).json()?.code, "TWO_FACTOR_SETUP_REQUIRED");
  assert.equal((await call("GET", "/files", as("admin"))).json().code, "TWO_FACTOR_SETUP_REQUIRED");
});

test("two step sign in or a passkey satisfies it", async () => {
  await setRequirement("all");
  assert.notEqual((await call("GET", "/files", as("totp"))).json()?.code, "TWO_FACTOR_SETUP_REQUIRED");
  assert.notEqual((await call("GET", "/files", as("passkeyuser"))).json()?.code, "TWO_FACTOR_SETUP_REQUIRED");
});

test("a session that came through an external provider is exempt", async () => {
  await setRequirement("all");
  const res = await call("GET", "/files", as("member", { viaProvider: true }));
  assert.notEqual(res.json()?.code, "TWO_FACTOR_SETUP_REQUIRED");
});

test("an API key keeps working, a session token sent as bearer does not", async () => {
  await setRequirement("off");
  const created = await app.inject({
    method: "POST",
    url: "/api-keys",
    ...as("keyholder"),
    payload: { name: "k", scope: "full" },
  });
  assert.equal(created.statusCode, 201, created.body);
  const token = created.json().token as string;
  await setRequirement("all");
  const viaKey = await app.inject({ method: "GET", url: "/files", headers: { authorization: `Bearer ${token}` } });
  assert.notEqual(viaKey.json()?.code, "TWO_FACTOR_SETUP_REQUIRED");
  assert.equal(viaKey.statusCode, 200, viaKey.body);
  const viaXKey = await app.inject({ method: "GET", url: "/files", headers: { "x-api-key": token } });
  assert.equal(viaXKey.statusCode, 200, viaXKey.body);
  const session = app.jwt.sign({ userId: "keyholder", isAdmin: false });
  const asBearer = await app.inject({ method: "GET", url: "/files", headers: { authorization: `Bearer ${session}` } });
  assert.equal(asBearer.statusCode, 403);
  assert.equal(asBearer.json().code, "TWO_FACTOR_SETUP_REQUIRED");
});

test("a forged viaApiKey claim cannot be signed without the secret", async () => {
  await setRequirement("all");
  const forged = `${app.jwt.sign({ userId: "member" })}x`;
  const res = await app.inject({ method: "GET", url: "/files", cookies: { token: forged } });
  assert.equal(res.statusCode, 401);
});

test("turning it on signs nobody out: the old session still reads its profile, the admin can set up", async () => {
  await setRequirement("off");
  const admin = as("admin");
  const put = await app.inject({
    method: "PATCH",
    url: "/app/configs",
    ...admin,
    payload: [{ key: "twoFactorRequired", value: "all" }],
  });
  assert.equal(put.statusCode, 200, put.body);
  const me = await app.inject({ method: "GET", url: "/auth/me", ...admin });
  assert.equal(me.json().user.id, "admin");
  assert.equal(me.json().user.twoFactorSetupRequired, true);
  assert.equal((await app.inject({ method: "POST", url: "/auth/2fa/setup", ...admin, payload: {} })).statusCode, 200);
});

test("/auth/me tells only the caller whether they must set up, and others are never told", async () => {
  await setRequirement("all");
  assert.equal((await call("GET", "/auth/me", as("totp"))).json().user.twoFactorSetupRequired, false);
  await setRequirement("off");
  assert.equal((await call("GET", "/auth/me", as("member"))).json().user.twoFactorSetupRequired, false);
});

test("the public configuration does not carry the requirement", async () => {
  const res = await app.inject({ method: "GET", url: "/app/configs/public" });
  assert.equal(res.statusCode, 200);
  assert.equal(
    res.json().configs.some((c: { key: string }) => c.key === "twoFactorRequired"),
    false
  );
});

test("only off, admins and all are accepted as a value", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: "/app/configs",
    ...as("admin"),
    payload: [{ key: "twoFactorRequired", value: "sometimes" }],
  });
  assert.equal(res.statusCode, 400, res.body);
  const single = await app.inject({
    method: "PATCH",
    url: "/app/configs/twoFactorRequired",
    ...as("admin"),
    payload: { value: "sometimes" },
  });
  assert.ok(single.statusCode >= 400, single.body);
});

test("unauthenticated and invalid sessions are left to the routes", async () => {
  await setRequirement("all");
  assert.equal((await app.inject({ method: "GET", url: "/files" })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: "/health" })).statusCode, 200);
});

test("every entry on the set up path is a route that really exists, so a typo cannot lock somebody out", () => {
  for (const entry of SETUP_PATH) assert.ok(registered.has(entry), `${entry} is not a registered route`);
});

test("the set up path holds no route that reads or changes files, shares, secrets, users or settings", () => {
  const sensitive =
    /^(GET|POST|PUT|PATCH|DELETE) \/(files|folders|shares|reverse-shares|secrets|users|api-keys|activity|trash|storage)/;
  for (const entry of SETUP_PATH) assert.ok(!sensitive.test(entry), entry);
  assert.ok(!SETUP_PATH.has("GET /app/configs") && !SETUP_PATH.has("PATCH /app/configs"));
});
