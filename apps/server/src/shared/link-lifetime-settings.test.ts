import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { useTestDatabase } from "../../test-support/test-db";

const database = useTestDatabase();
const DAY = 24 * 60 * 60 * 1000;

let prisma: typeof import("./prisma").prisma;
let lifetime: typeof import("./link-lifetime");

before(async () => {
  ({ prisma } = await import("./prisma"));
  lifetime = await import("./link-lifetime");
});

after(async () => {
  await prisma?.$disconnect();
  database.cleanup();
});

const store = (key: string, value: string) => prisma.appConfig.update({ where: { key }, data: { value } });

test("a days value that is not plain digits is refused on save", async () => {
  for (const value of ["1e1", "0x10", " 5", "5.0", "-1", "", "abc"]) {
    await assert.rejects(
      lifetime.assertLifetimeSettings([{ key: "shareMaxExpiryDays", value }]),
      /whole number/,
      JSON.stringify(value)
    );
  }
  await lifetime.assertLifetimeSettings([{ key: "shareMaxExpiryDays", value: "30" }]);
});

test("a broken stored maximum counts as no maximum and does not refuse links", async () => {
  await store("shareMaxExpiryDays", "1e1");
  await lifetime.assertLinkLifetime(new Date(Date.now() + 900 * DAY), null);
  await lifetime.assertLinkLifetime(null, null);
  await store("shareMaxExpiryDays", "abc");
  await lifetime.assertLinkLifetime(new Date(Date.now() + 900 * DAY), null);
});

test("a broken stored value does not block saving the other setting", async () => {
  await store("shareDefaultExpiryDays", "abc");
  await store("shareMaxExpiryDays", "30");
  await lifetime.assertLifetimeSettings([{ key: "shareMaxExpiryDays", value: "60" }]);
});
