import { create } from "zustand";

interface NotificationStore {
  /** How many are new. Zero while unknown: a session that may not ask (a missing second step) shows nothing. */
  count: number;
  /** Asks the server once for everyone who asks at the same moment. Does nothing while the tab is hidden. */
  load: () => Promise<void>;
  /** Forgets the count (sign out, or the panel was opened), and drops an answer that is still on its way. */
  clear: () => void;
}

const tabIsHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

export function createNotificationStore(fetchCount: () => Promise<number>, isHidden: () => boolean = tabIsHidden) {
  let inFlight: Promise<void> | null = null;
  let generation = 0;

  return create<NotificationStore>((set) => ({
    count: 0,
    load: () => {
      if (isHidden()) return Promise.resolve();
      if (inFlight) return inFlight;

      const asked = generation;
      // An answer that arrives after clear() belongs to a state that is gone: it is dropped.
      const request = fetchCount()
        .then((count) => asked === generation && set({ count }))
        // An answer that is not a count is no reason to show anything, or to keep the old number.
        .catch(() => asked === generation && set({ count: 0 }))
        .then(() => undefined)
        .finally(() => {
          if (inFlight === request) inFlight = null;
        });
      inFlight = request;

      return request;
    },
    clear: () => {
      generation += 1;
      inFlight = null;
      set({ count: 0 });
    },
  }));
}
