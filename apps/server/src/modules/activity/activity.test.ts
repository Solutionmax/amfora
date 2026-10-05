import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import bcrypt from "bcryptjs";
import { fastify, FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { useTestDatabase } from "../../../test-support/test-db";
import { noticeHtml, safeColor } from "../email/notice";
import { clientAddress, formatPlace, isPrivateAddress, LOCAL_NETWORK, placeOf } from "./place";
import { QuietPeriod } from "./quiet";
import { csvCell } from "./routes";
import { signWebhook } from "./webhook";

const database = useTestDatabase();

let app: FastifyInstance;
let prisma: typeof import("../../shared/prisma").prisma;
let activity: typeof import("./activity");
let notify: typeof import("./notify");
let webhook: typeof import("./webhook");

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  activity = await import("./activity");
  notify = await import("./notify");
  webhook = await import("./webhook");
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

  const password = await bcrypt.hash("right-password", 4);
  for (const id of ["alice", "bob", "root"]) {
    await prisma.user.create({
      data: {
        id,
        firstName: id,
        lastName: "Test",
        username: id,
        email: `${id}@example.test`,
        password,
        isAdmin: id === "root",
      },
    });
  }
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  database.cleanup();
});

const session = (userId: string) => ({ token: app.jwt.sign({ userId, isAdmin: userId === "root" }) });
const setConfig = (key: string, value: string) => prisma.appConfig.update({ where: { key }, data: { value } });
const list = async (userId: string, query = "") =>
  (await app.inject({ method: "GET", url: `/activity${query}`, cookies: session(userId) })).json() as {
    events: Array<Record<string, any>>;
    counts: Record<string, number>;
    summary: Record<string, { thisWeek: number; lastWeek: number }>;
    hasMore: boolean;
  };
const actionsOf = async (userId: string, query = "") => (await list(userId, query)).events.map((event) => event.action);

async function makeShare(creatorId: string, name: string, extra: object = {}) {
  const security = await prisma.shareSecurity.create({ data: {} });
  const share = await prisma.share.create({ data: { name, creatorId, securityId: security.id, ...extra } });
  await prisma.shareAlias.create({ data: { alias: `alias-${share.id}`, shareId: share.id } });
  return share;
}

test("a private address is the local network, an unknown one has no place", async () => {
  for (const ip of ["10.1.2.3", "192.168.18.5", "172.20.0.1", "127.0.0.1", "::1", "fd00::1", "::ffff:192.168.1.1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "172.32.0.1", "2001:4860:4860::8888"]) assert.equal(isPrivateAddress(ip), false, ip);

  assert.equal(await placeOf("192.168.18.5", "city"), LOCAL_NETWORK);
  assert.equal(await placeOf("192.168.18.5", "off"), null);
  assert.equal(await placeOf("8.8.8.8", "city"), null, "no database in the test environment");
  assert.equal(await placeOf("not an address", "city"), null);
  assert.equal(await placeOf(undefined, "city"), null);
});

test("a place is a city and country code, or the country alone", () => {
  const found = { city: { names: { en: "Alicante" } }, country: { iso_code: "ES", names: { en: "Spain" } } } as any;
  assert.equal(formatPlace(found, "city"), "Alicante, ES");
  assert.equal(formatPlace(found, "country"), "Spain");
  assert.equal(formatPlace({ country: found.country } as any, "city"), "Spain");
  assert.equal(formatPlace(null, "city"), null);
});

test("the address named by Cloudflare wins only when it is an address", () => {
  assert.equal(
    clientAddress({ headers: { "cf-connecting-ip": "203.0.113.9" }, ip: "127.0.0.1" } as any),
    "203.0.113.9"
  );
  assert.equal(clientAddress({ headers: { "cf-connecting-ip": "<script>" }, ip: "127.0.0.1" } as any), "127.0.0.1");
  assert.equal(clientAddress({ headers: {}, ip: "10.0.0.7" } as any), "10.0.0.7");
});

test("csv cells are quoted and cannot start a formula", () => {
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("=HYPERLINK(1)"), `"'=HYPERLINK(1)"`);
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(3), '"3"');
});

test("a notice escapes what a maker typed and only takes a plain colour", () => {
  const html = noticeHtml(
    {
      subject: "s",
      title: "t",
      text: 'from <b>x</b> & "y"',
      rows: [["File", "<img src=x onerror=1>.pdf"]],
      button: { label: "Open", url: 'https://a.test/x?"><script>' },
      footer: "f",
    },
    { appName: "<App>", color: "red;background:url(x)" }
  );
  assert.equal(html.includes("<b>x</b>"), false);
  assert.equal(html.includes("<img"), false);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("&lt;App&gt;"), true);
  assert.equal(html.includes("background-color: #0079d2"), true);
  assert.equal(safeColor("#12abEF"), "#12abEF");
});

