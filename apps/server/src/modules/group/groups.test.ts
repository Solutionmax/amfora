import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";
import { generateApiKey } from "../api-key/key";
import { FileService } from "../file/service";

// Groups end to end on the real routes. Storage is stubbed: the point is who is let through.
const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
const registered = new Set<string>();

const as = (userId: string) => ({ token: app.jwt.sign({ userId, isAdmin: userId === "boss" }) });
const SHARE_NAME = "Secret budget plan";
const FILE_NAME = "budget-2026.xlsx";
const NESTED_NAME = "q1-numbers.pdf";

let groupId = "";
let limitedId = "";
let openId = "";
let folderId = "";

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
    for (const method of [route.method].flat()) registered.add(`${method} ${route.url}`);
  });
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: "test-secret", cookie: { cookieName: "token", signed: false } });
  app.decorateRequest("jwtSign", function (this: any, payload: object) {
    return this.server.jwt.sign(payload);
  });
  await app.register(fastifyMultipart);
  registerRoutes(app);
  await app.ready();

  for (const id of ["owner", "anita", "eve", "boss", "outsider"]) {
    await prisma.user.create({
      data: {
        id,
        firstName: id,
        lastName: "Test",
        username: id,
        email: `${id}@example.test`,
        isAdmin: id === "boss",
      },
    });
  }
  const group = await prisma.group.create({
    data: { name: "Finance", members: { create: [{ userId: "anita" }, { userId: "owner" }] } },
  });
  groupId = group.id;

  const folder = await prisma.folder.create({
    data: { name: "Reports", objectName: "owner/reports", userId: "owner" },
  });
  folderId = folder.id;
  await prisma.file.create({
    data: {
      name: NESTED_NAME.replace(".pdf", ""),
      extension: "pdf",
      size: 5n,
      objectName: `owner/${NESTED_NAME}`,
      userId: "owner",
      folderId,
    },
  });
  const file = await prisma.file.create({
    data: {
      name: FILE_NAME.replace(".xlsx", ""),
      extension: "xlsx",
      size: 5n,
      objectName: `owner/${FILE_NAME}`,
      userId: "owner",
    },
  });
  const limited = await prisma.share.create({
    data: {
      name: SHARE_NAME,
      description: "private words",
      creator: { connect: { id: "owner" } },
      group: { connect: { id: groupId } },
      security: { create: {} },
      files: { connect: { id: file.id } },
      folders: { connect: { id: folderId } },
      alias: { create: { alias: "finance-plan" } },
    },
  });
  limitedId = limited.id;
  const plain = await prisma.file.create({
    data: { name: "poster", extension: "png", size: 5n, objectName: "owner/poster.png", userId: "owner" },
  });
  const open = await prisma.share.create({
    data: {
      name: "Open share",
      creator: { connect: { id: "owner" } },
      security: { create: {} },
      files: { connect: { id: plain.id } },
      alias: { create: { alias: "open-share" } },
    },
  });
  openId = open.id;
});

