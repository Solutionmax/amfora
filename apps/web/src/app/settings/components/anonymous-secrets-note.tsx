"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { CopyField } from "@/components/files/copy-field";
import { getSecretStats } from "@/http/endpoints/secrets";

/** Under the switch, once it is saved: the public address, and how many secrets wait there. */
export function AnonymousSecretsNote() {
  const t = useTranslations("secrets.public");
  const [waiting, setWaiting] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSecretStats()
      .then((stats) => !cancelled && setWaiting(stats.anonymousWaiting))
      // The address is what matters here; without the count the line is simply left out.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <CopyField value={`${window.location.origin}/secret`} label={t("address")} />
      {waiting !== null && <p className="text-[12.5px] text-ink-3">{t("waitingNow", { count: waiting })}</p>}
    </>
  );
}
