import { purgeOldActivity } from "./activity";
import { sendExpiryReminders } from "./notify";

const HOUR_MS = 60 * 60 * 1000;
/** Shortly after start, so a restart does not delay a reminder by a whole hour. */
const FIRST_RUN_MS = 60 * 1000;

async function tick() {
  await sendExpiryReminders().catch((error) => console.error("Expiry reminders failed:", error));
  await purgeOldActivity().catch((error) => console.error("Activity clean up failed:", error));
}

/** Hourly housekeeping: reminders for links about to end, and old activity out of the log. */
export function startActivityJobs(): void {
  setTimeout(() => void tick(), FIRST_RUN_MS).unref();
  setInterval(() => void tick(), HOUR_MS).unref();
}
