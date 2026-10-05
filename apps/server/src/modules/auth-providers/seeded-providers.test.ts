import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { after, before, test } from "node:test";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
const serverRoot = path.resolve(__dirname, "../../..");

let prisma: typeof import("../../shared/prisma").prisma;

/** The seed runs at every start of the container, so running it again is what an upgrade does. */
const startAgain = () =>
  execFileSync(process.execPath, ["prisma/seed.js"], { cwd: serverRoot, env: process.env, stdio: "pipe" });

const provider = (name: string, data: Record<string, unknown> = {}) =>
  prisma.authProvider.create({ data: { name, displayName: name, type: "oidc", ...data } });

const providerNames = async () =>
  (await prisma.authProvider.findMany({ orderBy: { sortOrder: "asc" }, select: { name: true } })).map(
    (row) => row.name
  );

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
});

after(async () => {
  await prisma?.$disconnect();
  database.cleanup();
});

test("a new installation offers Authentik, GitHub and Google, in that order", async () => {
  assert.deepEqual(await providerNames(), ["authentik", "github", "google"]);
});

test("an upgrade drops the retired providers nobody set up and keeps every one that is in use", async () => {
  await prisma.user.create({
    data: { id: "mara", firstName: "Mara", lastName: "Lind", username: "mara", email: "mara@example.test" },
  });

  // Untouched since an older version seeded them: these two go.
  await provider("discord", { sortOrder: 10, issuerUrl: "https://discord.com" });
  await provider("frontegg", {
    sortOrder: 11,
    issuerUrl: "https://your-tenant.frontegg.com",
    clientId: "",
    clientSecret: "",
  });
  // Somebody started on these, or uses them: they stay.
  await provider("zitadel", { sortOrder: 12, issuerUrl: "https://your-instance.zitadel.cloud", clientId: "amfora" });
  await provider("auth0", { sortOrder: 13, issuerUrl: "https://acme.eu.auth0.com" });
  await provider("pocketid", { sortOrder: 14, issuerUrl: "https://your-pocket-id.domain.com", enabled: true });
  const linked = await provider("kinde", { sortOrder: 15, issuerUrl: "https://your-tenant.kinde.com" });
  await prisma.userAuthProvider.create({ data: { userId: "mara", providerId: linked.id, externalId: "kinde-1" } });
  await provider("keycloak", { sortOrder: 16 });

  startAgain();

  assert.deepEqual(await providerNames(), [
    "authentik",
    "github",
    "google",
    "zitadel",
    "auth0",
    "pocketid",
    "kinde",
    "keycloak",
  ]);
});

test("an upgrade removes the setting of the playback switch that no longer exists", async () => {
  await prisma.appConfig.create({
    data: { key: "appSharePlayback", value: "true", type: "boolean", group: "general" },
  });

  startAgain();

  assert.equal(await prisma.appConfig.findUnique({ where: { key: "appSharePlayback" } }), null);
  assert.notEqual(await prisma.appConfig.findUnique({ where: { key: "appName" } }), null);
});

test("an upgrade resets the default font of older versions, and leaves a chosen font alone", async () => {
  const font = () => prisma.appConfig.findUniqueOrThrow({ where: { key: "appFontFamily" } });
  const setFont = (value: string) => prisma.appConfig.update({ where: { key: "appFontFamily" }, data: { value } });

  await setFont("var(--font-jakarta)");
  startAgain();
  assert.equal((await font()).value, "");

  await setFont("var(--font-inter), Inter, sans-serif");
  startAgain();
  assert.equal((await font()).value, "var(--font-inter), Inter, sans-serif");
});
