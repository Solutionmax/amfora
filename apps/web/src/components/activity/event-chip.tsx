import {
  IconAlertTriangle,
  IconClockHour4,
  IconDatabase,
  IconDownload,
  IconEraser,
  IconEye,
  IconFlame,
  IconKey,
  IconLockOff,
  IconLogin2,
  IconPoint,
  IconShare,
  IconShieldX,
  IconTrash,
  IconUpload,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";

import { eventTone, type EventTone } from "@/app/activity/lib/activity-events";
import { cn } from "@/lib/utils";

const ICONS: Record<string, Icon> = {
  "share.created": IconShare,
  "share.deleted": IconTrash,
  "share.opened": IconEye,
  "share.downloaded": IconDownload,
  "share.password_failed": IconAlertTriangle,
  "share.expiring": IconClockHour4,
  "receive.expiring": IconClockHour4,
  "account.storage_almost_full": IconDatabase,
  "file.infected": IconShieldX,
  "receive.created": IconUpload,
  "receive.deleted": IconTrash,
  "receive.files_received": IconUpload,
  "secret.created": IconKey,
  "secret.deleted": IconTrash,
  "secret.opened": IconKey,
  "secret.destroyed": IconFlame,
  "account.signed_in": IconLogin2,
  "account.sign_in_failed": IconAlertTriangle,
  "account.two_factor_reset": IconLockOff,
  "account.group_added": IconUsersGroup,
  "account.group_removed": IconUsersGroup,
  "activity.cleared": IconEraser,
};

const TONE_CLASS: Record<EventTone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  accent: "bg-primary-soft text-primary",
  plain: "bg-surface-2 text-ink-icon",
};

/** The tinted square in front of an event: its icon, coloured by what kind of news it is. */
export function EventChip({ action, className }: { action: string; className?: string }) {
  const EventIcon = ICONS[action] ?? IconPoint;

  return (
    <span
      className={cn("grid size-8 shrink-0 place-items-center rounded-[10px]", TONE_CLASS[eventTone(action)], className)}
    >
      <EventIcon className="size-4" stroke={1.8} aria-hidden="true" />
    </span>
  );
}
