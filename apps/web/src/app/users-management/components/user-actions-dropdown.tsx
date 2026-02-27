import { IconBan, IconCheck, IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserActionsDropdownProps } from "../types";

export function UserActionsDropdown({
  user,
  isCurrentUser,
  onEdit,
  onDelete,
  onToggleStatus,
}: UserActionsDropdownProps) {
  const t = useTranslations();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className={isCurrentUser ? "hidden" : ""} disabled={isCurrentUser}>
          <IconDotsVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <IconEdit className="h-4 w-4" />
          {t("users.actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleStatus(user)}>
          {user.isActive ? <IconBan className="h-4 w-4" /> : <IconCheck className="h-4 w-4" />}
          {user.isActive ? t("users.actions.deactivate") : t("users.actions.activate")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive">
          <IconTrash className="h-4 w-4" />
          {t("users.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
