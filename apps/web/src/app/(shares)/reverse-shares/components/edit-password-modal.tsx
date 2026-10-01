"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import type { PasswordChange, ReverseShare } from "../hooks/use-reverse-shares";

const MIN_LENGTH = 4;

interface EditPasswordModalProps {
  reverseShare: ReverseShare | null;
  isOpen: boolean;
  onClose: () => void;
  /** Should throw when saving fails. */
  onUpdatePassword: (id: string, data: PasswordChange) => Promise<unknown>;
}

/** Set, change or remove the password senders need. Opens with protection switched on. */
export function EditPasswordModal({ reverseShare, isOpen, onClose, onUpdatePassword }: EditPasswordModalProps) {
  const t = useTranslations();
  const [enabled, setEnabled] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEnabled(true);
    setPassword("");
    setError(null);
  }, [isOpen]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reverseShare) return;
    if (enabled && !password.trim()) return setError(t("validation.passwordRequired"));
    if (enabled && password.trim().length < MIN_LENGTH) return setError(t("validation.passwordMinLength"));

    setSaving(true);
    try {
      await onUpdatePassword(reverseShare.id, { hasPassword: enabled, password: enabled ? password : undefined });
      toast.success(
        enabled
          ? t("reverseShares.messages.passwordProtectionEnabled")
          : t("reverseShares.messages.passwordProtectionDisabled")
      );
      onClose();
    } catch (err) {
      console.error("Failed to update password:", err);
      toast.error(t("reverseShares.errors.passwordUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const isChange = !!reverseShare?.hasPassword;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {isChange ? t("reverseShares.calm.password.changeTitle") : t("reverseShares.calm.password.setTitle")}
          </DialogTitle>
          <DialogDescription>{t("reverseShares.calm.password.description")}</DialogDescription>
        </DialogHeader>

        <form id="receive-password-form" onSubmit={submit} className="grid gap-4">
          <div className="flex items-center gap-3.5 border-y border-line py-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="receive-password-switch" className="block font-semibold">
                {t("reverseShares.modals.password.hasPassword")}
              </label>
              <p className="text-[12.5px] text-ink-3">
                {enabled ? t("reverseShares.calm.rules.passwordOn") : t("reverseShares.calm.rules.passwordOff")}
              </p>
            </div>
            <Switch
              id="receive-password-switch"
              checked={enabled}
              onCheckedChange={(checked) => {
                setEnabled(checked);
                setError(null);
              }}
            />
          </div>

          {enabled && (
            <Field
              label={
                isChange ? t("reverseShares.calm.password.newPassword") : t("reverseShares.modals.password.password")
              }
              htmlFor="receive-password"
              hint={t("reverseShares.form.password.passwordHelp")}
              error={error}
            >
              <PasswordInput
                id="receive-password"
                value={password}
                autoComplete="new-password"
                autoFocus
                aria-invalid={!!error}
                placeholder={t("reverseShares.labels.enterPassword")}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
              />
            </Field>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("reverseShares.modals.password.cancel")}
          </Button>
          <Button type="submit" form="receive-password-form" disabled={saving}>
            {saving ? t("reverseShares.modals.password.saving") : t("reverseShares.modals.password.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
