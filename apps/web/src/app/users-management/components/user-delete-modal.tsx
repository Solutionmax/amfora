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
import { UserDeleteModalProps } from "../types";

export function UserDeleteModal({ isOpen, onClose, user, onConfirm }: UserDeleteModalProps) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);
  const name = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "";

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
          <DialogTitle>{t("users.calm.delete.title", { name })}</DialogTitle>
          <DialogDescription>{t("users.calm.delete.description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy ? t("common.deleting") : t("users.calm.delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
