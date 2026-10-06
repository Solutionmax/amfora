import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { startFakeClamd, type FakeClamd } from "../../../test-support/fake-clamd";
import { useTestDatabase } from "../../../test-support/test-db";
import { FileService } from "../file/service";
import { FILE_BLOCKED_CODE } from "./status";

// Every route that hands out a file, against files in each scan state. Storage is stubbed.
const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
let env: typeof import("../../env").env;
let clamd: FakeClamd;
const ids: Record<string, string> = {};
const received: Record<string, string> = {};
let shareId = "";
let blockedFolderShareId = "";
let cleanFolderId = "";
let blockedFolderId = "";

const originalPresign = FileService.prototype.getPresignedGetUrl;
const originalStream = FileService.prototype.getObjectStream;
const originalPut = FileService.prototype.getPresignedPutUrl;
const as = (userId: string) => ({ token: app.jwt.sign({ userId, isAdmin: false }) });
const get = (url: string, userId?: string) =>
  app.inject({ method: "GET", url, cookies: userId ? as(userId) : undefined });

async function addFile(key: string, scanStatus: string | null, folderId?: string) {
  const file = await prisma.file.create({
    data: {
      name: key,
      extension: "png",
      size: BigInt(5),
      objectName: `owner/${key}.png`,
      userId: "owner",
      scanStatus,
      scanDetail: scanStatus === "infected" ? "Eicar-Test-Signature" : null,
      folderId,
    },
  });
  ids[key] = file.id;
  return file;
}

before(async () => {
  FileService.prototype.getPresignedGetUrl = async (objectName: string) => `https://storage.test/${objectName}`;
  FileService.prototype.getObjectStream = async () => Readable.from([Buffer.from("bytes")]);
  FileService.prototype.getPresignedPutUrl = async (objectName: string) => `https://storage.test/put/${objectName}`;
  clamd = await startFakeClamd();

  ({ prisma } = await import("../../shared/prisma"));
  ({ env } = await import("../../env"));
  env.CLAMAV_HOST = "127.0.0.1";
  env.CLAMAV_PORT = String(clamd.port);
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

  for (const id of ["owner", "other"]) {
    await prisma.user.create({
      data: { id, firstName: id, lastName: "T", username: id, email: `${id}@example.test` },
    });
  }
  const files = [];
  for (const [key, status] of [
    ["clean", "clean"],
    ["pending", "pending"],
    ["infected", "infected"],
    ["errored", "error"],
    ["skipped", "skipped"],
    ["legacy", null],
  ] as const) {
    files.push(await addFile(key, status));
  }
  const share = await prisma.share.create({
    data: {
      name: "All",
      creator: { connect: { id: "owner" } },
      security: { create: {} },
      files: { connect: files.map((file) => ({ id: file.id })) },
    },
  });
  shareId = share.id;

  const cleanFolder = await prisma.folder.create({ data: { name: "ok", objectName: "owner/ok", userId: "owner" } });
  const blockedFolder = await prisma.folder.create({ data: { name: "bad", objectName: "owner/bad", userId: "owner" } });
  cleanFolderId = cleanFolder.id;
  blockedFolderId = blockedFolder.id;
  await addFile("inCleanFolder", "clean", cleanFolderId);
  await addFile("inBlockedFolder", "infected", blockedFolderId);
  const folderShare = await prisma.share.create({
    data: {
      name: "Folders",
      creator: { connect: { id: "owner" } },
      security: { create: {} },
      folders: { connect: [{ id: cleanFolderId }, { id: blockedFolderId }] },
    },
  });
  blockedFolderShareId = folderShare.id;

  const link = await prisma.reverseShare.create({ data: { id: "link", name: "Inbox", creatorId: "owner" } });
  for (const [key, status] of [
    ["rClean", "clean"],
    ["rPending", "pending"],
    ["rInfected", "infected"],
    ["rLegacy", null],
  ] as const) {
    const row = await prisma.reverseShareFile.create({
      data: {
        name: key,
        extension: "txt",
        size: BigInt(5),
        objectName: `reverse-shares/link/${key}`,
        reverseShareId: link.id,
        scanStatus: status,
        scanDetail: status === "infected" ? "Eicar-Test-Signature" : null,
      },
    });
    received[key] = row.id;
  }
});

