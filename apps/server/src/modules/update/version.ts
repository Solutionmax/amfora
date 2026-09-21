/**
 * Compares two release versions.
 *
 * Only the numeric `major.minor.patch` is compared. A prerelease suffix is treated as
 * older than the same numbers without one, so a published `1.2.0` never loses to a
 * `1.2.0-rc1` that is still sitting in the manifest.
 */
export function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => {
    const [core, ...rest] = v.trim().replace(/^v/, "").split("-");
    const parts = core.split(".").map((n) => Number.parseInt(n, 10));
    return {
      numbers: [parts[0] || 0, parts[1] || 0, parts[2] || 0],
      isPrerelease: rest.length > 0,
    };
  };

  const a = parse(latest);
  const b = parse(current);

  for (let i = 0; i < 3; i++) {
    if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] > b.numbers[i];
  }

  return b.isPrerelease && !a.isPrerelease;
}