after(async () => {
  FileService.prototype.getPresignedGetUrl = originalPresign;
  FileService.prototype.getObjectStream = originalStream;
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const get = (url: string, user?: string) => app.inject({ method: "GET", url, cookies: user ? as(user) : undefined });
const send = (method: "POST" | "PATCH" | "PUT" | "DELETE", url: string, user?: string, payload?: object) =>
  app.inject({ method, url, cookies: user ? as(user) : undefined, payload });

/** Every way a visitor can read the limited share or one of its files. */
const readers = () => [
  `/shares/${limitedId}`,
  `/shares/alias/finance-plan`,
  `/shares/alias/finance-plan/metadata`,
  `/files/download-url?objectName=owner/${FILE_NAME}`,
  `/files/download-url?objectName=owner/${FILE_NAME}&preview=1`,
  `/files/download?objectName=owner/${FILE_NAME}`,
  `/files/download-url?objectName=owner/${NESTED_NAME}`,
  `/files/download?objectName=owner/${NESTED_NAME}`,
  `/shares/${limitedId}/folders/${folderId}/contents`,
  `/shares/${limitedId}/folders/${folderId}/download`,
];

test("a signed out visitor is only told to sign in, on every route", async () => {
  for (const url of readers()) {
    const res = await get(url);
    if (url.endsWith("/metadata")) continue; // metadata is answered below
    assert.equal(res.statusCode, 403, `${url} answered ${res.statusCode}`);
    assert.equal(res.json().code, "GROUP_SIGN_IN_REQUIRED", url);
    for (const secret of [SHARE_NAME, FILE_NAME, NESTED_NAME, "Finance", "private words"]) {
      assert.ok(!res.body.includes(secret), `${url} leaked ${secret}`);
    }
  }
});

test("a signed in non member learns the group name and nothing else", async () => {
  for (const url of readers()) {
    if (url.endsWith("/metadata")) continue;
    const res = await get(url, "eve");
    assert.equal(res.statusCode, 403, `${url} answered ${res.statusCode}`);
    assert.equal(res.json().code, "GROUP_NOT_MEMBER", url);
    assert.deepEqual(res.json().group, { name: "Finance" }, url);
    for (const secret of [SHARE_NAME, FILE_NAME, NESTED_NAME, "private words"]) {
      assert.ok(!res.body.includes(secret), `${url} leaked ${secret}`);
    }
  }
});

test("the metadata for link previews never carries the name, text or counts of a group share", async () => {
  for (const user of [undefined, "eve", "anita"]) {
    const res = await get("/shares/alias/finance-plan/metadata", user);
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.name, null);
    assert.equal(body.description, null);
    assert.equal(body.totalFiles, 0);
    assert.equal(body.totalFolders, 0);
    assert.equal(body.groupOnly, true);
    assert.ok(!res.body.includes(SHARE_NAME));
  }
  const open = (await get("/shares/alias/open-share/metadata")).json();
  assert.equal(open.name, "Open share");
  assert.equal(open.groupOnly, false);
});

test("a member opens the share and its files", async () => {
  const share = await get(`/shares/${limitedId}`, "anita");
  assert.equal(share.statusCode, 200);
  assert.equal(share.json().share.name, SHARE_NAME);
  assert.deepEqual(share.json().share.group, { id: groupId, name: "Finance" });
  assert.equal((await get(`/shares/alias/finance-plan`, "anita")).statusCode, 200);
  for (const url of readers()) {
    if (
      url.includes("/shares/alias") ||
      url === `/shares/${limitedId}` ||
      (url.endsWith("/download") && url.includes("/folders/"))
    )
      continue;
    assert.equal((await get(url, "anita")).statusCode, 200, url);
  }
  assert.equal((await get(`/shares/${limitedId}/folders/${folderId}/contents`, "anita")).statusCode, 200);
  assert.equal((await get(`/shares/${limitedId}/folders/${folderId}/download`, "anita")).statusCode, 200);
});

test("the owner and an administrator may open it without being members", async () => {
  await prisma.groupMembership.deleteMany({ where: { userId: "owner" } });
  assert.equal((await get(`/shares/${limitedId}`, "owner")).statusCode, 200);
  assert.equal((await get(`/shares/${limitedId}`, "boss")).statusCode, 200);
  assert.equal((await get(`/files/download-url?objectName=owner/${FILE_NAME}`, "boss")).statusCode, 200);
  assert.equal((await get(`/shares/${limitedId}/folders/${folderId}/contents`, "boss")).statusCode, 200);
  await prisma.groupMembership.create({ data: { groupId, userId: "owner" } });
});

test("a share with a password still asks for it on top of the group", async () => {
  const security = await prisma.shareSecurity.findFirstOrThrow({ where: { share: { id: limitedId } } });
  const bcrypt = (await import("bcryptjs")).default;
  await prisma.shareSecurity.update({ where: { id: security.id }, data: { password: await bcrypt.hash("pw", 4) } });
  const res = await get(`/shares/${limitedId}`, "anita");
  assert.equal(res.statusCode, 400);
  assert.match(res.json().error, /Password required/);
  assert.equal((await get(`/files/download?objectName=owner/${FILE_NAME}`, "anita")).statusCode, 401);
  await prisma.shareSecurity.update({ where: { id: security.id }, data: { password: null } });
});

test("a member who is removed loses access at once, even with a download cookie from before", async () => {
  const first = await get(`/shares/${limitedId}`, "anita");
  assert.equal(first.statusCode, 200);
  const grant = first.cookies.find((c) => c.name.startsWith("share-access-"));
  assert.ok(grant, "the share handed out a download grant");

  const removed = await send("DELETE", `/groups/${groupId}/members/anita`, "boss");
  assert.equal(removed.statusCode, 200);

  for (const url of readers()) {
    if (url.endsWith("/metadata")) continue;
    const res = await app.inject({
      method: "GET",
      url,
      cookies: { ...as("anita"), [grant!.name]: grant!.value },
    });
    assert.equal(res.statusCode, 403, `${url} answered ${res.statusCode}`);
  }
  // The same grant without a session is also refused.
  const bare = await app.inject({ method: "GET", url: readers()[3], cookies: { [grant!.name]: grant!.value } });
  assert.equal(bare.statusCode, 403);
  await send("POST", `/groups/${groupId}/members`, "boss", { userId: "anita" });
});

test("a group share is never embedded for the public", async () => {
  const file = await prisma.file.findFirstOrThrow({ where: { objectName: "owner/poster.png" } });
  assert.equal((await get(`/embed/${file.id}`)).statusCode, 200);
  await prisma.share.update({ where: { id: openId }, data: { groupId } });
  assert.equal((await get(`/embed/${file.id}`)).statusCode, 404);
  assert.equal((await get(`/files/download?objectName=owner/poster.png`)).statusCode, 403);
  await prisma.share.update({ where: { id: openId }, data: { groupId: null } });
});

test("a file in an open share and a group share stays open through the open one", async () => {
  const file = await prisma.file.findFirstOrThrow({ where: { objectName: "owner/poster.png" } });
  await prisma.share.update({ where: { id: limitedId }, data: { files: { connect: { id: file.id } } } });
  assert.equal((await get(`/files/download?objectName=owner/poster.png`)).statusCode, 200);
  await prisma.share.update({ where: { id: limitedId }, data: { files: { disconnect: { id: file.id } } } });
});

test("every route that takes a share id, an alias or an object name is walked: none serves a group share to a non member", async () => {
  const touchesAShare = (entry: string) => {
    const [method, url] = entry.split(" ");
    if (url.startsWith("/reverse-shares") || url.startsWith("/secrets")) return false;
    if (url.includes(":shareId") || url.includes(":alias")) return true;
    return method === "GET" && ["/files/download-url", "/files/download", "/embed/:id"].includes(url);
  };
  const found = [...registered].filter(touchesAShare).sort();
  const file = await prisma.file.findFirstOrThrow({ where: { objectName: `owner/${FILE_NAME}` } });
  await prisma.share.update({ where: { id: openId }, data: { groupId } });
  assert.ok(found.length >= 14, `expected the share routes, found ${found.join(", ")}`);
  for (const entry of found) {
    const [method, pattern] = entry.split(" ");
    const url = pattern
      .replace(":shareId", limitedId)
      .replace(":alias", "finance-plan")
      .replace(":folderId", folderId)
      .replace(":id", file.id)
      .concat(pattern.startsWith("/files/download") ? `?objectName=owner/${FILE_NAME}` : "");
    for (const user of [undefined, "eve"]) {
      const res = await app.inject({
        method: method as "GET",
        url,
        cookies: user ? as(user) : undefined,
        payload: method === "GET" ? undefined : {},
      });
      assert.ok(
        res.statusCode >= 400 || pattern.endsWith("/metadata"),
        `${entry} as ${user ?? "visitor"} answered ${res.statusCode}`
      );
      for (const secret of [SHARE_NAME, FILE_NAME, NESTED_NAME, "private words"]) {
        assert.ok(!res.body.includes(secret), `${entry} as ${user ?? "visitor"} leaked ${secret}`);
      }
    }
  }
  await prisma.share.update({ where: { id: openId }, data: { groupId: null } });
});

test("group management: administrators only, names are unique", async () => {
  assert.equal((await send("POST", "/groups", "eve", { name: "Hackers" })).statusCode, 403);
  assert.equal((await send("POST", "/groups")).statusCode, 401);
  assert.equal((await get("/groups", "eve")).statusCode, 403);
  const made = await send("POST", "/groups", "boss", { name: "  Support  ", description: "Helpdesk" });
  assert.equal(made.statusCode, 201);
  assert.equal(made.json().group.name, "Support");
  assert.equal((await send("POST", "/groups", "boss", { name: "Support" })).statusCode, 409);
  assert.equal((await send("POST", "/groups", "boss", { name: "   " })).statusCode, 400);
  const id = made.json().group.id;
  assert.equal((await send("PATCH", `/groups/${id}`, "eve", { name: "x" })).statusCode, 403);
  assert.equal((await send("PATCH", `/groups/${id}`, "boss", { name: "Finance" })).statusCode, 409);
  assert.equal((await send("PATCH", `/groups/${id}`, "boss", { name: "Helpdesk" })).json().group.name, "Helpdesk");
  assert.equal((await send("POST", `/groups/${id}/members`, "eve", { userId: "eve" })).statusCode, 403);
  const added = await send("POST", `/groups/${id}/members`, "boss", { userId: "eve" });
  assert.equal(added.json().group.members.length, 1);
  assert.equal((await send("POST", `/groups/${id}/members`, "boss", { userId: "nobody" })).statusCode, 404);
  assert.equal((await send("DELETE", `/groups/${id}/members/eve`, "eve")).statusCode, 403);
  assert.equal((await send("DELETE", `/groups/${id}`, "eve")).statusCode, 403);
  assert.equal((await send("DELETE", `/groups/${id}`, "boss")).statusCode, 200);
  assert.equal(await prisma.groupMembership.count({ where: { groupId: id } }), 0);
});

test("adding and removing a member leaves a line in that member's log", async () => {
  const lines = await prisma.activityEvent.findMany({
    where: { ownerId: "anita", action: { in: ["account.group_added", "account.group_removed"] } },
  });
  assert.ok(lines.some((l) => l.action === "account.group_removed" && l.subject === "Finance" && l.actorId === "boss"));
  assert.ok(lines.some((l) => l.action === "account.group_added" && l.actorId === "boss"));
});

test("deleting a group that shares use is refused with the count, and the share stays limited", async () => {
  const res = await send("DELETE", `/groups/${groupId}`, "boss");
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, "GROUP_IN_USE");
  assert.equal(res.json().shares, 1);
  assert.equal((await prisma.share.findUniqueOrThrow({ where: { id: limitedId } })).groupId, groupId);
  await assert.rejects(prisma.group.delete({ where: { id: groupId } }), "the schema itself refuses it");
});

