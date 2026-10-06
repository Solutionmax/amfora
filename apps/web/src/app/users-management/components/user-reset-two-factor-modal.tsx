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
import { UserResetTwoFactorModalProps } from "../types";

/** Confirms taking away somebody's two step sign in, for the one who lost the phone. */
export function UserResetTwoFactorModal({ isOpen, onClose, user, onConfirm }: UserResetTwoFactorModalProps) {
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
          <DialogTitle>{t("users.twoFactorReset.title", { name })}</DialogTitle>
          <DialogDescription>{t("users.twoFactorReset.text")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {t("users.twoFactorReset.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
