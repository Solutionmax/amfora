/**
 * "Not again for a while": remembers when something last happened under a key, in memory.
 * Bounded, and when full the oldest entry goes, so one noisy visitor cannot wipe what is
 * remembered about everyone else.
 */
export class QuietPeriod {
  private readonly last = new Map<string, number>();

  constructor(
    private readonly quietMs: number,
    private readonly maxKeys = 5000
  ) {}

  /** True when the key was seen within the quiet period. Otherwise remembers it and answers false. */
  isRepeat(key: string, now = Date.now()): boolean {
    const seen = this.last.get(key);
    if (seen !== undefined && now - seen < this.quietMs) return true;
    // Re-inserting moves the key to the end, so the first key is always the oldest.
    this.last.delete(key);
    if (this.last.size >= this.maxKeys) this.last.delete(this.last.keys().next().value as string);
    this.last.set(key, now);
    return false;
  }
}
