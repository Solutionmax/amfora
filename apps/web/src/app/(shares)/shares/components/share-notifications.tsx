"use client";

import { useState } from "react";
import { IconBell, IconClock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { LineRow } from "@/components/ui/line-list";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import type { ShareNotifications } from "@/http/endpoints/activity";
import type { Share } from "@/http/endpoints/shares/types";
import type { ShareDetailActions } from "./share-detail-types";

/** Two rows in the Access list: an email on a download, and one before the end date. */
export function ShareNotificationRows({ share, actions }: { share: Share; actions: ShareDetailActions }) {
  const t = useTranslations("shares.calm.notify");
  const { user } = useAuth();
  // Shown at once; dropped again when the answer is in, so a failed save falls back by itself.
  const [pending, setPending] = useState<Partial<ShareNotifications>>({});
  const value: ShareNotifications = {
    notifyOnDownload: share.notifyOnDownload ?? false,
    remindBeforeExpiry: share.remindBeforeExpiry ?? false,
    ...pending,
  };
  const hasEndDate = !!share.expiration;

  const toggle = async (key: keyof ShareNotifications, on: boolean) => {
    setPending((current) => ({ ...current, [key]: on }));
    await actions.onNotifications(share, { [key]: on });
    setPending((current) => Object.fromEntries(Object.entries(current).filter(([name]) => name !== key)));
  };

  return (
    <>
      <LineRow
        icon={<IconBell stroke={1.8} />}
        title={t("download")}
        sub={user?.email ? t("downloadHintTo", { email: user.email }) : t("downloadHint")}
      >
        <Switch
          checked={value.notifyOnDownload}
          disabled={"notifyOnDownload" in pending}
          aria-label={t("download")}
          onCheckedChange={(on) => void toggle("notifyOnDownload", on)}
        />
      </LineRow>
      <LineRow
        icon={<IconClock stroke={1.8} />}
        title={t("expiry")}
        sub={hasEndDate ? t("expiryHint") : t("noEndDate")}
      >
        <Switch
          checked={hasEndDate && value.remindBeforeExpiry}
          disabled={!hasEndDate || "remindBeforeExpiry" in pending}
          aria-label={t("expiry")}
          onCheckedChange={(on) => void toggle("remindBeforeExpiry", on)}
        />
      </LineRow>
    </>
  );
}
