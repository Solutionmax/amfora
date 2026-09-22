import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const serverRoot = path.resolve(__dirname, "..");

/**
 * Points DATABASE_URL at a fresh SQLite file with the schema and the default configuration,
 * so a test can exercise real routes. Call it before anything imports the Prisma client.
 * Each test file runs in its own process, so each gets its own database.
 */
export function useTestDatabase(): { cleanup: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), "amfora-test-"));
  const env = { ...process.env, DATABASE_URL: `file:${path.join(dir, "test.db")}` };
  const prismaBin = path.join(serverRoot, "node_modules", ".bin", "prisma");

  execFileSync(prismaBin, ["db", "push", "--skip-generate"], { cwd: serverRoot, env, stdio: "pipe" });
  execFileSync(process.execPath, ["prisma/seed.js"], { cwd: serverRoot, env, stdio: "pipe" });

  process.env.DATABASE_URL = env.DATABASE_URL;
  return { cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
