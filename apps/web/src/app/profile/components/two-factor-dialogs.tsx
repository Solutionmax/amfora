"use client";

import type { FormEvent } from "react";
import { IconCopy, IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { PasswordField } from "@/components/auth/password-field";
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

interface OpenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Turning 2FA off asks for the account password first. */
export function DisableTwoFactorDialog({
  open,
  onOpenChange,
  password,
  onPasswordChange,
  onConfirm,
  isBusy,
}: OpenProps & {
  password: string;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
  isBusy: boolean;
}) {
  const t = useTranslations();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (password) onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{t("profile.calm.turnOffTitle")}</DialogTitle>
            <DialogDescription>{t("twoFactor.disable.description")}</DialogDescription>
          </DialogHeader>
          <Field label={t("twoFactor.disable.password")} htmlFor="disable-two-factor-password">
            <PasswordField
              id="disable-two-factor-password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isBusy}>
              {t("twoFactor.disable.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={isBusy || !password}>
              {t("profile.calm.turnOff")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Fresh backup codes, shown once after turning 2FA on or asking for new ones. */
export function BackupCodesDialog({
  open,
  onOpenChange,
  codes,
  onDownload,
  onCopy,
}: OpenProps & { codes: string[]; onDownload: () => void; onCopy: () => void }) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("twoFactor.backupCodes.title")}</DialogTitle>
          <DialogDescription>{t("twoFactor.backupCodes.description")}</DialogDescription>
        </DialogHeader>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-y border-line py-4 font-mono text-[13px] font-medium tracking-[0.06em] text-ink-2">
          {codes.map((code, index) => (
            <li key={`${index}-${code}`} className="text-center">
              {code}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onDownload}>
            <IconDownload />
            {t("profile.calm.download")}
          </Button>
          <Button variant="outline" onClick={onCopy}>
            <IconCopy />
            {t("twoFactor.backupCodes.copyToClipboard")}
          </Button>
        </div>
        <p className="text-[12.5px] text-ink-3">{t("profile.calm.backupHint")}</p>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("twoFactor.backupCodes.savedMessage")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Confirm before a device (or all of them) has to enter a code again. */
export function RemoveDevicesDialog({
  open,
  onOpenChange,
  title,
  description,
  detail,
  confirmLabel,
  onConfirm,
  isBusy,
}: OpenProps & {
  title: string;
  description: string;
  detail?: string;
  confirmLabel: string;
  onConfirm: () => void;
  isBusy: boolean;
}) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {detail && <p className="border-y border-line py-3 text-[13px] text-ink-2">{detail}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isBusy}>
            {t("twoFactor.trustedDevices.modals.buttons.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isBusy}>
            {isBusy ? t("twoFactor.trustedDevices.modals.buttons.removing") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