test("signing in writes to the log, with the typed name only when it is an account", async () => {
  const signIn = (emailOrUsername: string, password: string) =>
    app.inject({ method: "POST", url: "/auth/login", payload: { emailOrUsername, password } });

  assert.equal((await signIn("alice", "right-password")).statusCode, 200);
  assert.equal((await signIn("alice", "wrong-password")).statusCode, 400);
  assert.equal((await signIn("nobody-here", "wrong-password")).statusCode, 400);

  const mine = await list("alice", "?kind=account");
  assert.deepEqual(
    mine.events.map((event) => event.action),
    ["account.sign_in_failed", "account.signed_in"]
  );
  assert.equal(mine.events[1].actorName, "alice Test");
  assert.equal(mine.events[0].place, LOCAL_NETWORK);
  assert.equal(mine.events[0].actorName, "alice Test", "the same name as a successful sign in");

  const all = await prisma.activityEvent.findMany({ where: { action: "account.sign_in_failed" } });
  assert.equal(all.length, 2);
  assert.equal(all.filter((event) => event.ownerId === null && event.actorName === null).length, 1);
  assert.equal(JSON.stringify(all).includes("nobody-here"), false, "a name that is no account is not kept");
  assert.equal(
    JSON.stringify(await prisma.activityEvent.findMany()).includes("127.0.0.1"),
    false,
    "no address is stored"
  );
});

test("opening a share, a wrong password and deleting it all show up for the maker", async () => {
  const open = await makeShare("alice", "Project proposal");
  const locked = await makeShare("alice", "Locked");
  await prisma.shareSecurity.update({
    where: { id: locked.securityId },
    data: { password: await bcrypt.hash("pw", 4) },
  });

  assert.equal((await app.inject({ method: "GET", url: `/shares/alias/alias-${open.id}` })).statusCode, 200);
  assert.equal(
    (await app.inject({ method: "GET", url: `/shares/${open.id}`, cookies: session("alice") })).statusCode,
    200,
    "the maker looks at their own share"
  );
  const wrong = await app.inject({
    method: "GET",
    url: `/shares/alias/alias-${locked.id}`,
    headers: { "x-share-password": "nope" },
  });
  assert.equal(wrong.statusCode, 400);
  assert.equal(
    (await app.inject({ method: "DELETE", url: `/shares/${open.id}`, cookies: session("alice") })).statusCode,
    200
  );

  assert.deepEqual(await actionsOf("alice", "?kind=share"), ["share.deleted", "share.password_failed", "share.opened"]);
  const forShare = await list("alice", `?subjectId=${open.id}`);
  assert.deepEqual(
    forShare.events.map((event) => [event.action, event.subject, event.actorName]),
    [
      ["share.deleted", "Project proposal", "alice Test"],
      ["share.opened", "Project proposal", null],
    ]
  );
});

test("a user sees their own activity, an administrator everyone's, nobody without a session", async () => {
  await activity.recordActivity({ action: "share.downloaded", ownerId: "bob", subject: "Bob's", detail: "b.pdf" });
  assert.equal((await app.inject({ method: "GET", url: "/activity" })).statusCode, 401);

  const bob = await list("bob");
  assert.deepEqual(
    bob.events.map((event) => event.subject),
    ["Bob's"]
  );
  assert.equal(bob.counts.all, 1);
  assert.equal(bob.summary.downloads.thisWeek, 1);

  const root = await list("root");
  assert.equal(
    root.events.some((event) => event.subject === "Bob's"),
    true
  );
  assert.equal(
    root.events.some((event) => event.subject === "Project proposal"),
    true
  );
  assert.equal(root.counts.all, await prisma.activityEvent.count());

  assert.deepEqual(await actionsOf("root", "?q=b.pdf"), ["share.downloaded"]);
  assert.equal("ownerId" in root.events[0], false, "ids of owners stay on the server");

  await prisma.user.update({ where: { id: "root" }, data: { isAdmin: false } });
  assert.equal(
    (await list("root")).events.some((event) => event.subject === "Bob's"),
    false,
    "rights taken away end at once"
  );
  await prisma.user.update({ where: { id: "root" }, data: { isAdmin: true } });
});

