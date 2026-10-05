/** How long an answer is shared. A page asks in several steps (menu, then content); all fall inside it. */
export const SHARE_WINDOW_MS = 30_000;

/**
 * One request that many callers can ask for. Callers at the same moment, and those right after
 * the answer came in, get the same answer instead of sending the request again. `fresh` always
 * asks again (use it after a change), `reset` forgets what was kept. A failed request is not kept.
 */
export function sharedRequest<T>(load: () => Promise<T>, windowMs: number = SHARE_WINDOW_MS) {
  let current: { promise: Promise<T>; since: number } | null = null;

  const start = () => {
    // `since` is Infinity while waiting, so a slow answer is still shared by everyone who asks.
    const entry = { promise: load(), since: Infinity };
    current = entry;
    entry.promise.then(
      () => {
        entry.since = Date.now();
      },
      () => {
        if (current === entry) current = null;
      }
    );
    return entry.promise;
  };

  return {
    get: () =>
      current && (current.since === Infinity || Date.now() - current.since < windowMs) ? current.promise : start(),
    fresh: start,
    reset: () => {
      current = null;
    },
  };
}
