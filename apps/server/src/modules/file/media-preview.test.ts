import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";
import { isPlayableMedia, refusesMediaPreview } from "./media-preview";
import { FileService } from "./service";

test("only a non-owner preview of video or audio with playback off is refused", () => {
  const base = { isPreview: true, contentType: "video/mp4", isOwner: false, playbackEnabled: false };
  assert.equal(refusesMediaPreview(base), true);
  assert.equal(refusesMediaPreview({ ...base, contentType: "audio/mpeg" }), true);
  assert.equal(refusesMediaPreview({ ...base, playbackEnabled: true }), false, "switch on");
  assert.equal(refusesMediaPreview({ ...base, isOwner: true }), false, "the owner in the workspace");
  assert.equal(refusesMediaPreview({ ...base, isPreview: false }), false, "a download is a download");
  for (const type of ["image/png", "application/pdf", "text/plain"]) {
    assert.equal(refusesMediaPreview({ ...base, contentType: type }), false, type);
  }
  assert.equal(isPlayableMedia("Video/WebM"), true);
});

// The real file routes against a throwaway database. Storage is stubbed: the point is the
// decision before any bytes or URLs are handed out.
const database = useTestDatabase();
let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;

const originalPresign = FileService.prototype.getPresignedGetUrl;
const originalStream = FileService.prototype.getObjectStream;

before(async () => {
  FileService.prototype.getPresignedGetUrl = async (objectName: string) => `https://storage.test/${objectName}`;
  FileService.prototype.getObjectStream = async () => Readable.from([Buffer.from("bytes")]);

  ({ prisma } = await import("../../shared/prisma"));
  const { fileRoutes } = await import("./routes");

  app = fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  await app.register(fileRoutes);
  await app.ready();

  await prisma.user.create({
    data: { id: "owner", firstName: "o", lastName: "o", username: "owner", email: "owner@example.test" },
  });
  const share = await prisma.share.create({ data: { security: { create: {} } } });
  for (const [id, name] of [
    ["video", "launch.mp4"],
    ["audio", "track.mp3"],
    ["image", "poster.png"],
  ]) {
    await prisma.file.create({
      data: {
        id,
        name,
        extension: name.split(".").pop()!,
        size: 5n,
        objectName: `owner/${name}`,
        userId: "owner",
        shares: { connect: { id: share.id } },
      },
    });
  }
});

after(async () => {
  FileService.prototype.getPresignedGetUrl = originalPresign;
  FileService.prototype.getObjectStream = originalStream;
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const setPlayback = (value: string) => prisma.appConfig.update({ where: { key: "appSharePlayback" }, data: { value } });

function request(route: "download-url" | "download", objectName: string, preview: boolean, owner = false) {
  const query = `objectName=${encodeURIComponent(objectName)}${preview ? "&preview=1" : ""}`;
  return app.inject({
    method: "GET",
    url: `/files/${route}?${query}`,
    cookies: owner ? { token: app.jwt.sign({ userId: "owner", isAdmin: false }) } : undefined,
  });
}

for (const route of ["download-url", "download"] as const) {
  test(`/files/${route}: video and audio preview through a share is 403 with playback off`, async () => {
    await setPlayback("false");
    for (const objectName of ["owner/launch.mp4", "owner/track.mp3"]) {
      const refused = await request(route, objectName, true);
      assert.equal(refused.statusCode, 403, `${objectName} preview`);
      assert.match(refused.json().error, /switched off/);
      assert.equal((await request(route, objectName, false)).statusCode, 200, `${objectName} download still works`);
      assert.equal((await request(route, objectName, true, true)).statusCode, 200, `${objectName} owner preview`);
    }
    assert.equal((await request(route, "owner/poster.png", true)).statusCode, 200, "images keep their preview");
  });

  test(`/files/${route}: video and audio preview is allowed with playback on`, async () => {
    await setPlayback("true");
    for (const objectName of ["owner/launch.mp4", "owner/track.mp3"]) {
      assert.equal((await request(route, objectName, true)).statusCode, 200, objectName);
    }
  });
}

test("a missing playback row (an old install) counts as off", async () => {
  await prisma.appConfig.delete({ where: { key: "appSharePlayback" } });
  assert.equal((await request("download-url", "owner/launch.mp4", true)).statusCode, 403);
});

test("previews are not counted as downloads, refused ones neither", async () => {
  const before = await prisma.file.findUniqueOrThrow({ where: { id: "video" } });
  await request("download-url", "owner/launch.mp4", true);
  const afterwards = await prisma.file.findUniqueOrThrow({ where: { id: "video" } });
  assert.equal(afterwards.downloads, before.downloads);
});
