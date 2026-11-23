import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statfsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

test("FS-09 internal capacity selects actual store mount, external S3 has no local capacity", () => {
  const dir = mkdtempSync(path.join("/dev/shm", "amfora-capacity-"));
  try {
    const script = `const {StorageService}=await import('./src/modules/storage/service.ts');console.log(JSON.stringify(await new StorageService().getDiskBytes()));`;
    const run = (external: string) => {
      const out = execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
        env: { ...process.env, ENABLE_S3: external, MINIO_DATA_DIR: dir },
        encoding: "utf8",
      });
      return JSON.parse(out.trim().split("\n").pop()!);
    };
    const actual = run("false");
    const store = statfsSync(dir);
    const metadata = statfsSync(tmpdir());
    assert.equal(actual.total, Number(store.blocks) * Number(store.bsize));
    assert.notEqual(actual.total, Number(metadata.blocks) * Number(metadata.bsize));
    assert.equal(run("true"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