test("after the share is open again the group can be deleted", async () => {
  const other = await prisma.group.create({ data: { name: "Temp", members: { create: { userId: "eve" } } } });
  const share = await prisma.share.create({
    data: { creator: { connect: { id: "owner" } }, group: { connect: { id: other.id } }, security: { create: {} } },
  });
  assert.equal((await send("DELETE", `/groups/${other.id}`, "boss")).statusCode, 409);
  await prisma.share.update({ where: { id: share.id }, data: { groupId: null } });
  assert.equal((await send("DELETE", `/groups/${other.id}`, "boss")).statusCode, 200);
});

test("deleting a user removes the memberships", async () => {
  await prisma.user.create({
    data: { id: "temp", firstName: "t", lastName: "t", username: "temp", email: "t@x.test" },
  });
  await send("POST", `/groups/${groupId}/members`, "boss", { userId: "temp" });
  await prisma.user.delete({ where: { id: "temp" } });
  assert.equal(await prisma.groupMembership.count({ where: { userId: "temp" } }), 0);
});

test("who may pick which group", async () => {
  const mine = (await get("/groups/pickable", "anita")).json().groups.map((g: any) => g.name);
  assert.deepEqual(mine, ["Finance"]);
  assert.deepEqual((await get("/groups/pickable", "eve")).json().groups, []);
  assert.ok((await get("/groups/pickable", "boss")).json().groups.length >= 1);
  assert.equal((await get("/groups/pickable")).statusCode, 401);
});

