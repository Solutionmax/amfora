"use client";

import {
  IconCheck,
  IconClock,
  IconInfinity,
  IconLock,
  IconLockOpen,
  IconPlayerPause,
  IconUsersGroup,
} from "@tabler/icons-react";
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

/** The group a share is limited to. */
export function GroupTag({ name }: { name: string }) {
  const t = useTranslations();
  return (
    <Badge variant="info" title={t("groups.access.onlyMembers", { name })}>
      <IconUsersGroup />
      <span className="max-w-[14ch] truncate">{name}</span>
    </Badge>
  );
}

/** Status and security side by side, and the group when the share is limited to one. */
export function LinkTags({
  expiration,
  isActive,
  hasPassword,
  groupName,
}: {
  expiration?: string | Date | null;
  isActive?: boolean;
  hasPassword: boolean;
  groupName?: string | null;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-[5px]">
      <StatusTag status={linkStatus({ expiration, isActive })} />
      {/* "Public" would say the opposite of what a group share is. */}
      {(hasPassword || !groupName) && <SecurityTag hasPassword={hasPassword} />}
      {groupName && <GroupTag name={groupName} />}
    </span>
  );
}
