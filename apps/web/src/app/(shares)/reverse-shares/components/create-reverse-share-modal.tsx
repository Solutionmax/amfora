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
import { useStartingExpiry } from "@/hooks/use-link-lifetime";
import type { CreateReverseShareBody } from "@/http/endpoints/reverse-shares/types";
import { emptyReceiveForm, toCreateBody, type ReceiveFormValues } from "../lib/receive-form";
import { ReverseShareFormFields } from "./reverse-share-form-fields";

interface CreateReverseShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReverseShare: (data: CreateReverseShareBody) => Promise<unknown>;
  isCreating: boolean;
}

/** New receive link. After saving the page asks for the link address. */
export function CreateReverseShareModal({
  isOpen,
  onClose,
  onCreateReverseShare,
  isCreating,
}: CreateReverseShareModalProps) {
  const t = useTranslations();
  const form = useForm<ReceiveFormValues>({ defaultValues: emptyReceiveForm() });

  useEffect(() => {
    if (isOpen) form.reset(emptyReceiveForm());
  }, [isOpen, form]);

  // After the effect above, so the default end date lands on the freshly reset form.
  const { maxDays, acceptsExpiry } = useStartingExpiry(isOpen, (expiration) =>
    form.reset({ ...emptyReceiveForm(), expiration, hasExpiration: expiration !== "" || maxDays > 0 })
  );

  const submit = form.handleSubmit(async (values) => {
    if (!acceptsExpiry(values.hasExpiration ? values.expiration : "")) return;
    await onCreateReverseShare(toCreateBody(values));
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isCreating && onClose()}>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>{t("reverseShares.calm.form.createTitle")}</DialogTitle>
          <DialogDescription>{t("reverseShares.calm.form.createDescription")}</DialogDescription>
        </DialogHeader>
        <form id="receive-create-form" onSubmit={submit} className="-mx-6 overflow-y-auto px-6 py-1" noValidate>
          <ReverseShareFormFields form={form} mode="create" />
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="receive-create-form" disabled={isCreating}>
            {isCreating ? t("common.creating") : t("reverseShares.calm.form.createButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