test("creating and changing a share: a member may pick their group, a non member may not, an administrator may pick any", async () => {
  const file = await prisma.file.create({
    data: { name: "mine", extension: "txt", size: 1n, objectName: "anita/mine.txt", userId: "anita" },
  });
  const make = (user: string, groupId?: string | null) =>
    send("POST", "/shares", user, { name: "x", files: [file.id], ...(groupId !== undefined ? { groupId } : {}) });
  const ok = await make("anita", groupId);
  assert.equal(ok.statusCode, 201);
  assert.deepEqual(ok.json().share.group, { id: groupId, name: "Finance" });
  const bad = await make("eve", groupId);
  assert.equal(bad.statusCode, 400);
  assert.match(bad.json().error, /member/);
  const efile = await prisma.file.create({
    data: { name: "e", extension: "txt", size: 1n, objectName: "eve/e.txt", userId: "eve" },
  });
  assert.equal(
    (await send("POST", "/shares", "boss", { files: [file.id] })).statusCode,
    400,
    "not the admin's own file"
  );
  assert.equal((await send("POST", "/shares", "eve", { files: [efile.id], groupId: "nope" })).statusCode, 400);

  const id = ok.json().share.id;
  const cleared = await send("PUT", "/shares", "anita", { id, groupId: null });
  assert.equal(cleared.statusCode, 200);
  assert.equal(cleared.json().share.group, null);
  const back = await send("PUT", "/shares", "anita", { id, groupId });
  assert.equal(back.json().share.groupId, groupId);
  await prisma.groupMembership.deleteMany({ where: { userId: "anita" } });
  assert.equal(
    (await send("PUT", "/shares", "anita", { id, groupId })).statusCode,
    200,
    "unchanged group is not judged again"
  );
  assert.equal((await send("PUT", "/shares", "anita", { id, name: "renamed" })).statusCode, 200);
  await prisma.share.update({ where: { id }, data: { groupId: null } });
  assert.equal((await send("PUT", "/shares", "anita", { id, groupId })).statusCode, 400, "no longer a member");
  await prisma.groupMembership.create({ data: { groupId, userId: "anita" } });
});

