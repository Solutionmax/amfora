import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsersTableProps } from "../types";
import { UserActionsDropdown } from "./user-actions-dropdown";

export function UsersTable({ users, currentUser, onEdit, onDelete, onToggleStatus }: UsersTableProps) {
  const t = useTranslations();
  const isCurrentUser = (userId: string) => currentUser?.id === userId;

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-none">
      <Table className="min-w-[680px]">
        <TableHeader>
          <TableRow className="border-b-0">
            <TableHead className="h-11 bg-secondary/60 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("users.table.user")}
            </TableHead>
            <TableHead className="h-11 bg-secondary/60 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("users.table.email")}
            </TableHead>
            <TableHead className="h-11 bg-secondary/60 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("users.table.status")}
            </TableHead>
            <TableHead className="h-11 bg-secondary/60 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("users.table.role")}
            </TableHead>
            <TableHead className="h-11 w-[70px] bg-secondary/60 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("users.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="border-border/60 transition-colors hover:bg-secondary/35">
              <TableCell className="h-12 px-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.image || ""} alt={user.username} />
                    <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                      {(user.firstName?.[0] || user.username?.[0] || "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{`${user.firstName} ${user.lastName}`}</p>
                    <p className="text-sm text-muted-foreground">{user.username}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="h-12 px-4">{user.email}</TableCell>
              <TableCell className="h-12 px-4">
                <Badge variant={user.isActive ? "default" : "destructive"}>
                  {user.isActive ? t("users.table.active") : t("users.table.inactive")}
                </Badge>
              </TableCell>
              <TableCell className="h-12 px-4">
                <Badge variant={user.isAdmin ? "destructive" : "secondary"}>
                  {user.isAdmin ? t("users.table.admin") : t("users.table.userr")}
                </Badge>
              </TableCell>
              <TableCell className="h-12 px-4">
                <UserActionsDropdown
                  isCurrentUser={isCurrentUser(user.id)}
                  user={user}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
