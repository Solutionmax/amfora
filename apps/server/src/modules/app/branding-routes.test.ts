import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import sharp from "sharp";

import { useTestDatabase } from "../../../test-support/test-db";
import { directoriesConfig } from "../../config/directories.config";

// The cover and the link preview image are free, admin-only to change and public to read.
const database = useTestDatabase();
const originalBranding = directoriesConfig.branding;
const brandingDir = mkdtempSync(path.join(tmpdir(), "amfora-branding-routes-"));

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;

before(async () => {
  directoriesConfig.branding = brandingDir;
  ({ prisma } = await import("../../shared/prisma"));
  const { appRoutes } = await import("./routes");

  app = fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  await app.register(fastifyMultipart);
  await app.register(appRoutes);
  await app.ready();

  await prisma.user.deleteMany();
  for (const [id, isAdmin] of [
    ["admin", true],
    ["member", false],
  ] as const) {
    await prisma.user.create({
      data: { id, firstName: id, lastName: "Test", username: id, email: `${id}@example.test`, isAdmin },
    });
  }
  await prisma.appConfig.update({ where: { key: "firstUserAccess" }, data: { value: "false" } });
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  directoriesConfig.branding = originalBranding;
  rmSync(brandingDir, { recursive: true, force: true });
  database.cleanup();
});

const cookie = (userId: string, isAdmin: boolean) => ({ token: app.jwt.sign({ userId, isAdmin }) });

function multipart(buffer: Buffer, filename = "cover.png", contentType = "image/png") {
  const boundary = "----amforatest";
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    payload: Buffer.concat([head, buffer, tail]),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#aa3300" } })
    .png()
    .toBuffer();

async function upload(url: string, buffer: Buffer, as = cookie("admin", true)) {
  return app.inject({ method: "POST", url, cookies: as, ...multipart(buffer) });
}

async function appInfo() {
  return (await app.inject({ method: "GET", url: "/app/info" })).json();
}

for (const url of ["/app/share-cover", "/app/link-preview"]) {
  test(`${url}: 404 when unset, admin upload, public webp and og jpeg, remove`, async () => {
    assert.equal((await app.inject({ method: "GET", url })).statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url: `${url}/og` })).statusCode, 404);

    const image = await png(1400, 700);
    assert.equal((await app.inject({ method: "POST", url, ...multipart(image) })).statusCode, 401);
    assert.equal((await upload(url, image, cookie("member", false))).statusCode, 403);
    assert.equal((await upload(url, await png(300, 300))).statusCode, 400, "too narrow");
    assert.equal((await upload(url, Buffer.from("<svg/>"))).statusCode, 400, "not a raster image");

    const saved = await upload(url, image);
    assert.equal(saved.statusCode, 200, saved.body);

    const page = await app.inject({ method: "GET", url });
    assert.equal(page.statusCode, 200);
    assert.equal(page.headers["content-type"], "image/webp");
    assert.match(String(page.headers["cache-control"]), /^public/);

    const og = await app.inject({ method: "GET", url: `${url}/og` });
    assert.equal(og.statusCode, 200);
    assert.equal(og.headers["content-type"], "image/jpeg");
    assert.match(String(og.headers["cache-control"]), /^public/);
    const metadata = await sharp(og.rawPayload).metadata();
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 600);

    assert.equal(
      (await app.inject({ method: "DELETE", url, cookies: cookie("member", false) })).statusCode,
      403,
      "a member cannot remove it"
    );
    assert.equal((await app.inject({ method: "DELETE", url, cookies: cookie("admin", true) })).statusCode, 200);
    assert.equal((await app.inject({ method: "GET", url })).statusCode, 404);
  });
}

test("/app/info reports the cover and link preview without a brandpack, and playback off by default", async () => {
  let info = await appInfo();
  assert.equal(info.appShareCover, null);
  assert.equal(info.appLinkPreview, null);
  assert.equal(info.appSharePlayback, false);
  assert.equal(info.brandpack, null);

  assert.equal((await upload("/app/share-cover", await png(1200, 630))).statusCode, 200);
  info = await appInfo();
  assert.equal(info.appShareCover.width, 1200);
  assert.equal(info.appShareCover.height, 630);
  assert.equal(typeof info.appShareCover.version, "string");
  assert.equal(info.appLinkPreview, null);
  assert.equal(info.appBackground, false, "the paid background stays off without a brandpack");

  await prisma.appConfig.update({ where: { key: "appSharePlayback" }, data: { value: "true" } });
  assert.equal((await appInfo()).appSharePlayback, true);

  // An installation from before the switch has no row at all; that reads as off.
  await prisma.appConfig.delete({ where: { key: "appSharePlayback" } });
  assert.equal((await appInfo()).appSharePlayback, false);
});