test("Shared with me lists only the other people's shares limited to my groups", async () => {
  const anita = (await get("/shares/shared-with-me", "anita")).json().shares;
  assert.deepEqual(
    anita.map((s: any) => s.id),
    [limitedId]
  );
  assert.deepEqual(Object.keys(anita[0]).sort(), ["alias", "createdAt", "expiration", "group", "id", "name", "owner"]);
  assert.equal(anita[0].alias, "finance-plan");
  assert.deepEqual((await get("/shares/shared-with-me", "eve")).json().shares, []);
  assert.deepEqual((await get("/shares/shared-with-me", "owner")).json().shares, [], "never the own ones");
  assert.deepEqual((await get("/shares/shared-with-me", "boss")).json().shares, [], "an administrator needs no list");
  assert.equal((await get("/shares/shared-with-me")).statusCode, 401);
});

test("reading a group share through an API key follows the same rule, with the key's user", async () => {
  const keyFor = async (userId: string) => {
    const key = generateApiKey();
    await prisma.apiKey.create({
      data: { name: userId, hash: key.hash, prefix: key.prefix, scope: "full", userId },
    });
    return key.token;
  };
  const call = (token: string, url: string) =>
    app.inject({ method: "GET", url, headers: { authorization: `Bearer ${token}` } });
  const member = await keyFor("anita");
  const stranger = await keyFor("eve");
  const admin = await keyFor("boss");
  assert.equal((await call(member, `/shares/${limitedId}`)).statusCode, 200);
  assert.equal((await call(stranger, `/shares/${limitedId}`)).statusCode, 403);
  assert.equal((await call(stranger, `/shares/${limitedId}`)).json().code, "GROUP_NOT_MEMBER");
  assert.equal((await call(admin, `/shares/${limitedId}`)).statusCode, 200, "the administrator behind the key");
  assert.equal((await call(stranger, `/files/download-url?objectName=owner/${FILE_NAME}`)).statusCode, 403);
  assert.equal((await call(member, `/files/download-url?objectName=owner/${FILE_NAME}`)).statusCode, 200);
});

test("opening a group share as a member writes the member as the actor", async () => {
  await prisma.activityEvent.deleteMany({});
  // A fresh address: repeats from one address within the hour are left out of the log.
  const fresh = (url: string) => app.inject({ method: "GET", url, cookies: as("anita"), remoteAddress: "10.9.9.9" });
  await fresh(`/shares/alias/finance-plan`);
  await fresh(`/files/download-url?objectName=owner/${FILE_NAME}`);
  const events = await prisma.activityEvent.findMany({ where: { subjectId: limitedId } });
  const opened = events.find((e) => e.action === "share.opened");
  const downloaded = events.find((e) => e.action === "share.downloaded");
  assert.equal(opened?.actorId, "anita");
  assert.equal(downloaded?.actorId, "anita");
});
