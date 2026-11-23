import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

test("FS-03 startup schema preparation preserves legacy duplicates without accept-data-loss", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "amfora-legacy-"));
  const env = { ...process.env, DATABASE_URL: `file:${tmp}/legacy.db` };
  try {
    // The schema of 2.4.0 as released, kept as a file so the test does not need the git history.
    copyFileSync("src/modules/storage/fixtures/schema-2.4.0.prisma", `${tmp}/schema.prisma`);
    execFileSync("node_modules/.bin/prisma", ["db", "push", "--schema", `${tmp}/schema.prisma`, "--skip-generate"], {
      env,
      stdio: "pipe",
    });
    execFileSync("python3", [
      "-c",
      `import sqlite3,sys
c=sqlite3.connect(sys.argv[1]);c.execute("INSERT INTO users(id,firstName,lastName,username,email,updatedAt) VALUES('u','U','T','u','u@test.local',CURRENT_TIMESTAMP)")
for n in ['a','b']: c.execute("INSERT INTO files(id,name,extension,size,objectName,userId,updatedAt) VALUES(?, 'f.txt','txt',3,'u/legacy','u',CURRENT_TIMESTAMP)",(n,))
c.commit()`,
      `${tmp}/legacy.db`,
    ]);
    execFileSync(process.execPath, ["prisma/storage-schema.js"], { env, stdio: "pipe" });
    const output = execFileSync("node_modules/.bin/prisma", ["db", "push", "--skip-generate"], {
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.doesNotMatch(output, /data loss|warnings/i);
    const rows = execFileSync(
      "python3",
      [
        "-c",
        `import sqlite3,sys,json
c=sqlite3.connect(sys.argv[1]);print(json.dumps(c.execute('SELECT id,objectName,sourceObjectName FROM files ORDER BY id').fetchall()))`,
        `${tmp}/legacy.db`,
      ],
      { encoding: "utf8" }
    );
    assert.deepEqual(JSON.parse(rows), [
      ["a", "u/legacy", null],
      ["b", "u/legacy", null],
    ]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
