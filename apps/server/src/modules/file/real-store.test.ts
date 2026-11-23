import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListMultipartUploadsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { fastify } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { testSession } from "../../../test-support/session";
import { useTestDatabase } from "../../../test-support/test-db";

// Disposable real MinIO. Never connects to a configured production endpoint/volume.
const image = process.env.AMFORA_TEST_MINIO_IMAGE || "ghcr.io/solutionmax/amfora:2.4.0";
let available = true;
try {
  execFileSync("docker", ["image", "inspect", image], { stdio: "pipe" });
} catch {
  available = false;
}
const database = available ? useTestDatabase() : null;
const app = fastify();
let container = "";
let client: S3Client;
let prisma: typeof import("../../shared/prisma").prisma;
let fileService: import("./service").FileService;
before(async () => {
  if (!available) return;
  container = execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--detach",
      "--publish",
      "127.0.0.1::9000",
      "--env",
      "MINIO_ROOT_USER=storage-test",
      "--env",
      "MINIO_ROOT_PASSWORD=storage-test-secret",
      "--entrypoint",
      "minio",
      image,
      "server",
      "/data",
      "--address",
      ":9000",
    ],
    { encoding: "utf8" }
  ).trim();
  const port = execFileSync("docker", ["port", container, "9000/tcp"], { encoding: "utf8" }).trim().split(":").pop()!;
  Object.assign(process.env, {
    ENABLE_S3: "true",
    S3_ENDPOINT: "127.0.0.1",
    S3_PORT: port,
    S3_USE_SSL: "false",
    S3_REGION: "us-east-1",
    S3_ACCESS_KEY: "storage-test",
    S3_SECRET_KEY: "storage-test-secret",
    S3_BUCKET_NAME: "storage-regression",
    S3_FORCE_PATH_STYLE: "true",
  });
  client = new S3Client({
    endpoint: `http://127.0.0.1:${port}`,
    region: "us-east-1",
    credentials: { accessKeyId: "storage-test", secretAccessKey: "storage-test-secret" },
    forcePathStyle: true,
  });
  for (let n = 0; ; n++) {
    try {
      await client.send(new CreateBucketCommand({ Bucket: "storage-regression" }));
      break;
    } catch (error) {
      if (n > 30) throw error;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  ({ prisma } = await import("../../shared/prisma"));
  const { FileService } = await import("./service");
  fileService = new FileService();
  await prisma.user.create({
    data: {
      id: "real-store-owner",
      firstName: "Real",
      lastName: "Store",
      username: "real-store-owner",
      email: "real-store@example.test",
      storageLimitBytes: 1000n,
    },
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(cookie);
  await app.register(jwt, { secret: "test", cookie: { cookieName: "token", signed: false } });
  await app.register(multipart);
  const { registerRoutes } = await import("../../routes");
  registerRoutes(app);
  await app.ready();
});
after(async () => {
  if (!available) return;
  await app.close();
  await prisma?.$disconnect();
  client?.destroy();
  if (container) execFileSync("docker", ["rm", "--force", container], { stdio: "pipe" });
  database?.cleanup();
});
test(
  "FS-01 real signed PUT replay preserves committed bytes, size and scanned ETag",
  { skip: !available },
  async () => {
    const cookies = { token: await testSession(app, { userId: "real-store-owner", isAdmin: false }) };
    const grant = await app.inject({
      method: "GET",
      url: "/files/presigned-url?filename=bytes&extension=txt&size=5",
      cookies,
    });
    assert.equal(grant.statusCode, 200, grant.body);
    const { url, objectName } = grant.json();
    assert.equal((await fetch(url, { method: "PUT", body: "first" })).status, 200);
    const registration = await app.inject({
      method: "POST",
      url: "/files",
      cookies,
      payload: { name: "bytes.txt", extension: "txt", size: 5, objectName },
    });
    assert.equal(registration.statusCode, 201, registration.body);
    const f = registration.json().file;
    const etag = await fileService.getObjectEtag(f.objectName);
    await prisma.file.update({ where: { id: f.id }, data: { scanStatus: "clean", scanEtag: etag } });
    assert.equal((await fetch(url, { method: "PUT", body: "later" })).status, 200);
    const bytes = await client.send(new GetObjectCommand({ Bucket: "storage-regression", Key: f.objectName }));
    assert.equal(await bytes.Body!.transformToString(), "first");
    assert.equal(bytes.ContentLength, 5);
    assert.equal(bytes.ETag, etag);
    const row = await prisma.file.findUniqueOrThrow({ where: { id: f.id } });
    assert.equal(row.size, 5n);
    assert.equal(row.scanEtag, etag);
    assert.equal(row.scanStatus, "clean");
    assert.notEqual(f.objectName, objectName);
  }
);
test(
  "FS-08 real pending multipart is aborted and signed staging replay is swept after link deletion",
  { skip: !available },
  async () => {
    const { ReverseShareService } = await import("../reverse-share/service");
    const receive = new ReverseShareService();
    const link = await receive.createReverseShare(
      { name: "Real", maxFiles: 5, maxFileSize: 100, expiration: null } as any,
      "real-store-owner"
    );
    await receive.createOrUpdateAlias(link.id, "real-test", "real-store-owner");
    const pending = await receive.getPresignedUrl(link.id, { filename: "p.txt", extension: "txt", size: 2 });
    assert.equal((await fetch(pending.url, { method: "PUT", body: "aa" })).status, 200);
    await receive.createMultipartUploadByAlias("real-test", "multi", "txt", undefined, 2);
    assert.equal(
      (await client.send(new ListMultipartUploadsCommand({ Bucket: "storage-regression" }))).Uploads!.length,
      1
    );
    // Simulate an accepted CreateMultipartUpload whose reply never reached SQLite.
    const orphanKey = `pending-reverse/${link.id}/lost-create-reply`;
    await fileService.createMultipartUpload(orphanKey);
    await prisma.uploadReservation.create({
      data: {
        objectName: orphanKey,
        ownerId: "real-store-owner",
        size: 2n,
        uploadId: "pending",
        expiresAt: new Date(0),
      },
    });
    await receive.deleteReverseShare(link.id, "real-store-owner");
    await assert.rejects(client.send(new HeadObjectCommand({ Bucket: "storage-regression", Key: pending.objectName })));
    assert.equal(
      (await client.send(new ListMultipartUploadsCommand({ Bucket: "storage-regression" }))).Uploads?.length ?? 0,
      0
    );
    assert.equal((await fetch(pending.url, { method: "PUT", body: "bb" })).status, 200);
    const { sweepStorageCleanup } = await import("../storage/cleanup");
    await sweepStorageCleanup(new Date(Date.now() + 3600001));
    await assert.rejects(client.send(new HeadObjectCommand({ Bucket: "storage-regression", Key: pending.objectName })));
    assert.equal(await prisma.storageDeletion.count({ where: { objectName: pending.objectName } }), 0);
  }
);
