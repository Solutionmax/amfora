"use client";

import { IconCheck, IconClock, IconInfinity, IconLock, IconLockOpen, IconPlayerPause } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { linkStatus, type LinkStatus } from "./share-status";

export { linkStatus, type LinkStatus };

export function StatusTag({ status }: { status: LinkStatus }) {
  const t = useTranslations();
  if (status === "neverExpires")
    return (
      <Badge variant="ok">
        <IconInfinity />
        {t("ui.tags.neverExpires")}
      </Badge>
    );
  if (status === "active")
    return (
      <Badge variant="ok">
        <IconCheck />
        {t("ui.tags.active")}
      </Badge>
    );
  if (status === "expired")
    return (
      <Badge variant="muted">
        <IconClock />
        {t("ui.tags.expired")}
      </Badge>
    );
  return (
    <Badge variant="muted">
      <IconPlayerPause />
      {t("ui.tags.inactive")}
    </Badge>
  );
}

export function SecurityTag({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations();
  return hasPassword ? (
    <Badge variant="warn">
      <IconLock />
      {t("ui.tags.protected")}
    </Badge>
  ) : (
    <Badge variant="muted">
      <IconLockOpen />
      {t("ui.tags.public")}
    </Badge>
  );
}

/** Status and security side by side. */
export function LinkTags({
  expiration,
  isActive,
  hasPassword,
}: {
  expiration?: string | Date | null;
  isActive?: boolean;
  hasPassword: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-[5px]">
      <StatusTag status={linkStatus({ expiration, isActive })} />
      <SecurityTag hasPassword={hasPassword} />
    </span>
  );
}
