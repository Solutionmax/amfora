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
import { updateSharePassword } from "@/http/endpoints";

interface ShareSecurityModalProps {
  shareId: string | null;
  share: any;
  onClose: () => void;
  onSuccess?: () => void;
}

const MIN_PASSWORD_LENGTH = 2;

export function ShareSecurityModal({ shareId, share, onClose, onSuccess }: ShareSecurityModalProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const alreadyProtected = !!share?.security?.hasPassword;

  // Opening this dialog is how a password gets turned on, so the switch starts on.
  useEffect(() => {
    if (share) {
      setHasPassword(true);
      setPassword("");
      setError(null);
    }
  }, [share]);

  const handleSave = async () => {
    if (!shareId) return;

    if (hasPassword) {
      if (!password.trim()) {
        setError(t("shareSecurity.validation.passwordRequired"));
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(t("shareSecurity.validation.passwordTooShort"));
        return;
      }
    }

    setIsLoading(true);
    try {
      await updateSharePassword(shareId, { password: hasPassword ? password : null });

      const successMessage = hasPassword
        ? alreadyProtected
          ? t("shareSecurity.success.passwordUpdated")
          : t("shareSecurity.success.passwordSet")
        : t("shareSecurity.success.passwordRemoved");
      toast.success(successMessage);

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to update share security:", err);
      toast.error(t("shareSecurity.error.updateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordToggle = (checked: boolean) => {
    setHasPassword(checked);
    setError(null);
    if (!checked) setPassword("");
  };

  return (
    <Dialog open={!!shareId} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t("shares.calm.password")}</DialogTitle>
          <DialogDescription>{t("shares.calm.modals.securityDescription")}</DialogDescription>
        </DialogHeader>

        <form
          id="share-security-form"
          className="grid gap-[18px]"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <label htmlFor="password-protection" className="flex cursor-pointer items-center gap-3.5">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t("shareSecurity.passwordProtection")}</span>
              <span className="block text-[12.5px] text-ink-3">
                {hasPassword ? t("shareSecurity.info.withPassword") : t("shareSecurity.info.withoutPassword")}
              </span>
            </span>
            <Switch id="password-protection" checked={hasPassword} onCheckedChange={handlePasswordToggle} />
          </label>

          {hasPassword && (
            <Field
              label={alreadyProtected ? t("shareSecurity.newPassword") : t("shareSecurity.password")}
              htmlFor="share-password"
              hint={
                alreadyProtected
                  ? t("shares.calm.modals.passwordSet")
                  : t("shareSecurity.passwordRequirements.minLength")
              }
              error={error ?? undefined}
            >
              <PasswordInput
                id="share-password"
                autoFocus
                autoComplete="new-password"
                value={password}
                aria-invalid={!!error || undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder={t("shareSecurity.passwordPlaceholder")}
              />
            </Field>
          )}
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="share-security-form" disabled={isLoading}>
            {isLoading ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
