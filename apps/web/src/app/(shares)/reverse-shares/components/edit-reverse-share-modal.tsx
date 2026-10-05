"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLinkLifetime } from "@/hooks/use-link-lifetime";
import type { UpdateReverseShareBody } from "@/http/endpoints/reverse-shares/types";
import type { ReverseShare } from "../hooks/use-reverse-shares";
import { emptyReceiveForm, receiveFormFrom, toUpdateBody, type ReceiveFormValues } from "../lib/receive-form";
import { toDateTimeLocal } from "../lib/receive-format";
import { ReverseShareFormFields } from "./reverse-share-form-fields";

interface EditReverseShareModalProps {
  reverseShare: ReverseShare | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateReverseShare: (data: UpdateReverseShareBody) => Promise<unknown>;
  isUpdating: boolean;
}

/** All settings of a receive link in one calm form. */
export function EditReverseShareModal({
  reverseShare,
  isOpen,
  onClose,
  onUpdateReverseShare,
  isUpdating,
}: EditReverseShareModalProps) {
  const t = useTranslations();
  const form = useForm<ReceiveFormValues>({ defaultValues: emptyReceiveForm() });

  useEffect(() => {
    if (isOpen && reverseShare) form.reset(receiveFormFrom(reverseShare));
  }, [isOpen, reverseShare, form]);

  const { acceptsExpiry } = useLinkLifetime();
  const currentExpiration = toDateTimeLocal(reverseShare?.expiration);

  const submit = form.handleSubmit(async (values) => {
    if (!reverseShare) return;
    if (!acceptsExpiry(values.hasExpiration ? values.expiration : "", currentExpiration)) return;
    await onUpdateReverseShare(toUpdateBody(values, reverseShare.id, reverseShare.hasPassword));
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isUpdating && onClose()}>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>{t("reverseShares.calm.form.editTitle")}</DialogTitle>
          <DialogDescription>{t("reverseShares.modals.edit.description")}</DialogDescription>
        </DialogHeader>
        <form id="receive-edit-form" onSubmit={submit} className="-mx-6 overflow-y-auto px-6 py-1" noValidate>
          <ReverseShareFormFields
            form={form}
            mode="edit"
            hadPassword={!!reverseShare?.hasPassword}
            hadExpiration={!!reverseShare?.expiration}
            unchangedExpiration={currentExpiration}
          />
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isUpdating}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="receive-edit-form" disabled={isUpdating}>
            {isUpdating ? t("reverseShares.modals.edit.updating") : t("reverseShares.modals.edit.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
