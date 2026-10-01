"use client";

import { useEffect, useState } from "react";
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
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import type { Share } from "@/http/endpoints/shares/types";
import { parseViewLimit } from "../lib/share-list";

/** Sets or clears the maximum number of views for one share. */
export function ShareViewLimitModal({
  share,
  onClose,
  onSave,
}: {
  share: Share | null;
  onClose: () => void;
  onSave: (share: Share, maxViews: number | null) => Promise<boolean>;
}) {
  const t = useTranslations();
  const [value, setValue] = useState("");
  const [isInvalid, setIsInvalid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (share) {
      setValue(share.security?.maxViews ? String(share.security.maxViews) : "");
      setIsInvalid(false);
    }
  }, [share]);

  const handleSave = async () => {
    if (!share) return;
    const parsed = parseViewLimit(value);
    if (!parsed.ok) {
      setIsInvalid(true);
      return;
    }
    setIsSaving(true);
    const saved = await onSave(share, parsed.value);
    setIsSaving(false);
    if (saved) onClose();
  };

  return (
    <Dialog open={!!share} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("shares.calm.viewLimitTitle")}</DialogTitle>
          <DialogDescription>{t("shares.calm.viewLimitDescription")}</DialogDescription>
        </DialogHeader>
        <form
          id="share-view-limit"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <Field
            label={t("shares.calm.viewLimitLabel")}
            htmlFor="share-view-limit-input"
            hint={t("shares.calm.viewLimitHint", { count: share?.views ?? 0 })}
            error={isInvalid ? t("shares.calm.viewLimitInvalid") : undefined}
          >
            <Input
              id="share-view-limit-input"
              inputMode="numeric"
              autoFocus
              value={value}
              aria-invalid={isInvalid || undefined}
              placeholder={t("shares.calm.noLimit")}
              onChange={(event) => {
                setValue(event.target.value);
                setIsInvalid(false);
              }}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="share-view-limit" disabled={isSaving}>
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
