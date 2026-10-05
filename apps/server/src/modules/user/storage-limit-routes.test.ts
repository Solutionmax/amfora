import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();

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
    data: {
      id: "admin",
      firstName: "Ad",
      lastName: "Min",
      username: "admin",
      email: "admin@example.test",
      isAdmin: true,
    },
  });
  await prisma.user.create({
    data: {
      id: "limited",
      firstName: "Li",
      lastName: "Mited",
      username: "limited",
      email: "limited@example.test",
      storageLimitBytes: BigInt(5_000_000),
    },
  });
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const asLimited = () => ({ cookies: { token: app.jwt.sign({ userId: "limited", isAdmin: false }) } });
const asAdmin = () => ({ cookies: { token: app.jwt.sign({ userId: "admin", isAdmin: true }) } });

test("removing the avatar of a user with an own storage limit answers 200", async () => {
  const res = await app.inject({ method: "DELETE", url: "/users/avatar", ...asLimited() });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().storageLimitBytes, 5_000_000);
});

test("uploading an avatar for a user with an own storage limit answers 200", async () => {
  const boundary = "x";
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n`
    ),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await app.inject({
    method: "POST",
    url: "/users/avatar",
    ...asLimited(),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload,
  });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().storageLimitBytes, 5_000_000);
});

test("GET /auth/me answers 200 for a user with an own storage limit", async () => {
  const res = await app.inject({ method: "GET", url: "/auth/me", ...asLimited() });
  assert.equal(res.statusCode, 200, res.body);
});

test("the user routes answer 200 for a user with an own storage limit", async () => {
  const get = await app.inject({ method: "GET", url: "/users/limited", ...asAdmin() });
  assert.equal(get.statusCode, 200, get.body);
  const list = await app.inject({ method: "GET", url: "/users", ...asAdmin() });
  assert.equal(list.statusCode, 200, list.body);
  const profile = await app.inject({
    method: "PUT",
    url: "/users",
    ...asAdmin(),
    payload: { id: "limited", firstName: "Lim" },
  });
  assert.equal(profile.statusCode, 200, profile.body);
  const off = await app.inject({ method: "PATCH", url: "/users/limited/deactivate", ...asAdmin() });
  assert.equal(off.statusCode, 200, off.body);
  const on = await app.inject({ method: "PATCH", url: "/users/limited/activate", ...asAdmin() });
  assert.equal(on.statusCode, 200, on.body);
  assert.equal(on.json().storageLimitBytes, 5_000_000);
});
