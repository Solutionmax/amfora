// Add nullable storage fields/index before db push. Prisma otherwise asks to accept data loss
// merely because a new unique constraint is being added to a populated legacy table.
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  const tables = await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name='files'");
  if (!tables.length) return;
  await db.$transaction(async (tx) => {
    const columns = await tx.$queryRawUnsafe('PRAGMA table_info("files")');
    for (const name of ["sourceObjectName", "purgeToken"])
      if (!columns.some((c) => c.name === name))
        await tx.$executeRawUnsafe(`ALTER TABLE "files" ADD COLUMN "${name}" TEXT`);
    const duplicates = await tx.$queryRawUnsafe(
      "SELECT sourceObjectName,COUNT(*) AS count FROM files WHERE sourceObjectName IS NOT NULL GROUP BY sourceObjectName HAVING COUNT(*) > 1"
    );
    if (duplicates.length)
      throw new Error(
        "Duplicate staging identities exist; refusing destructive migration. Keep database and byte backup for investigation."
      );
    await tx.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "files_sourceObjectName_key" ON "files"("sourceObjectName")'
    );
  });
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
