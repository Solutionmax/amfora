import { useFormatter, useTranslations } from "next-intl";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { UsersTableProps } from "../types";
import { UserActionsDropdown } from "./user-actions-dropdown";
import { UserAvatar } from "./user-avatar";

const ROW_ACTIONS =
  "md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:has-[[aria-expanded=true]]:opacity-100";

/** Hairline table: avatar, name, email, role, created, ⋯. On a phone: avatar, name with meta, ⋯. */
export function UsersTable({ users, currentUser, onEdit, onDelete, onToggleStatus, onToggleAdmin }: UsersTableProps) {
  const t = useTranslations();
  const format = useFormatter();

  const created = (value: string) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? t("common.notAvailable")
      : format.dateTime(date, { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[58px]">
            <span className="sr-only">{t("users.calm.photo")}</span>
          </TableHead>
          <TableHead>{t("users.calm.name")}</TableHead>
          <TableHead className="hidden w-[34%] md:table-cell">{t("users.calm.email")}</TableHead>
          <TableHead className="hidden w-[140px] md:table-cell">{t("users.calm.role")}</TableHead>
          <TableHead className="hidden w-[120px] lg:table-cell">{t("users.calm.created")}</TableHead>
          <TableHead className="w-[52px]">
            <span className="sr-only">{t("users.table.actions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const isMe = currentUser?.id === user.id;
          const role = user.isAdmin ? t("users.calm.administrator") : t("users.calm.user");

          return (
            <TableRow key={user.id} className="group">
              <TableCell className="pr-0">
                <UserAvatar user={user} />
              </TableCell>
              <TableCell className="py-2.5">
                <div className="truncate font-semibold">
                  {`${user.firstName} ${user.lastName}`.trim() || user.username}
                  {isMe && <span className="ml-1 font-medium text-ink-3">{t("users.calm.you")}</span>}
                </div>
                <div className="flex min-w-0 items-center gap-1.5 truncate text-[12.5px] text-ink-3">
                  {user.isActive ? (
                    <span className="truncate">@{user.username}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-ink-3/60" />
                      {t("users.calm.deactivated")}
                    </span>
                  )}
                  <span aria-hidden="true" className="md:hidden">
                    ·
                  </span>
                  <span className="truncate md:hidden">{role}</span>
                </div>
              </TableCell>
              <TableCell className="hidden truncate text-[13px] text-ink-2 md:table-cell">{user.email}</TableCell>
              <TableCell className="hidden text-[13px] text-ink-2 md:table-cell">{role}</TableCell>
              <TableCell className="hidden text-[13px] text-ink-3 lg:table-cell">{created(user.createdAt)}</TableCell>
              <TableCell className="px-1 text-right">
                <div className={cn("flex justify-end", ROW_ACTIONS)}>
                  <UserActionsDropdown
                    isCurrentUser={isMe}
                    user={user}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                    onToggleAdmin={onToggleAdmin}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