test("the week figures add up files and compare with the week before", async () => {
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  await activity.recordActivity({ action: "receive.files_received", ownerId: "bob", subject: "Inbox", amount: 3 });
  await activity.recordActivity({ action: "receive.files_received", ownerId: "bob", subject: "Inbox", amount: 2 });
  await prisma.activityEvent.create({
    data: { kind: "receive", action: "receive.files_received", ownerId: "bob", amount: 4, createdAt: eightDaysAgo },
  });
  assert.deepEqual((await list("bob")).summary.filesReceived, { thisWeek: 5, lastWeek: 4 });
});

test("pages follow each other without skipping events of the same moment", async () => {
  const moment = new Date(Date.now() - 1000);
  await prisma.user.create({
    data: { id: "pager", firstName: "p", lastName: "p", username: "pager", email: "p@example.test" },
  });
  await prisma.activityEvent.createMany({
    data: Array.from({ length: 205 }, (_, i) => ({
      id: `page-${String(i).padStart(3, "0")}`,
      kind: "share",
      action: "share.opened",
      ownerId: "pager",
      createdAt: moment,
    })),
  });
  const seen = new Set<string>();
  let cursor = "";
  for (let page = 0; page < 4; page++) {
    const result = await list("pager", cursor ? `?cursor=${cursor}` : "");
    result.events.forEach((event) => seen.add(event.id));
    if (!result.hasMore) break;
    cursor = result.events[result.events.length - 1].id;
  }
  assert.equal(seen.size, 205);
});

test("the export is the same list as a file", async () => {
  const response = await app.inject({ method: "GET", url: "/activity/export?kind=share", cookies: session("bob") });
  assert.equal(response.statusCode, 200);
  assert.match(String(response.headers["content-type"]), /text\/csv/);
  const lines = response.body.split("\r\n");
  assert.equal(lines[0], '"when","action","subject","detail","amount","who","where"');
  assert.equal(lines.length, 2);
  assert.match(lines[1], /"share.downloaded","Bob's","b.pdf","","Visitor",""$/);
  assert.equal((await app.inject({ method: "GET", url: "/activity/export" })).statusCode, 401);
});

test("old activity is removed after the configured number of days", async () => {
  await setConfig("activityRetentionDays", "30");
  await prisma.activityEvent.create({
    data: { kind: "share", action: "share.opened", ownerId: "bob", createdAt: new Date(Date.now() - 31 * 86_400_000) },
  });
  await prisma.activityEvent.create({
    data: {
      kind: "share",
      action: "share.opened",
      ownerId: "bob",
      subject: "kept",
      createdAt: new Date(Date.now() - 29 * 86_400_000),
    },
  });
  assert.equal(await activity.purgeOldActivity(), 1);
  assert.equal(await prisma.activityEvent.count({ where: { subject: "kept" } }), 1);
  await setConfig("activityRetentionDays", "90");
});

test("only the maker switches the emails of a share or receive link", async () => {
  const share = await makeShare("alice", "Mine");
  const patch = (userId: string, body: object) =>
    app.inject({ method: "PATCH", url: `/shares/${share.id}/notifications`, cookies: session(userId), payload: body });

  assert.equal((await patch("bob", { notifyOnDownload: true })).statusCode, 404);
  assert.deepEqual((await patch("alice", { notifyOnDownload: true })).json(), {
    notifyOnDownload: true,
    remindBeforeExpiry: false,
  });
  assert.deepEqual((await patch("alice", { remindBeforeExpiry: true })).json(), {
    notifyOnDownload: true,
    remindBeforeExpiry: true,
  });
  const loaded = await app.inject({ method: "GET", url: `/shares/${share.id}`, cookies: session("alice") });
  assert.equal(loaded.json().share.notifyOnDownload, true);

  const link = await prisma.reverseShare.create({ data: { name: "Inbox", creatorId: "alice" } });
  const patchLink = (userId: string) =>
    app.inject({
      method: "PATCH",
      url: `/reverse-shares/${link.id}/notifications`,
      cookies: session(userId),
      payload: { remindBeforeExpiry: true },
    });
  assert.equal((await patchLink("bob")).statusCode, 404);
  assert.equal((await patchLink("alice")).statusCode, 200);
  assert.equal((await prisma.reverseShare.findUnique({ where: { id: link.id } }))?.remindBeforeExpiry, true);
});

