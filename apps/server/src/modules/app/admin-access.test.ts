import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

// The real admin routes against a throwaway database: the point is that the database,
// not the day-long token, decides who is an administrator.
const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { appRoutes } = await import("./routes");
  const { updateRoutes } = await import("../update/routes");
  const { inviteRoutes } = await import("../invite/routes");
  const { userRoutes } = await import("../user/routes");

  app = fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  app.decorateRequest("jwtSign", function (this: any, payload: object) {
    return this.server.jwt.sign(payload);
  });
  await app.register(appRoutes);
  await app.register(updateRoutes);
  await app.register(inviteRoutes);
  await app.register(userRoutes);
  await app.ready();
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

async function resetUsers(
  users: Array<{ id: string; isAdmin: boolean; isActive?: boolean }>,
  firstUserAccess = "false"
) {
  await prisma.user.deleteMany();
  for (const user of users) {
    await prisma.user.create({
      data: {
        id: user.id,
        firstName: user.id,
        lastName: "Test",
        username: user.id,
        email: `${user.id}@example.test`,
        isAdmin: user.isAdmin,
        isActive: user.isActive ?? true,
      },
    });
  }
  await prisma.appConfig.update({ where: { key: "firstUserAccess" }, data: { value: firstUserAccess } });
}

function get(url: string, claims?: object) {
  return app.inject({ method: "GET", url, cookies: claims ? { token: app.jwt.sign(claims) } : undefined });
}

const adminToken = { userId: "admin", isAdmin: true };
const memberToken = { userId: "member", isAdmin: false };

test("app, update, invite and user admin routes: 401 without a session, 403 for a member, ok for an admin", async () => {
  await resetUsers([
    { id: "admin", isAdmin: true },
    { id: "member", isAdmin: false },
  ]);
  for (const url of ["/app/configs", "/update/status", "/update/progress", "/users"]) {
    assert.equal((await get(url)).statusCode, 401, `${url} without a session`);
    assert.equal((await get(url, memberToken)).statusCode, 403, `${url} as a member`);
    assert.equal((await get(url, { ...memberToken, isAdmin: true })).statusCode, 403, `${url} member claiming admin`);
  }
  assert.equal((await get("/app/configs", adminToken)).statusCode, 200);
  assert.equal((await get("/users", adminToken)).statusCode, 200);
  assert.equal((await get("/update/progress", adminToken)).statusCode, 200);

  const invite = await app.inject({
    method: "POST",
    url: "/invite-tokens",
    cookies: { token: app.jwt.sign(adminToken) },
  });
  assert.equal(invite.statusCode, 200);
});

test("an admin demoted or deactivated in the database is refused with the old token", async () => {
  await resetUsers([
    { id: "admin", isAdmin: true },
    { id: "member", isAdmin: false },
  ]);
  const token = app.jwt.sign(adminToken);
  assert.equal((await app.inject({ method: "GET", url: "/app/configs", cookies: { token } })).statusCode, 200);

  await prisma.user.update({ where: { id: "admin" }, data: { isAdmin: false } });
  for (const url of ["/app/configs", "/update/status", "/update/progress", "/users"]) {
    assert.equal((await app.inject({ method: "GET", url, cookies: { token } })).statusCode, 403, url);
  }
  const invite = await app.inject({ method: "POST", url: "/invite-tokens", cookies: { token } });
  assert.equal(invite.statusCode, 403);
  const promote = await app.inject({
    method: "PUT",
    url: "/users",
    cookies: { token },
    payload: { id: "member", isAdmin: true },
  });
  assert.equal(promote.statusCode, 403, "a demoted admin cannot edit or promote another user");

  await prisma.user.update({ where: { id: "admin" }, data: { isAdmin: true, isActive: false } });
  assert.equal((await app.inject({ method: "GET", url: "/app/configs", cookies: { token } })).statusCode, 403);
});

test("first run: open with 0 users or the single first user while firstUserAccess is on, not otherwise", async () => {
  await resetUsers([]);
  assert.equal((await get("/app/configs")).statusCode, 200);

  await resetUsers([{ id: "admin", isAdmin: true }], "true");
  assert.equal((await get("/app/configs")).statusCode, 200);

  await resetUsers([{ id: "admin", isAdmin: true }], "false");
  assert.equal((await get("/app/configs")).statusCode, 401);

  await resetUsers(
    [
      { id: "admin", isAdmin: true },
      { id: "member", isAdmin: false },
    ],
    "true"
  );
  assert.equal((await get("/app/configs")).statusCode, 401);

  // The update routes never had a first run exception and still do not.
  await resetUsers([]);
  assert.equal((await get("/update/status")).statusCode, 401);
  assert.equal((await get("/update/progress")).statusCode, 401);
});

test("registering the first user closes the setup window on the server", async () => {
  await prisma.user.deleteMany();
  await prisma.appConfig.update({ where: { key: "firstUserAccess" }, data: { value: "true" } });

  const open = await app.inject({ method: "GET", url: "/app/configs" });
  assert.equal(open.statusCode, 200, "with no users the setup window is open");

  const created = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      firstName: "First",
      lastName: "Admin",
      username: "firstadmin",
      email: "first@example.test",
      password: "A-long-enough-Passw0rd!",
    },
  });
  assert.equal(created.statusCode, 201, created.body);

  const flag = await prisma.appConfig.findUnique({ where: { key: "firstUserAccess" } });
  assert.equal(flag?.value, "false");
  const closed = await app.inject({ method: "GET", url: "/app/configs" });
  assert.equal(closed.statusCode, 401, "no session after the first admin exists");
});
