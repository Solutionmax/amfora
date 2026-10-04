import { createHmac } from "node:crypto";

import { prisma } from "../../shared/prisma";

export type WebhookEvent = "receive.files_received" | "share.downloaded" | "secret.opened";

const SWITCH: Record<WebhookEvent, string> = {
  "receive.files_received": "webhookFilesReceived",
  "share.downloaded": "webhookShareDownloaded",
  "secret.opened": "webhookSecretOpened",
};

const TIMEOUT_MS = 5000;
/** Calls on their way at once. More than this and new ones are dropped: the other side is not keeping up. */
const MAX_IN_FLIGHT = 20;
let inFlight = 0;
export const SIGNATURE_HEADER = "x-amfora-signature";

export function signWebhook(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

/**
 * Tells the configured address that something happened. Fire and forget: the caller never waits
 * and never fails because the other side is slow or down.
 */
export async function sendWebhook(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  try {
    const rows = await prisma.appConfig.findMany({
      where: { key: { in: ["webhookUrl", "webhookSecret", SWITCH[event]] } },
    });
    const stored = new Map(rows.map((row) => [row.key, row.value]));
    const url = stored.get("webhookUrl")?.trim();
    const secret = stored.get("webhookSecret");
    if (!url || stored.get(SWITCH[event]) !== "true") return;
    if (!/^https?:\/\//i.test(url)) return;
    // An empty key would give a signature anyone can make.
    if (!secret) return console.warn("Webhook not sent: no signing key is set");
    if (inFlight >= MAX_IN_FLIGHT) return console.warn(`Webhook ${event} dropped: too many calls waiting`);

    const body = JSON.stringify({ event, at: new Date().toISOString(), data });
    inFlight += 1;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Amfora-Webhook",
        [SIGNATURE_HEADER]: signWebhook(body, secret),
      },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).finally(() => (inFlight -= 1));
    // Nothing in the answer is used; letting go of it frees the connection.
    await response.body?.cancel().catch(() => undefined);
    if (!response.ok) console.warn(`Webhook ${event} answered ${response.status}`);
  } catch (error) {
    console.warn(`Webhook ${event} failed:`, error instanceof Error ? error.message : error);
  }
}