after(async () => {
  FileService.prototype.getPresignedGetUrl = originalPresign;
  FileService.prototype.getObjectStream = originalStream;
  FileService.prototype.getPresignedPutUrl = originalPut;
  delete env.CLAMAV_HOST;
  await app?.close();
  await clamd.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const BLOCKED = ["pending", "infected"];
const OPEN = ["clean", "errored", "skipped", "legacy"];

function assertBlocked(response: { statusCode: number; json: () => any }, label: string) {
  assert.equal(response.statusCode, 423, label);
  assert.equal(response.json().code, FILE_BLOCKED_CODE, label);
}

test("a pending or infected file is refused on every download route, for a visitor and for its owner", async () => {
  for (const key of BLOCKED) {
    for (const who of [undefined, "owner"]) {
      const name = `owner/${key}.png`;
      for (const url of [
        `/files/download-url?objectName=${name}`,
        `/files/download-url?objectName=${name}&preview=1`,
        `/files/download?objectName=${name}`,
        `/files/download?objectName=${name}&preview=1`,
      ]) {
        assertBlocked(await get(url, who), `${who ?? "visitor"} ${url}`);
      }
      assertBlocked(await get(`/embed/${ids[key]}`), `embed ${key}`);
    }
  }
});

test("every other file still downloads, in each way", async () => {
  for (const key of OPEN) {
    const name = `owner/${key}.png`;
    assert.equal((await get(`/files/download-url?objectName=${name}`)).statusCode, 200, key);
    assert.equal((await get(`/files/download?objectName=${name}`)).statusCode, 200, key);
    assert.equal((await get(`/files/download-url?objectName=${name}`, "owner")).statusCode, 200, key);
    assert.equal((await get(`/embed/${ids[key]}`)).statusCode, 200, key);
  }
});

test("a stranger who may not have the file still learns nothing about its scan state", async () => {
  await prisma.share.delete({ where: { id: shareId } });
  const response = await get(`/files/download-url?objectName=owner/infected.png`, "other");
  assert.equal(response.statusCode, 401);
});

test("the folder download of a share is refused when a file in it is blocked, and works when none is", async () => {
  assertBlocked(await get(`/shares/${blockedFolderShareId}/folders/${blockedFolderId}/download`), "blocked folder");
  assert.equal((await get(`/shares/${blockedFolderShareId}/folders/${cleanFolderId}/download`)).statusCode, 200);
});

test("the folder listing of a share, and the share itself, carry the status", async () => {
  const contents = (await get(`/shares/${blockedFolderShareId}/folders/${blockedFolderId}/contents`)).json();
  assert.equal(contents.files[0].scanStatus, "infected");
  assert.equal(contents.files[0].scanDetail, "Eicar-Test-Signature");
  const clean = (await get(`/shares/${blockedFolderShareId}/folders/${cleanFolderId}/contents`)).json();
  assert.equal(clean.files[0].scanStatus, "clean");
});

test("the share page lists the files with their status", async () => {
  const share = await prisma.share.create({
    data: {
      name: "Again",
      creator: { connect: { id: "owner" } },
      security: { create: {} },
      files: { connect: ["clean", "pending", "infected", "legacy"].map((key) => ({ id: ids[key] })) },
    },
  });
  const body = (await get(`/shares/${share.id}`)).json();
  const byName = Object.fromEntries(body.share.files.map((file: any) => [file.name, file]));
  assert.equal(byName.clean.scanStatus, "clean");
  assert.equal(byName.pending.scanStatus, "pending");
  assert.equal(byName.infected.scanStatus, "infected");
  assert.equal(byName.infected.scanDetail, "Eicar-Test-Signature");
  assert.equal(byName.legacy.scanStatus, null);
});

test("the owner sees the status in the file list", async () => {
  const body = (await get("/files", "owner")).json();
  const byName = Object.fromEntries(body.files.map((file: any) => [file.name, file]));
  assert.equal(byName.pending.scanStatus, "pending");
  assert.equal(byName.infected.scanDetail, "Eicar-Test-Signature");
  assert.equal(byName.legacy.scanStatus, null);
});

test("received files: download and copy are refused while pending or infected, for the owner too", async () => {
  for (const key of ["rPending", "rInfected"]) {
    assertBlocked(await get(`/reverse-shares/files/${received[key]}/download`, "owner"), key);
    assertBlocked(await get(`/files/download?objectName=reverse-shares/link/${key}`, "owner"), `${key} proxy`);
    const copy = await app.inject({
      method: "POST",
      url: `/reverse-shares/files/${received[key]}/copy`,
      cookies: as("owner"),
    });
    assertBlocked(copy, `${key} copy`);
  }
  for (const key of ["rClean", "rLegacy"]) {
    assert.equal((await get(`/reverse-shares/files/${received[key]}/download`, "owner")).statusCode, 200, key);
    assert.equal((await get(`/files/download?objectName=reverse-shares/link/${key}`, "owner")).statusCode, 200, key);
  }
});

test("the receive link lists its files with their status", async () => {
  const body = (await get("/reverse-shares/link", "owner")).json();
  const byName = Object.fromEntries(body.reverseShare.files.map((file: any) => [file.name, file]));
  assert.equal(byName.rPending.scanStatus, "pending");
  assert.equal(byName.rInfected.scanStatus, "infected");
  assert.equal(byName.rInfected.scanDetail, "Eicar-Test-Signature");
  assert.equal(byName.rLegacy.scanStatus, null);
});

test("a blocked file cannot be put in a share, and the owner can still delete it", async () => {
  const create = await app.inject({
    method: "POST",
    url: "/shares",
    cookies: as("owner"),
    payload: { name: "No", files: [ids.infected] },
  });
  assert.equal(create.statusCode, 400);
  assert.match(create.body, /cannot be shared/);
  const removed = await app.inject({ method: "DELETE", url: `/files/${ids.infected}`, cookies: as("owner") });
  assert.equal(removed.statusCode, 200);
  const restored = await app.inject({
    method: "POST",
    url: `/trash/file/${ids.infected}/restore`,
    cookies: as("owner"),
  });
  assert.equal(restored.statusCode, 200);
  assert.equal((await prisma.file.findUniqueOrThrow({ where: { id: ids.infected } })).scanStatus, "infected");
});

test("a copy of a clean received file keeps its status", async () => {
  const fetchCopy = globalThis.fetch;
  globalThis.fetch = async () => new Response("bytes");
  try {
    const copy = await app.inject({
      method: "POST",
      url: `/reverse-shares/files/${received.rClean}/copy`,
      cookies: as("owner"),
    });
    assert.equal(copy.statusCode, 200, copy.body);
    const row = await prisma.file.findFirstOrThrow({ where: { name: "rClean" } });
    assert.equal(row.scanStatus, "clean");
  } finally {
    globalThis.fetch = fetchCopy;
  }
});

test("with scanning off nothing is blocked, nothing shows, a file left pending downloads", async () => {
  delete env.CLAMAV_HOST;
  try {
    assert.equal((await get(`/files/download-url?objectName=owner/pending.png`)).statusCode, 200);
    assert.equal((await get(`/files/download?objectName=owner/pending.png`, "owner")).statusCode, 200);
    const body = (await get("/files", "owner")).json();
    const pending = body.files.find((file: any) => file.name === "pending");
    assert.equal(pending.scanStatus, null);
    assert.equal((await get(`/reverse-shares/files/${received.rPending}/download`, "owner")).statusCode, 200);
  } finally {
    env.CLAMAV_HOST = "127.0.0.1";
  }
});

test("a file registered with scanning off has no status, with scanning on it is pending and then scanned", async () => {
  const register = (name: string) =>
    app.inject({
      method: "POST",
      url: "/files",
      cookies: as("owner"),
      payload: { name, extension: "txt", size: 5, objectName: `owner/${name}-${Date.now()}` },
    });

  delete env.CLAMAV_HOST;
  const started = Date.now();
  const off = (await register("off.txt")).json().file;
  assert.equal(off.scanStatus, null);
  assert.equal((await prisma.file.findUniqueOrThrow({ where: { id: off.id } })).scanStatus, null);
  assert.equal((await get(`/files/download-url?objectName=${off.objectName}`, "owner")).statusCode, 200);
  assert.ok(Date.now() - started < 2000, "no delay");

  env.CLAMAV_HOST = "127.0.0.1";
  const on = (await register("on.txt")).json().file;
  assert.equal(on.scanStatus, "pending");
  for (let i = 0; i < 100; i++) {
    const row = await prisma.file.findUniqueOrThrow({ where: { id: on.id } });
    if (row.scanStatus !== "pending") break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal((await prisma.file.findUniqueOrThrow({ where: { id: on.id } })).scanStatus, "clean");
  assert.equal((await get(`/files/download-url?objectName=${on.objectName}`, "owner")).statusCode, 200);
});
