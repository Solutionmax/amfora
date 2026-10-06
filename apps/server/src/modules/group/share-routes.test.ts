import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";
import { FileService } from "../file/service";

// The walk over every route that can show a share, a file or a folder. A new route under
// /shares, /files, /folders or /embed must be put on one of the lists below, so it cannot skip the group rule unseen.
const database = useTestDatabase();

/** Routes that serve a share, its files or its folders to people who are not its maker. */
const SERVES_SHARE_CONTENT = [
  "GET /shares/:shareId",
  "GET /shares/alias/:alias",
  "GET /shares/:shareId/folders/:folderId/contents",
  "GET /shares/:shareId/folders/:folderId/download",
  "GET /files/download",
  "GET /files/download-url",
] as const;
/** Answers anyone, but must say nothing of a group share. */
const PREVIEW_FOR_ANYONE = ["GET /shares/alias/:alias/metadata"] as const;
/** Public by design, never for a file in a group share. */
const NEVER_FOR_GROUP_SHARES = ["GET /embed/:id"] as const;
/** Only the signed in owner of the thing they name, group members have no say here. */
const MAKER_ONLY = [
  "DELETE /files/:id",
  "DELETE /folders/:id",
  "DELETE /shares/:id",
  "DELETE /shares/:shareId/items",
  "DELETE /shares/:shareId/recipients",
  "GET /files",
  "GET /files/multipart/part-url",
  "GET /files/presigned-url",
  "GET /folders",
  "GET /shares/me",
  "GET /shares/shared-with-me",
  "PATCH /files/:id",
  "PATCH /folders/:id",
  "PATCH /shares/:id/notifications",
  "PATCH /shares/:shareId/password",
  "POST /files",
  "POST /files/check",
  "POST /files/multipart/abort",
  "POST /files/multipart/complete",
  "POST /files/multipart/create",
  "POST /folders",
  "POST /folders/check",
  "POST /shares",
  "POST /shares/:shareId/alias",
  "POST /shares/:shareId/items",
  "POST /shares/:shareId/notify",
  "POST /shares/:shareId/recipients",
  "PUT /files/:id/move",
  "PUT /folders/:id/move",
  "PUT /shares",
] as const;

const SHARE_NAME = "Secret budget plan";
const FILE_NAME = "budget-2026.xlsx";
const NESTED_NAME = "q1-numbers.pdf";
const SECRETS = [SHARE_NAME, FILE_NAME, NESTED_NAME, "private words"];

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
const registered = new Set<string>();
const ids = { group: "", limited: "", open: "", folder: "", file: "" };

const originalPresign = FileService.prototype.getPresignedGetUrl;
const originalStream = FileService.prototype.getObjectStream;

