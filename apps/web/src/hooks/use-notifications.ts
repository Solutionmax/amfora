import { useEffect } from "react";

import { countNotifications } from "@/http/endpoints/notifications";
import { createNotificationStore } from "./notification-store";

const POLL_MS = 60 * 1000;

export const useNotificationStore = createNotificationStore(countNotifications);

// One timer for every bell that is mounted (the sidebar and the mobile bar can both have one).
let mounted = 0;
let stop: (() => void) | null = null;

function startPolling(): () => void {
  const load = () => void useNotificationStore.getState().load();
  const timer = window.setInterval(load, POLL_MS);
  // The tab asks once when it becomes visible again; while hidden it does not ask at all.
  const onVisible = () => document.visibilityState === "visible" && load();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
  load();
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
  };
}

/** The count of new notifications, asked for once a minute and when the tab gets visible again. */
export function useNotificationCount(): number {
  const count = useNotificationStore((store) => store.count);

  useEffect(() => {
    mounted += 1;
    if (mounted === 1) stop = startPolling();
    else void useNotificationStore.getState().load();
    return () => {
      mounted -= 1;
      if (mounted === 0) {
        stop?.();
        stop = null;
      }
    };
  }, []);

  return count;
}
