import {
  IconDots,
  IconEdit,
  IconLockOff,
  IconPlayerPause,
  IconPlayerPlay,
  IconShield,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserActionsDropdownProps } from "../types";

/** The ⋯ menu on a user row. The signed-in admin gets no menu for their own row. */
export function UserActionsDropdown({
  user,
  isCurrentUser,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleAdmin,
  onResetTwoFactor,
}: UserActionsDropdownProps) {
  const t = useTranslations();

  if (isCurrentUser) return null;

  const name = `${user.firstName} ${user.lastName}`.trim() || user.username;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" aria-label={t("users.calm.actionsFor", { name })}>
          <IconDots className="size-[17px]" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[210px]">
        <DropdownMenuItem onSelect={() => onEdit(user)}>
          <IconEdit aria-hidden="true" />
          {t("users.actions.edit")}
        </DropdownMenuItem>
        {user.isActive && (
          <DropdownMenuItem onSelect={() => onToggleAdmin(user)}>
            {user.isAdmin ? <IconUser aria-hidden="true" /> : <IconShield aria-hidden="true" />}
            {user.isAdmin ? t("users.calm.makeUser") : t("users.calm.makeAdmin")}
          </DropdownMenuItem>
        )}
        {user.twoFactorEnabled && (
          <DropdownMenuItem onSelect={() => onResetTwoFactor(user)}>
            <IconLockOff aria-hidden="true" />
            {t("users.twoFactorReset.action")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-line" />
        <DropdownMenuItem onSelect={() => onToggleStatus(user)}>
          {user.isActive ? <IconPlayerPause aria-hidden="true" /> : <IconPlayerPlay aria-hidden="true" />}
          {user.isActive ? t("users.actions.deactivate") : t("users.actions.activate")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(user)}>
          <IconTrash aria-hidden="true" />
          {t("users.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