before(async () => {
  FileService.prototype.getPresignedGetUrl = async (objectName: string) => `https://storage.test/${objectName}`;
  FileService.prototype.getObjectStream = async () => Readable.from([Buffer.from("bytes")]);
  ({ prisma } = await import("../../shared/prisma"));
  const { registerRoutes } = await import("../../routes");
  app = fastify({ ignoreTrailingSlash: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook("onRoute", (route) => {
    for (const method of [route.method].flat()) if (method !== "HEAD") registered.add(`${method} ${route.url}`);
  });
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  app.decorateRequest("jwtSign", function (this: any, payload: object) {
    return this.server.jwt.sign(payload);
  });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  for (const id of ["owner", "anita", "eve", "gone", "slow"]) {
    await prisma.user.create({
      data: { id, firstName: id, lastName: "Test", username: id, email: `${id}@example.test`, isActive: id !== "gone" },
    });
  }
  const members = ["anita", "owner", "gone", "slow"].map((userId) => ({ userId }));
  ids.group = (await prisma.group.create({ data: { name: "Finance", members: { create: members } } })).id;
  const file = (name: string, ext: string, extra: object = {}) =>
    prisma.file.create({
      data: { name, extension: ext, size: 5n, objectName: `owner/${name}.${ext}`, userId: "owner", ...extra },
    });
  ids.folder = (
    await prisma.folder.create({ data: { name: "Reports", objectName: "owner/reports", userId: "owner" } })
  ).id;
  const nested = await file("q1-numbers", "pdf", { folderId: ids.folder });
  ids.file = (await file("budget-2026", "xlsx")).id;
  ids.limited = (
    await prisma.share.create({
      data: {
        name: SHARE_NAME,
        description: "private words",
        creator: { connect: { id: "owner" } },
        group: { connect: { id: ids.group } },
        security: { create: {} },
        files: { connect: [{ id: ids.file }, { id: nested.id }] },
        folders: { connect: { id: ids.folder } },
        alias: { create: { alias: "finance-plan" } },
      },
    })
  ).id;
  ids.open = (
    await prisma.share.create({
      data: {
        name: "Open share",
        creator: { connect: { id: "owner" } },
        security: { create: {} },
        alias: { create: { alias: "open-share" } },
      },
    })
  ).id;
});

after(async () => {
  FileService.prototype.getPresignedGetUrl = originalPresign;
  FileService.prototype.getObjectStream = originalStream;
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const as = (userId: string) => ({ token: app.jwt.sign({ userId, isAdmin: false }) });
const fill = (pattern: string, shareId = ids.limited) =>
  pattern
    .replace(":shareId", shareId)
    .replace(":alias", shareId === ids.limited ? "finance-plan" : "open-share")
    .replace(":folderId", ids.folder)
    .replace(":id", ids.file)
    .concat(pattern.includes("/files/download") ? `?objectName=owner/${FILE_NAME}` : "");
const call = (entry: string, user?: string, shareId = ids.limited) => {
  const [method, pattern] = entry.split(" ");
  return app.inject({
    method: method as "GET",
    url: fill(pattern, shareId),
    cookies: user ? as(user) : undefined,
    payload: method === "GET" ? undefined : {},
  });
};
const assertNoSecrets = (body: string, who: string) => {
  for (const secret of SECRETS) assert.ok(!body.includes(secret), `${who} leaked ${secret}`);
};

test("every registered route under /shares, /files, /folders and /embed is on exactly one list", () => {
  const lists = [SERVES_SHARE_CONTENT, PREVIEW_FOR_ANYONE, NEVER_FOR_GROUP_SHARES, MAKER_ONLY].flat() as string[];
  assert.equal(new Set(lists).size, lists.length, "a route is on two lists");
  const inScope = [...registered].filter((entry) => /^\S+ \/(shares|files|folders|embed)(\/|$)/.test(entry));
  const unlisted = inScope.filter((entry) => !lists.includes(entry));
  assert.deepEqual(unlisted, [], "put these routes on a list, after checking the group rule on them");
  const gone = lists.filter((entry) => !registered.has(entry));
  assert.deepEqual(gone, [], "these listed routes no longer exist");
});

test("a visitor is only told to sign in", async () => {
  for (const entry of SERVES_SHARE_CONTENT) {
    const res = await call(entry);
    assert.equal(res.statusCode, 403, `${entry} answered ${res.statusCode}`);
    assert.equal(res.json().code, "GROUP_SIGN_IN_REQUIRED", entry);
    assertNoSecrets(res.body, `${entry} for a visitor`);
  }
});

test("a signed in non member learns the group name and nothing else", async () => {
  for (const entry of SERVES_SHARE_CONTENT) {
    const res = await call(entry, "eve");
    assert.equal(res.statusCode, 403, `${entry} answered ${res.statusCode}`);
    assert.equal(res.json().code, "GROUP_NOT_MEMBER", entry);
    assert.deepEqual(res.json().group, { name: "Finance" }, entry);
    assertNoSecrets(res.body, `${entry} for a non member`);
  }
});

test("a member gets the content from every one of them (positive control)", async () => {
  for (const entry of SERVES_SHARE_CONTENT) {
    const res = await call(entry, "anita");
    assert.equal(res.statusCode, 200, `${entry} answered ${res.statusCode}`);
  }
});

test("a deactivated member is a visitor", async () => {
  for (const entry of SERVES_SHARE_CONTENT) {
    const res = await call(entry, "gone");
    assert.equal(res.statusCode, 403, `${entry} answered ${res.statusCode}`);
    assert.equal(res.json().code, "GROUP_SIGN_IN_REQUIRED", entry);
  }
});

test("a member who must still set up a second step is a visitor or a non member, never a reader", async () => {
  await prisma.appConfig.update({ where: { key: "twoFactorRequired" }, data: { value: "all" } });
  try {
    for (const entry of SERVES_SHARE_CONTENT) {
      const res = await call(entry, "slow");
      assert.equal(res.statusCode, 403, `${entry} answered ${res.statusCode}`);
      assert.match(res.json().code, /^GROUP_(SIGN_IN_REQUIRED|NOT_MEMBER)$/, entry);
      assertNoSecrets(res.body, `${entry} for a held back member`);
    }
  } finally {
    await prisma.appConfig.update({ where: { key: "twoFactorRequired" }, data: { value: "off" } });
  }
});

test("the link preview of a group share says nothing of it, to anybody", async () => {
  for (const entry of PREVIEW_FOR_ANYONE) {
    for (const user of [undefined, "eve", "anita"]) {
      const res = await call(entry, user);
      assert.equal(res.statusCode, 200, entry);
      assertNoSecrets(res.body, `${entry} as ${user ?? "visitor"}`);
      assert.equal(res.json().groupOnly, true);
    }
  }
});

test("a file of a group share is never embedded, not even for a member", async () => {
  for (const entry of NEVER_FOR_GROUP_SHARES) {
    for (const user of [undefined, "eve", "anita"]) {
      assert.equal((await call(entry, user)).statusCode, 404, `${entry} as ${user ?? "visitor"}`);
    }
  }
});

test("the maker only routes refuse a visitor, and a group member gets nothing from them", async () => {
  for (const entry of MAKER_ONLY) {
    const visitor = await call(entry);
    assert.ok(visitor.statusCode >= 400, `${entry} as visitor answered ${visitor.statusCode}`);
    assertNoSecrets(visitor.body, `${entry} for a visitor`);
    if (!entry.split(" ")[1].startsWith("/shares/:")) continue;
    const member = await call(entry, "anita");
    assert.ok(member.statusCode >= 400, `${entry} as member answered ${member.statusCode}`);
    assertNoSecrets(member.body, `${entry} for a member`);
  }
  assert.equal(await prisma.share.count({ where: { id: ids.limited } }), 1, "the share is still there");
});

test("a file in an open share and a group share is served through the open one", async () => {
  await prisma.share.update({ where: { id: ids.open }, data: { files: { connect: { id: ids.file } } } });
  for (const entry of ["GET /files/download", "GET /files/download-url"]) {
    assert.equal((await call(entry)).statusCode, 200, `${entry} for a visitor`);
    assert.equal((await call(entry, "eve")).statusCode, 200, `${entry} for a non member`);
  }
  await prisma.share.update({ where: { id: ids.open }, data: { files: { disconnect: { id: ids.file } } } });
  assert.equal((await call("GET /files/download")).statusCode, 403);
});

test("a folder in an open share and a group share is open through the open one only", async () => {
  await prisma.share.update({ where: { id: ids.open }, data: { folders: { connect: { id: ids.folder } } } });
  try {
    for (const entry of [
      "GET /shares/:shareId/folders/:folderId/contents",
      "GET /shares/:shareId/folders/:folderId/download",
    ]) {
      assert.equal((await call(entry, undefined, ids.open)).statusCode, 200, `${entry} through the open share`);
      assert.equal((await call(entry)).statusCode, 403, `${entry} through the group share`);
    }
    const nested = `/files/download?objectName=owner/${NESTED_NAME}`;
    assert.equal((await app.inject({ method: "GET", url: nested })).statusCode, 200);
  } finally {
    await prisma.share.update({ where: { id: ids.open }, data: { folders: { disconnect: { id: ids.folder } } } });
  }
  assert.equal(
    (await app.inject({ method: "GET", url: `/files/download?objectName=owner/${NESTED_NAME}` })).statusCode,
    403
  );
});

test("a download address for a file of a group share lives 300 seconds at most, an open share's keeps the full time", async () => {
  const stub = FileService.prototype.getPresignedGetUrl;
  const asked: number[] = [];
  const recorder = async (objectName: string, expires: number) => {
    asked.push(expires);
    return `https://storage.test/${objectName}`;
  };
  FileService.prototype.getPresignedGetUrl = recorder as typeof stub;
  try {
    const full = Number.parseInt(process.env.PRESIGNED_URL_EXPIRATION ?? "3600");
    const group = await call("GET /files/download-url", "anita");
    assert.equal(group.statusCode, 200);
    assert.ok(group.json().expiresIn <= 300, `answered ${group.json().expiresIn}`);
    const zip = await call("GET /shares/:shareId/folders/:folderId/download", "anita");
    assert.equal(zip.statusCode, 200);
    assert.ok(zip.json().expiresIn <= 300, `zip answered ${zip.json().expiresIn}`);
    assert.ok(asked.length >= 2 && asked.every((seconds) => seconds <= 300), `asked for ${asked.join(", ")}`);

    await prisma.share.update({ where: { id: ids.open }, data: { files: { connect: { id: ids.file } } } });
    const open = await call("GET /files/download-url");
    assert.equal(open.json().expiresIn, full, "served through the open share");
    await prisma.share.update({ where: { id: ids.open }, data: { files: { disconnect: { id: ids.file } } } });
  } finally {
    FileService.prototype.getPresignedGetUrl = stub;
  }
});

test("the link preview of a group share does not tell whether it has a password, ran out or expired", async () => {
  const security = await prisma.shareSecurity.findFirstOrThrow({ where: { share: { id: ids.limited } } });
  const bcrypt = (await import("bcryptjs")).default;
  await prisma.shareSecurity.update({
    where: { id: security.id },
    data: { password: await bcrypt.hash("pw", 4), maxViews: 1 },
  });
  await prisma.share.update({
    where: { id: ids.limited },
    data: { views: 5, expiration: new Date(Date.now() - 1000) },
  });
  try {
    for (const user of [undefined, "eve", "anita"]) {
      const body = (await call("GET /shares/alias/:alias/metadata", user)).json();
      assert.deepEqual(
        [body.hasPassword, body.isExpired, body.isMaxViewsReached, body.groupOnly],
        [false, false, false, true],
        user ?? "visitor"
      );
    }
  } finally {
    await prisma.shareSecurity.update({ where: { id: security.id }, data: { password: null, maxViews: null } });
    await prisma.share.update({ where: { id: ids.limited }, data: { views: 0, expiration: null } });
  }
});
