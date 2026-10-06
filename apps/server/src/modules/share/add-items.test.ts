import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";

// Adding items to a share: only the maker's own files and folders, never somebody else's.
const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;

const as = (userId: string) => ({ token: app.jwt.sign({ userId, isAdmin: false }) });
const addItems = (user: string, shareId: string, payload: object) =>
  app.inject({ method: "POST", url: `/shares/${shareId}/items`, cookies: as(user), payload });

let shareId = "";
const ids = { mine: "", theirs: "", myFolder: "", theirFolder: "", trashed: "" };

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

  for (const id of ["maker", "victim"]) {
    await prisma.user.create({
      data: { id, firstName: id, lastName: "T", username: id, email: `${id}@example.test` },
    });
  }
  const file = (name: string, userId: string, extra: object = {}) =>
    prisma.file.create({
      data: { name, extension: "txt", size: 1n, objectName: `${userId}/${name}.txt`, userId, ...extra },
    });
  ids.mine = (await file("mine", "maker")).id;
  ids.theirs = (await file("theirs", "victim")).id;
  ids.trashed = (await file("trashed", "maker", { deletedAt: new Date() })).id;
  ids.myFolder = (await prisma.folder.create({ data: { name: "mf", objectName: "maker/mf", userId: "maker" } })).id;
  ids.theirFolder = (
    await prisma.folder.create({ data: { name: "tf", objectName: "victim/tf", userId: "victim" } })
  ).id;
  const share = await prisma.share.create({
    data: { creator: { connect: { id: "maker" } }, security: { create: {} }, files: { connect: { id: ids.mine } } },
  });
  shareId = share.id;
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const linked = async () => {
  const share = await prisma.share.findUniqueOrThrow({
    where: { id: shareId },
    include: { files: { select: { id: true } }, folders: { select: { id: true } } },
  });
  return { files: share.files.map((f) => f.id).sort(), folders: share.folders.map((f) => f.id).sort() };
};

test("somebody else's file id is refused like an id that does not exist, and nothing is connected", async () => {
  const other = await addItems("maker", shareId, { files: [ids.theirs] });
  const missing = await addItems("maker", shareId, { files: ["nope"] });
  assert.equal(other.statusCode, 404);
  assert.equal(missing.statusCode, 404);
  assert.equal(other.json().error.replace(ids.theirs, "X"), missing.json().error.replace("nope", "X"));
  assert.deepEqual((await linked()).files, [ids.mine]);
});

test("somebody else's folder id is refused and nothing is connected", async () => {
  const res = await addItems("maker", shareId, { folders: [ids.theirFolder] });
  assert.equal(res.statusCode, 404);
  assert.deepEqual((await linked()).folders, []);
});

test("one foreign id in a mixed list connects none of the list", async () => {
  const res = await addItems("maker", shareId, { files: [ids.mine, ids.theirs], folders: [ids.myFolder] });
  assert.equal(res.statusCode, 404);
  assert.deepEqual(await linked(), { files: [ids.mine], folders: [] });
});

test("a file in the trash is refused too", async () => {
  assert.equal((await addItems("maker", shareId, { files: [ids.trashed] })).statusCode, 404);
});

test("the maker's own file and folder still go in", async () => {
  const res = await addItems("maker", shareId, { files: [ids.mine], folders: [ids.myFolder] });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(await linked(), { files: [ids.mine], folders: [ids.myFolder] });
});

test("a good file with a foreign folder connects neither", async () => {
  const extra = await prisma.file.create({
    data: { name: "extra", extension: "txt", size: 1n, objectName: "maker/extra.txt", userId: "maker" },
  });
  const res = await addItems("maker", shareId, { files: [extra.id], folders: [ids.theirFolder] });
  assert.equal(res.statusCode, 404);
  assert.ok(!(await linked()).files.includes(extra.id));
});
