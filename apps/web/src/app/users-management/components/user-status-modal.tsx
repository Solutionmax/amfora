import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserStatusModalProps } from "../types";

export function UserStatusModal({ isOpen, onClose, user, onConfirm }: UserStatusModalProps) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);
  const name = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "";
  const deactivating = !!user?.isActive;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {deactivating
              ? t("users.calm.status.deactivateTitle", { name })
              : t("users.calm.status.activateTitle", { name })}
          </DialogTitle>
          <DialogDescription>
            {deactivating ? t("users.calm.status.deactivateText") : t("users.calm.status.activateText")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant={deactivating ? "destructive" : "default"} onClick={confirm} disabled={busy}>
            {deactivating ? t("users.actions.deactivate") : t("users.actions.activate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
