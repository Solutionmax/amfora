"use client";

import { IconCheck, IconClock, IconEye, IconFlame, IconLink, IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { Secret, SecretStatus } from "@/http/endpoints/secrets";

const STATUS_ICON = { waiting: IconCheck, used: IconEye, expired: IconClock, burned: IconFlame } as const;

export function SecretStatusTag({ status }: { status: SecretStatus }) {
  const t = useTranslations("secrets.status");
  const StatusIcon = STATUS_ICON[status];
  return (
    <Badge variant={status === "waiting" ? "ok" : "muted"}>
      <StatusIcon />
      {t(status)}
    </Badge>
  );
}

/** Status and protection side by side, like the tags on a share. */
export function SecretTags({ secret }: { secret: Pick<Secret, "status" | "hasPassphrase"> }) {
  const t = useTranslations("secrets");
  return (
    <span className="inline-flex flex-wrap items-center gap-[5px]">
      <SecretStatusTag status={secret.status} />
      <Badge variant={secret.hasPassphrase ? "warn" : "muted"}>
        {secret.hasPassphrase ? <IconLock /> : <IconLink />}
        {secret.hasPassphrase ? t("passphraseTag") : t("linkOnlyTag")}
      </Badge>
    </span>
  );
}
