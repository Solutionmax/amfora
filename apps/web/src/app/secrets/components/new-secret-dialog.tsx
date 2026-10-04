"use client";

import { useMemo, useState, type FormEvent } from "react";
import { IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { emptyDraft, isDraftReady, SecretFields, type SecretDraft } from "@/components/secrets/secret-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SecretLimits } from "@/http/endpoints/secrets";
import { secretOptions } from "../lib/secret-options";

export function NewSecretDialog({
  open,
  limits,
  isBusy,
  onClose,
  onCreate,
}: {
  open: boolean;
  limits: SecretLimits;
  isBusy: boolean;
  onClose: () => void;
  /** Resolves true when the secret was made, so the dialog can clear itself. */
  onCreate: (draft: SecretDraft) => Promise<boolean>;
}) {
  const t = useTranslations();
  const options = useMemo(() => secretOptions(limits), [limits]);
  const [draft, setDraft] = useState<SecretDraft>(() => emptyDraft(options));

  const close = () => {
    setDraft(emptyDraft(options));
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isDraftReady(draft)) return;
    if (await onCreate(draft)) close();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isBusy && close()}>
      <DialogContent className="sm:max-w-[560px]">
        <form onSubmit={handleSubmit} className="grid gap-[18px]">
          <DialogHeader>
            <DialogTitle>{t("secrets.form.title")}</DialogTitle>
            <DialogDescription>{t("secrets.form.description")}</DialogDescription>
          </DialogHeader>
          <SecretFields
            draft={draft}
            onChange={setDraft}
            limits={limits}
            options={options}
            showLabel
            disabled={isBusy}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={isBusy}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isBusy || !isDraftReady(draft)}>
              <IconLock />
              {isBusy ? t("secrets.form.sealing") : t("secrets.form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
