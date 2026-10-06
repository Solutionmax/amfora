import { useEffect } from "react";
import { create } from "zustand";

import { countNotifications } from "@/http/endpoints/notifications";

const POLL_MS = 60 * 1000;

interface NotificationStore {
  /** How many are new. Zero while unknown: a session that may not ask (a missing second step) shows nothing. */
  count: number;
  /** Asks the server once for everyone who asks at the same moment. */
  load: () => Promise<void>;
  clear: () => void;
}

let inFlight: Promise<void> | null = null;

export const useNotificationStore = create<NotificationStore>((set) => ({
  count: 0,
  load: () => {
    if (inFlight) return inFlight;

    const request = countNotifications()
      .then((count) => set({ count }))
      // An answer that is not a count is no reason to show anything, or to keep the old number.
      .catch(() => set({ count: 0 }))
      .finally(() => {
        if (inFlight === request) inFlight = null;
      });
    inFlight = request;

    return request;
  },
  clear: () => set({ count: 0 }),
}));

/** The count of new notifications, asked for once a minute and when the tab gets focus again. */
export function useNotificationCount(): number {
  const count = useNotificationStore((store) => store.count);
  const load = useNotificationStore((store) => store.load);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    const onFocus = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  return count;
}
