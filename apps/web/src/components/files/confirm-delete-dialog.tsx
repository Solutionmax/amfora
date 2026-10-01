"use client";

import { useState, type ReactNode } from "react";
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

/** Calm delete confirmation: title, one line, ghost Cancel and a red outline Delete. */
export function ConfirmDeleteDialog({
  open,
  title,
  description,
  names,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  /** Optional list of what goes, shown when more than one item is deleted. */
  names?: string[];
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const t = useTranslations();
  const [isBusy, setIsBusy] = useState(false);

  const confirm = async () => {
    setIsBusy(true);
    try {
      await onConfirm();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isBusy && onClose()}>
      <DialogContent className="sm:max-w-[440px]" showCloseButton={false}>
        <DialogHeader className="pr-0">
          <DialogTitle className="break-words">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {names && names.length > 1 && (
          <ul className="max-h-40 overflow-y-auto border-y border-line text-[13px] text-ink-2 [&>li+li]:border-t [&>li+li]:border-line">
            {names.map((name, index) => (
              <li key={`${name}-${index}`} className="truncate py-2">
                {name}
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isBusy}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={isBusy}>
            {isBusy ? t("common.deleting") : (confirmLabel ?? t("common.delete"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
