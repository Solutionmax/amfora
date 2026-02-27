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
    <div className="rounded-lg shadow-sm overflow-hidden border">
      <Table>
        <TableHeader>
          <TableRow className="border-b-0">
            <TableHead className="h-10 text-xs font-bold text-muted-foreground bg-muted/50 px-4">
              {t("users.table.user")}
            </TableHead>
            <TableHead className="h-10 text-xs font-bold text-muted-foreground bg-muted/50 px-4">
              {t("users.table.email")}
            </TableHead>
            <TableHead className="h-10 text-xs font-bold text-muted-foreground bg-muted/50 px-4">
              {t("users.table.status")}
            </TableHead>
            <TableHead className="h-10 text-xs font-bold text-muted-foreground bg-muted/50 px-4">
              {t("users.table.role")}
            </TableHead>
            <TableHead className="h-10 w-[70px] text-xs font-bold text-muted-foreground bg-muted/50 px-4">
              {t("users.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-muted/50 transition-colors border-0">
              <TableCell className="h-12 px-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.image || ""} alt={user.username} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                      {user.firstName[0]}
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
