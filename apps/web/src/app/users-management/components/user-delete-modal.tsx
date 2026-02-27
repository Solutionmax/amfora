import { IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserDeleteModalProps } from "../types";

export function UserDeleteModal({ isOpen, onClose, user, onConfirm }: UserDeleteModalProps) {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader className="flex flex-col gap-1">
          <DialogTitle className="flex items-center gap-2 font-semibold">
            <IconTrash size={24} className="mr-1" />
            {t("users.delete.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {user && (
            <p className="text-muted-foreground">
              {t("users.delete.confirmation", {
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
          <Button variant="destructive" onClick={onConfirm}>
            {t("users.delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
