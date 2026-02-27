import { DialogTitle } from "@radix-ui/react-dialog";
import { IconUser } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { UserStatusModalProps } from "../types";

export function UserStatusModal({ isOpen, onClose, user, onConfirm }: UserStatusModalProps) {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader className="flex flex-col gap-1">
          <DialogTitle className="flex items-center gap-2 font-semibold">
            <IconUser size={24} className="mr-1" />
            {t("users.status.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {user && (
            <p>
              {t("users.status.confirmation", {
                action: user.isActive ? t("users.status.deactivate") : t("users.status.activate"),
                firstName: user.firstName,
                lastName: user.lastName,
              })}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant={user?.isActive ? "destructive" : "default"} onClick={onConfirm}>
            {user?.isActive ? t("users.status.deactivate") : t("users.status.activate")} {t("users.status.user")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
