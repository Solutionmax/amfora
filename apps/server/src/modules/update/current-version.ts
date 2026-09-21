import fs from "node:fs";
import path from "node:path";

/**
 * Reads the running version from the app's own package.json.
 *
 * Deliberately not a constant: hardcoding a version means a release where the number in
 * the code and the number in the package disagree, and an update check that compares
 * against the wrong one. The path holds for both the compiled tree
 * (`dist/modules/update/`) and the sources under tsx (`src/modules/update/`).
 */
export function readCurrentVersion(): string | null {
  const candidates = [path.join(__dirname, "../../../package.json"), path.join(process.cwd(), "package.json")];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (typeof parsed?.version === "string" && /^\d+\.\d+\.\d+/.test(parsed.version)) {
        return parsed.version;
      }
    } catch {
      continue;
    }
  }

  // Better to report "unknown" to the operator than to compare against a made up number.
  return null;
}