test("a reminder goes out once per end date, and again when the end date moves", async () => {
  const day = 86_400_000;
  const soon = await makeShare("alice", "Ends soon", {
    remindBeforeExpiry: true,
    expiration: new Date(Date.now() + 2 * day),
  });
  await makeShare("alice", "Ends later", { remindBeforeExpiry: true, expiration: new Date(Date.now() + 10 * day) });
  await makeShare("alice", "Not asked", { expiration: new Date(Date.now() + day) });
  await makeShare("alice", "Already over", { remindBeforeExpiry: true, expiration: new Date(Date.now() - day) });
  await prisma.reverseShare.updateMany({ data: { remindBeforeExpiry: false } });

  assert.equal(await notify.sendExpiryReminders(), 1);
  assert.equal(await notify.sendExpiryReminders(), 0, "not again for the same end date");

  await prisma.share.update({ where: { id: soon.id }, data: { expiration: new Date(Date.now() + 1 * day) } });
  assert.equal(await notify.sendExpiryReminders(), 1, "a moved end date is reminded again");

  await setConfig("notifyExpiryEnabled", "false");
  await prisma.share.update({ where: { id: soon.id }, data: { expiryReminderFor: null } });
  assert.equal(await notify.sendExpiryReminders(), 0, "switched off by the administrator");
  await setConfig("notifyExpiryEnabled", "true");
});

test("a quiet period remembers per key, and when full forgets only the oldest", () => {
  const quiet = new QuietPeriod(60_000, 2);
  assert.equal(quiet.isRepeat("a", 0), false);
  assert.equal(quiet.isRepeat("a", 59_000), true);
  assert.equal(quiet.isRepeat("a", 61_000), false, "the period is over");
  assert.equal(quiet.isRepeat("b", 61_000), false);
  assert.equal(quiet.isRepeat("c", 62_000), false, "full: a, the oldest, makes room");
  assert.equal(quiet.isRepeat("b", 62_000), true, "b is still remembered");
  assert.equal(quiet.isRepeat("a", 62_000), false);
});

