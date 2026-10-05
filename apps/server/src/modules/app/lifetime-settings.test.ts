import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();

let prisma: typeof import("../../shared/prisma").prisma;
let service: InstanceType<typeof import("./service").AppService>;

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { AppService } = await import("./service");
  service = new AppService();
});

after(async () => {
  await prisma?.$disconnect();
  database.cleanup();
});

const value = async (key: string) => (await prisma.appConfig.findUniqueOrThrow({ where: { key } })).value;

test("the two lifetime settings exist and start at none", async () => {
  assert.equal(await value("shareDefaultExpiryDays"), "0");
  assert.equal(await value("shareMaxExpiryDays"), "0");
});

test("a default longer than the maximum is refused, saved together or one at a time", async () => {
  await assert.rejects(
    () =>
      service.bulkUpdateConfigs([
        { key: "shareDefaultExpiryDays", value: "40" },
        { key: "shareMaxExpiryDays", value: "30" },
      ]),
    /30 days/
  );
  assert.equal(await value("shareMaxExpiryDays"), "0", "nothing was saved");

  await service.bulkUpdateConfigs([
    { key: "shareDefaultExpiryDays", value: "7" },
    { key: "shareMaxExpiryDays", value: "30" },
  ]);
  assert.equal(await value("shareMaxExpiryDays"), "30");

  await assert.rejects(() => service.updateConfig("shareDefaultExpiryDays", "31"), /30 days/);
  await assert.rejects(() => service.updateConfig("shareMaxExpiryDays", "5"), /5 days/);
  await assert.rejects(() => service.updateConfig("shareMaxExpiryDays", "abc"), /whole number/);
  assert.equal(await value("shareDefaultExpiryDays"), "7");
});
