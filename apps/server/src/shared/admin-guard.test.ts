import assert from "node:assert/strict";
import { test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { fastify, FastifyInstance } from "fastify";

import { AccountState, AdminGuardDb, createAdminGuard, FirstRunPolicy } from "./admin-guard";

interface FakeState {
  users: Record<string, AccountState>;
  firstUserAccess?: string;
}

function fakeDb(state: FakeState): AdminGuardDb {
  return {
    user: {
      count: async () => Object.keys(state.users).length,
      findUnique: async ({ where }) => state.users[where.id] ?? null,
    },
    appConfig: {
      findUnique: async ({ where }) =>
        where.key === "firstUserAccess" && state.firstUserAccess !== undefined
          ? { value: state.firstUserAccess }
          : null,
    },
  };
}

async function buildApp(state: FakeState, firstRun: FirstRunPolicy = "none"): Promise<FastifyInstance> {
  const app = fastify();
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  app.get("/admin", { preValidation: createAdminGuard({ firstRun, db: fakeDb(state) }) }, async (request) => ({
    ok: true,
    isAdmin: (request.user as { isAdmin?: boolean } | undefined)?.isAdmin ?? null,
  }));
  await app.ready();
  return app;
}

async function call(app: FastifyInstance, claims?: object) {
  const cookies = claims ? { token: app.jwt.sign(claims) } : undefined;
  return app.inject({ method: "GET", url: "/admin", cookies });
}

const admin = { isAdmin: true, isActive: true };
const member = { isAdmin: false, isActive: true };

test("no session is 401", async () => {
  const app = await buildApp({ users: { a: admin, b: member } });
  assert.equal((await call(app)).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: "/admin", cookies: { token: "garbage" } })).statusCode, 401);
});

test("a normal user is 403, even when the token still claims isAdmin", async () => {
  const app = await buildApp({ users: { a: admin, b: member } });
  assert.equal((await call(app, { userId: "b", isAdmin: false })).statusCode, 403);
  assert.equal((await call(app, { userId: "b", isAdmin: true })).statusCode, 403);
});

test("an active admin passes and the handler sees the database state", async () => {
  const app = await buildApp({ users: { a: admin, b: member } });
  const response = await call(app, { userId: "a", isAdmin: true });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true, isAdmin: true });
});

test("an admin demoted or deactivated in the database loses access with the old token", async () => {
  const state: FakeState = { users: { a: { ...admin }, b: member } };
  const app = await buildApp(state);
  const oldToken = { userId: "a", isAdmin: true };
  assert.equal((await call(app, oldToken)).statusCode, 200);

  state.users = { ...state.users, a: { isAdmin: false, isActive: true } };
  assert.equal((await call(app, oldToken)).statusCode, 403);

  state.users = { ...state.users, a: { isAdmin: true, isActive: false } };
  assert.equal((await call(app, oldToken)).statusCode, 403);
});

test("a token for a deleted user, or without a userId, does not pass", async () => {
  const app = await buildApp({ users: { a: admin, b: member } });
  assert.equal((await call(app, { userId: "gone", isAdmin: true })).statusCode, 403);
  assert.equal((await call(app, { isAdmin: true })).statusCode, 401);
});

test("setup policy: open with 0 users, or 1 user while firstUserAccess is true, and nothing else", async () => {
  assert.equal((await call(await buildApp({ users: {} }, "setup"))).statusCode, 200);
  assert.equal((await call(await buildApp({ users: { a: admin }, firstUserAccess: "true" }, "setup"))).statusCode, 200);
  assert.equal(
    (await call(await buildApp({ users: { a: admin }, firstUserAccess: "false" }, "setup"))).statusCode,
    401
  );
  assert.equal((await call(await buildApp({ users: { a: admin } }, "setup"))).statusCode, 401);
  assert.equal(
    (await call(await buildApp({ users: { a: admin, b: member }, firstUserAccess: "true" }, "setup"))).statusCode,
    401
  );
  // Past setup a member is still refused, flag or not.
  assert.equal(
    (
      await call(await buildApp({ users: { a: admin, b: member }, firstUserAccess: "true" }, "setup"), {
        userId: "b",
        isAdmin: true,
      })
    ).statusCode,
    403
  );
});

test("noUsers policy is open only with zero users; the default policy never is", async () => {
  assert.equal((await call(await buildApp({ users: {} }, "noUsers"))).statusCode, 200);
  assert.equal(
    (await call(await buildApp({ users: { a: admin }, firstUserAccess: "true" }, "noUsers"))).statusCode,
    401
  );
  assert.equal((await call(await buildApp({ users: {} }))).statusCode, 401);
});