test("a visitor repeating themselves is one line, and a flood stops at the ceiling", async () => {
  const share = await makeShare("bob", "Popular");
  const visit = (ip: string) =>
    app.inject({ method: "GET", url: `/shares/alias/alias-${share.id}`, headers: { "cf-connecting-ip": ip } });
  const lines = () => prisma.activityEvent.count({ where: { subjectId: share.id, action: "share.opened" } });

  for (let i = 0; i < 5; i++) await visit("203.0.113.1");
  assert.equal(await lines(), 1);
  await visit("203.0.113.2");
  assert.equal(await lines(), 2, "another visitor is another line");

  const already = await prisma.activityEvent.count({
    where: { ownerId: "bob", actorId: null, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  await prisma.activityEvent.createMany({
    data: Array.from({ length: 300 - already }, () => ({ kind: "share", action: "share.opened", ownerId: "bob" })),
  });
  await visit("203.0.113.3");
  assert.equal(await lines(), 2, "past the ceiling a stranger adds nothing");
  assert.equal((await visit("203.0.113.3")).statusCode, 200, "the share itself keeps working");
  await prisma.activityEvent.deleteMany({ where: { ownerId: "bob", subject: null, action: "share.opened" } });
});

test("the label of a secret is for its maker, also in an administrator's view and export", async () => {
  await activity.recordActivity({
    action: "secret.opened",
    ownerId: "bob",
    subject: "Bob's root password",
    subjectId: "sx",
  });
  const forBob = (await list("bob", "?subjectId=sx")).events[0];
  const forRoot = (await list("root", "?subjectId=sx")).events[0];
  assert.equal(forBob.subject, "Bob's root password");
  assert.equal(forRoot.subject, null);
  assert.equal(forRoot.action, "secret.opened");
  const csv = await app.inject({ method: "GET", url: "/activity/export?kind=secret", cookies: session("root") });
  assert.equal(csv.body.includes("root password"), false);
});

test("a webhook is signed, only sent for switched on events, and never throws", async () => {
  const received: Array<{ body: string; signature: string | undefined }> = [];
  const server = createServer((request: IncomingMessage, response) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      received.push({ body, signature: request.headers["x-amfora-signature"] as string | undefined });
      response.end("ok");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`;

  try {
    await webhook.sendWebhook("share.downloaded", { file: "a.pdf" });
    assert.equal(received.length, 0, "no address, no call");

    await setConfig("webhookUrl", url);
    await webhook.sendWebhook("share.downloaded", { file: "a.pdf" });
    await webhook.sendWebhook("secret.opened", { secret: "x" });
    assert.equal(received.length, 1, "secret.opened is off by default");

    const secret = (await prisma.appConfig.findUnique({ where: { key: "webhookSecret" } }))!.value;
    assert.equal(secret.length, 64);
    assert.equal(received[0].signature, signWebhook(received[0].body, secret));
    const payload = JSON.parse(received[0].body);
    assert.equal(payload.event, "share.downloaded");
    assert.deepEqual(payload.data, { file: "a.pdf" });

    await setConfig("webhookUrl", "http://127.0.0.1:1/closed");
    await webhook.sendWebhook("share.downloaded", {});
    await setConfig("webhookUrl", "javascript:alert(1)");
    await webhook.sendWebhook("share.downloaded", {});

    await setConfig("webhookUrl", url);
    await setConfig("webhookSecret", "");
    await webhook.sendWebhook("share.downloaded", {});
    assert.equal(received.length, 1, "without a key nothing is sent");
    await setConfig("webhookSecret", secret);
  } finally {
    await setConfig("webhookUrl", "");
    await new Promise((resolve) => server.close(resolve));
  }
});

test("webhook address and key are not in the public settings", async () => {
  const publicConfigs = await app.inject({ method: "GET", url: "/app/configs/public" });
  const keys = (publicConfigs.json().configs as Array<{ key: string }>).map((config) => config.key);
  assert.equal(keys.includes("webhookSecret"), false);
  assert.equal(keys.includes("webhookUrl"), false);
  assert.equal(keys.includes("activityPlace"), true);
});

test("storage usage splits own files, files in shares and received files", async () => {
  const file = (name: string, size: number) =>
    prisma.file.create({
      data: { name, extension: "pdf", size: BigInt(size), objectName: `bob/${name}`, userId: "bob" },
    });
  const inShare = await file("shared.pdf", 300);
  await file("plain.pdf", 700);
  const share = await makeShare("bob", "With a file");
  await prisma.share.update({ where: { id: share.id }, data: { files: { connect: { id: inShare.id } } } });
  const link = await prisma.reverseShare.create({ data: { name: "Bob's inbox", creatorId: "bob" } });
  await prisma.reverseShareFile.create({
    data: { name: "in.zip", extension: "zip", size: BigInt(50), objectName: "r/in.zip", reverseShareId: link.id },
  });
  await setConfig("maxTotalStoragePerUser", "10000");

  const usage = await app.inject({ method: "GET", url: "/storage/usage", cookies: session("bob") });
  assert.deepEqual(usage.json(), { limitBytes: 10000, usedBytes: 1000, sharedBytes: 300, receivedBytes: 50 });
  assert.equal((await app.inject({ method: "GET", url: "/storage/usage" })).statusCode, 401);
});

test("secrets leave their trail: made, opened, deleted", async () => {
  const body = {
    ciphertext: "c2VhbGVk",
    proof: "p".repeat(43),
    verifier: "v".repeat(43),
    hasPassphrase: false,
    label: "Database password",
    expiresInHours: 1,
    maxOpens: 2,
  };
  const made = await app.inject({ method: "POST", url: "/secrets", cookies: session("alice"), payload: body });
  const id = made.json().id as string;
  await app.inject({
    method: "POST",
    url: `/secrets/${id}/open`,
    payload: { proof: body.proof, verifier: body.verifier },
  });
  await app.inject({ method: "DELETE", url: `/secrets/${id}`, cookies: session("alice") });

  const trail = await list("alice", `?subjectId=${id}`);
  assert.deepEqual(
    trail.events.map((event) => [event.action, event.detail]),
    [
      ["secret.deleted", null],
      ["secret.opened", "1/2"],
      ["secret.created", null],
    ]
  );
});

test("the counts per kind follow the search term, not the chosen kind", async () => {
  await activity.recordActivity({ action: "share.downloaded", ownerId: "alice", subject: "CountMe", detail: "x.pdf" });
  await activity.recordActivity({ action: "share.opened", ownerId: "alice", subject: "CountMe", detail: "" });
  await activity.recordActivity({ action: "share.opened", ownerId: "alice", subject: "Other", detail: "" });
  await activity.recordActivity({ action: "secret.created", ownerId: "alice", subject: "CountMe" });

  const everything = await list("alice");
  const searched = await list("alice", "?q=CountMe");
  assert.equal(searched.counts.all, 3);
  assert.equal(everything.counts.all > searched.counts.all, true, "without a term everything is counted");

  const kindOfDownload = (await list("alice", "?q=CountMe")).events.find((e) => e.action === "share.downloaded")?.kind;
  const oneKind = await list("alice", `?q=CountMe&kind=${kindOfDownload}`);
  assert.equal(oneKind.counts.all, 3, "picking a kind does not shrink the other counts");
  assert.equal(oneKind.counts[kindOfDownload as string], 2);
  assert.equal(oneKind.counts.secret, 1, "another kind with the same term is still counted");
  assert.equal((await list("bob", "?q=CountMe")).counts.all, 0, "another user's events are never counted");
});

test("making and deleting a receive link writes a line each, for its maker", async () => {
  const made = await app.inject({
    method: "POST",
    url: "/reverse-shares",
    cookies: session("alice"),
    payload: { name: "Photos for me" },
  });
  assert.equal(made.statusCode, 201);
  const id = made.json().reverseShare.id as string;
  assert.equal(
    (await app.inject({ method: "DELETE", url: `/reverse-shares/${id}`, cookies: session("alice") })).statusCode,
    200
  );

  const mine = (await list("alice", `?subjectId=${id}`)).events;
  assert.deepEqual(
    mine.map((event) => [event.action, event.kind, event.subject, event.actorName]),
    [
      ["receive.deleted", "receive", "Photos for me", "alice Test"],
      ["receive.created", "receive", "Photos for me", "alice Test"],
    ]
  );
  assert.deepEqual((await list("bob", `?subjectId=${id}`)).events, [], "another user does not see them");
});

test("only an administrator clears the log, and one line about it remains", async () => {
  await activity.recordActivity({ action: "share.created", ownerId: "alice", subject: "x" });
  await activity.recordActivity({ action: "account.signed_in", ownerId: "bob" });

  for (const user of ["alice", "bob"]) {
    const refused = await app.inject({ method: "DELETE", url: "/activity", cookies: session(user) });
    assert.equal(refused.statusCode, 403, user);
  }
  assert.equal((await app.inject({ method: "DELETE", url: "/activity" })).statusCode, 401);
  const before = await prisma.activityEvent.count();
  assert.ok(before > 1, "nothing was removed by the refusals");

  // An administrator's API key is not a session: it is refused here too.
  const key = await app.inject({
    method: "POST",
    url: "/api-keys",
    cookies: session("root"),
    payload: { name: "root full", scope: "full" },
  });
  assert.equal(key.statusCode, 201, key.body);
  const byKey = await app.inject({
    method: "DELETE",
    url: "/activity",
    headers: { authorization: `Bearer ${key.json().token}` },
  });
  assert.equal(byKey.statusCode, 403);
  assert.equal(await prisma.activityEvent.count(), before, "the key removed nothing");

  const cleared = await app.inject({ method: "DELETE", url: "/activity", cookies: session("root") });
  assert.equal(cleared.statusCode, 200);

  const rows = await prisma.activityEvent.findMany();
  assert.equal(rows.length, 1);
  assert.deepEqual(
    [rows[0].action, rows[0].kind, rows[0].ownerId, rows[0].actorId, rows[0].actorName],
    ["activity.cleared", "account", null, "root", "root Test"]
  );
  assert.equal(cleared.json().removed, before, "removed is the number of rows that were there");

  assert.deepEqual(await actionsOf("root"), ["activity.cleared"]);
  assert.deepEqual(await actionsOf("alice"), [], "a member never sees the line about the clearing");
  const member = await list("alice");
  assert.equal(member.counts.account ?? 0, 0, "a member's counts never include it");
  assert.equal(member.counts.all, 0);
  const csv = await app.inject({ method: "GET", url: "/activity/export", cookies: session("alice") });
  assert.doesNotMatch(csv.body, /activity\.cleared/);
});

test("when the remaining line cannot be written, nothing is deleted", async () => {
  await activity.recordActivity({ action: "share.created", ownerId: "alice", subject: "keep me" });
  const before = await prisma.activityEvent.count();
  // The insert fails inside the transaction, after the delete already ran: the delete must roll back.
  await prisma.$executeRawUnsafe(
    `CREATE TRIGGER fail_clear BEFORE INSERT ON activity_events WHEN NEW.action = 'activity.cleared' BEGIN SELECT RAISE(ABORT, 'disk full'); END`
  );
  try {
    const failed = await app.inject({ method: "DELETE", url: "/activity", cookies: session("root") });
    assert.equal(failed.statusCode, 500);
  } finally {
    await prisma.$executeRawUnsafe("DROP TRIGGER fail_clear");
  }
  assert.equal(await prisma.activityEvent.count(), before);
});
