import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";
import { env } from "../../env";
import { PUBLIC_PATH, SETUP_PATH } from "./second-step";

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

const codeOf = (res: { json: () => { code?: unknown } | null }): unknown => {
  try {
    return res.json()?.code;
  } catch {
    return undefined;
  }
};
const urlOf = (pattern: string) => pattern.replace(/:[A-Za-z]+/g, "x");

test("every registered route is gated for a session that must set up, unless it is on the set up path or public", async () => {
  await setRequirement("all");
  const open: string[] = [];
  for (const entry of registered) {
    if (SETUP_PATH.has(entry) || PUBLIC_PATH.has(entry)) continue;
    const [method, pattern] = entry.split(" ");
    if (method === "HEAD" || method === "OPTIONS") continue;
    const res = await call(method, urlOf(pattern), as("member"));
    if (res.statusCode !== 403 || codeOf(res) !== "TWO_FACTOR_SETUP_REQUIRED")
      open.push(`${entry} answered ${res.statusCode}`);
  }
  assert.deepEqual(open, []);
});

test("every entry on the public list is a real route, not on the set up path, and a gated cookie does not stop it", async () => {
  await setRequirement("all");
  assert.ok(PUBLIC_PATH.size > 10);
  for (const entry of PUBLIC_PATH) {
    assert.ok(registered.has(entry), `${entry} is not a registered route`);
    assert.ok(!SETUP_PATH.has(entry), `${entry} is on both lists`);
    const [method, pattern] = entry.split(" ");
    const res = await call(method, urlOf(pattern), as("member"));
    assert.notEqual(codeOf(res), "TWO_FACTOR_SETUP_REQUIRED", `${entry} answered ${res.statusCode}`);
  }
});

test("the public list holds nothing that reads or changes a user's own data", () => {
  const sensitive = /^(GET|POST|PUT|PATCH|DELETE) \/(folders|users|api-keys|activity|trash|notifications|auth)/;
  for (const entry of PUBLIC_PATH) assert.ok(!sensitive.test(entry), entry);
  assert.ok(!PUBLIC_PATH.has("GET /files") && !PUBLIC_PATH.has("GET /shares/me"));
});

test("a public route with optional sign in does not see a gated session as signed in", async () => {
  await setRequirement("off");
  const share = await prisma.share.create({
    data: {
      id: "locked-share",
      name: "Locked",
      creator: { connect: { id: "member" } },
      security: { create: { password: "not-a-real-hash" } },
    },
  });
  // Not gated: the owner is let in without the password.
  const owner = await app.inject({ method: "GET", url: `/shares/${share.id}`, ...as("member") });
  assert.equal(owner.statusCode, 200, owner.body);
  // Gated: the same cookie is a stranger to this route, so the password is asked for.
  await setRequirement("all");
  const gated = await app.inject({ method: "GET", url: `/shares/${share.id}`, ...as("member") });
  assert.equal(gated.statusCode, 400, gated.body);
  assert.match(gated.json().error, /Password required/);
});

async function withServerSetting(value: string | undefined, work: () => Promise<void>) {
  const saved = env.TWO_FACTOR_REQUIRED;
  env.TWO_FACTOR_REQUIRED = value;
  try {
    await work();
  } finally {
    env.TWO_FACTOR_REQUIRED = saved;
  }
}
const isGated = async (userId: string) =>
  (await call("GET", "/files", as(userId))).json()?.code === "TWO_FACTOR_SETUP_REQUIRED";

test("TWO_FACTOR_REQUIRED from the server wins over the stored setting, in both directions", async () => {
  await setRequirement("all");
  await withServerSetting("off", async () => assert.equal(await isGated("member"), false));
  await setRequirement("off");
  await withServerSetting("all", async () => assert.equal(await isGated("member"), true));
  await withServerSetting("admins", async () => {
    assert.equal(await isGated("member"), false);
    assert.equal(await isGated("admin"), true);
  });
});

test("an unknown TWO_FACTOR_REQUIRED is ignored and the stored setting counts", async () => {
  await setRequirement("all");
  await withServerSetting("sometimes", async () => assert.equal(await isGated("member"), true));
  await withServerSetting("", async () => assert.equal(await isGated("member"), true));
  await setRequirement("off");
  await withServerSetting("sometimes", async () => assert.equal(await isGated("member"), false));
});

test("the administrator sees which value the server forces, and /auth/me follows it", async () => {
  await setRequirement("off");
  await prisma.user.update({ where: { id: "admin" }, data: { twoFactorEnabled: true } });
  await withServerSetting("all", async () => {
    const list = await app.inject({ method: "GET", url: "/app/configs", ...as("admin") });
    assert.equal(list.statusCode, 200, list.body);
    const row = list.json().configs.find((c: { key: string }) => c.key === "twoFactorRequired");
    assert.equal(row.value, "all");
    assert.equal(row.lockedByServer, true);
    assert.equal((await call("GET", "/auth/me", as("member"))).json().user.twoFactorSetupRequired, true);
  });
  const list = await app.inject({ method: "GET", url: "/app/configs", ...as("admin") });
  await prisma.user.update({ where: { id: "admin" }, data: { twoFactorEnabled: false } });
  const row = list.json().configs.find((c: { key: string }) => c.key === "twoFactorRequired");
  assert.equal(row.value, "off");
  assert.ok(!row.lockedByServer);
});
