import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, beforeEach, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { startFakeClamd, type FakeClamd } from "../../../test-support/fake-clamd";
import { useTestDatabase } from "../../../test-support/test-db";
import { FileService } from "../file/service";
import { FILE_BLOCKED_CODE } from "./status";

// A clean file whose object was overwritten after the scan is a pending file again.
const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
let env: typeof import("../../env").env;
let clamd: FakeClamd;
let etag = "e1";
let heads = 0;
let fileId = "";
let folderId = "";
let shareId = "";

const originals = {
  presign: FileService.prototype.getPresignedGetUrl,
  stream: FileService.prototype.getObjectStream,
  etag: FileService.prototype.getObjectEtag,
  size: FileService.prototype.getObjectSize,
};
let onHead: () => Promise<void> = async () => undefined;
let storedSize = 5;
const get = (url: string) => app.inject({ method: "GET", url });
const row = () => prisma.file.findUniqueOrThrow({ where: { id: fileId } });

before(async () => {
  FileService.prototype.getPresignedGetUrl = async (objectName: string) => `https://storage.test/${objectName}`;
  FileService.prototype.getObjectStream = async () => Readable.from([Buffer.from("new content")]);
  FileService.prototype.getObjectEtag = async () => (heads++, await onHead(), etag);
  FileService.prototype.getObjectSize = async () => storedSize;
  clamd = await startFakeClamd();
  ({ prisma } = await import("../../shared/prisma"));
  ({ env } = await import("../../env"));
  const { registerRoutes } = await import("../../routes");
  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();
  await prisma.user.create({
    data: { id: "owner", firstName: "o", lastName: "T", username: "owner", email: "owner@example.test" },
  });
  const folder = await prisma.folder.create({ data: { name: "f", objectName: "owner/f", userId: "owner" } });
  folderId = folder.id;
  const file = await prisma.file.create({
    data: {
      name: "doc",
      extension: "txt",
      size: BigInt(5),
      objectName: "owner/doc.txt",
      userId: "owner",
      folderId,
      scanStatus: "clean",
      scanEtag: "e1",
    },
  });
  fileId = file.id;
  const share = await prisma.share.create({
    data: {
      name: "S",
      creator: { connect: { id: "owner" } },
      security: { create: {} },
      files: { connect: [{ id: fileId }] },
      folders: { connect: [{ id: folderId }] },
    },
  });
  shareId = share.id;
});

after(async () => {
  FileService.prototype.getPresignedGetUrl = originals.presign;
  FileService.prototype.getObjectStream = originals.stream;
  FileService.prototype.getObjectEtag = originals.etag;
  FileService.prototype.getObjectSize = originals.size;
  delete env.CLAMAV_HOST;
  await app?.close();
  await clamd.close();
  await prisma?.$disconnect();
  database.cleanup();
});

beforeEach(async () => {
  env.CLAMAV_HOST = "127.0.0.1";
  env.CLAMAV_PORT = String(clamd.port);
  etag = "e1";
  heads = 0;
  storedSize = 5;
  onHead = async () => undefined;
  await prisma.file.update({
    where: { id: fileId },
    data: { scanStatus: "clean", scanEtag: "e1", scanDetail: null, size: BigInt(5) },
  });
});

test("an unchanged object costs one HEAD and is served", async () => {
  const response = await get("/files/download-url?objectName=owner/doc.txt");
  assert.equal(response.statusCode, 200);
  assert.equal(heads, 1);
});

test("an object overwritten after the scan answers 423, goes back to pending and is scanned again", async () => {
  etag = "e2";
  const response = await get("/files/download-url?objectName=owner/doc.txt");
  assert.equal(response.statusCode, 423);
  assert.equal(response.json().code, FILE_BLOCKED_CODE);
  assert.equal(response.json().scanStatus, "pending");
  for (let i = 0; i < 100 && (await row()).scanStatus !== "clean"; i++) {
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  const after = await row();
  assert.equal(after.scanStatus, "clean");
  assert.equal(after.scanEtag, "e2");
  assert.equal((await get("/files/download-url?objectName=owner/doc.txt")).statusCode, 200);
});

test("the download, the embed and the folder zip check the object too", async () => {
  const folderZip = `/shares/${shareId}/folders/${folderId}/download`;
  for (const url of [`/files/download?objectName=owner/doc.txt`, `/embed/${fileId}`, folderZip]) {
    await prisma.file.update({ where: { id: fileId }, data: { scanStatus: "clean", scanEtag: "e1" } });
    etag = "e2";
    const response = await get(url);
    if (url === folderZip) {
      assert.equal(response.statusCode, 200, url);
      assert.deepEqual(response.json().files, []);
      assert.equal(response.json().unavailable, 1);
    } else assert.equal(response.statusCode, 423, url);
    for (let i = 0; i < 100 && (await row()).scanStatus !== "clean"; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }
});

test("with scanning off storage is not asked", async () => {
  delete env.CLAMAV_HOST;
  etag = "e2";
  assert.equal((await get("/files/download-url?objectName=owner/doc.txt")).statusCode, 200);
  assert.equal(heads, 0);
});

test("a clean file from before the ETag was kept is served without a HEAD", async () => {
  await prisma.file.update({ where: { id: fileId }, data: { scanEtag: null } });
  assert.equal((await get("/files/download-url?objectName=owner/doc.txt")).statusCode, 200);
  assert.equal(heads, 0);
});

test("a file that is not clean is not asked about either", async () => {
  await prisma.file.update({ where: { id: fileId }, data: { scanStatus: "skipped" } });
  assert.equal((await get("/files/download-url?objectName=owner/doc.txt")).statusCode, 200);
  assert.equal(heads, 0);
});

test("an overwrite that made the object bigger takes the new size from storage into the row", async () => {
  etag = "e2";
  storedSize = 7 * 1024 * 1024;
  assert.equal((await get("/files/download-url?objectName=owner/doc.txt")).statusCode, 423);
  assert.equal((await row()).size, BigInt(7 * 1024 * 1024));
});

test("a rescan that finished while the ETag was being read is not thrown back to pending", async () => {
  etag = "e2";
  onHead = async () => {
    await prisma.file.update({ where: { id: fileId }, data: { scanEtag: "e3" } });
  };
  await get("/files/download-url?objectName=owner/doc.txt");
  const after = await row();
  assert.equal(after.scanStatus, "clean");
  assert.equal(after.scanEtag, "e3");
});
