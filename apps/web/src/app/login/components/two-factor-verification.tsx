"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { FormError, PublicCard, PublicCardFoot } from "@/components/auth/public-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";

const CODE_LENGTH = 6;
const BACKUP_LENGTH = 9;
const BACKUP_MIN = 8;

interface TwoFactorVerificationProps {
  twoFactorCode: string;
  setTwoFactorCode: (code: string) => void;
  onSubmit: (rememberDevice?: boolean) => void;
  error?: string;
  isSubmitting: boolean;
}

/** Second sign-in step: the code from the authenticator app, or a backup code. */
export function TwoFactorVerification({
  twoFactorCode,
  setTwoFactorCode,
  onSubmit,
  error,
  isSubmitting,
}: TwoFactorVerificationProps) {
  const t = useTranslations();
  const [showBackupCode, setShowBackupCode] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [showBackupCode]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(rememberDevice);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = showBackupCode
      ? event.target.value.toUpperCase()
      : event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setTwoFactorCode(value);
  };

  const isComplete = twoFactorCode.length >= (showBackupCode ? BACKUP_MIN : CODE_LENGTH);

  return (
    <PublicCard
      title={t("twoFactor.verification.title")}
      description={
        showBackupCode ? t("twoFactor.verification.backupDescription") : t("twoFactor.verification.description")
      }
    >
      <FormError>{error}</FormError>
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <Field
          label={showBackupCode ? t("twoFactor.verification.backupCode") : t("twoFactor.verification.verificationCode")}
          htmlFor="two-factor-code"
        >
          <Input
            ref={inputRef}
            id="two-factor-code"
            type="text"
            inputMode={showBackupCode ? "text" : "numeric"}
            autoComplete="one-time-code"
            placeholder={
              showBackupCode
                ? t("twoFactor.verification.backupCodePlaceholder")
                : t("twoFactor.verification.verificationCodePlaceholder")
            }
            maxLength={showBackupCode ? BACKUP_LENGTH : CODE_LENGTH}
            value={twoFactorCode}
            onChange={handleChange}
            disabled={isSubmitting}
            aria-invalid={!!error}
            className="h-12 text-center font-mono text-lg font-medium tracking-[0.4em] md:text-lg"
          />
        </Field>

        <label htmlFor="remember-device" className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-2">
          <Checkbox
            id="remember-device"
            checked={rememberDevice}
            onCheckedChange={(checked) => setRememberDevice(checked === true)}
          />
          {t("twoFactor.verification.rememberDevice")}
        </label>

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting || !isComplete}>
          {isSubmitting ? t("twoFactor.verification.verifying") : t("twoFactor.verification.verify")}
        </Button>
      </form>

      <PublicCardFoot>
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-[13px]"
            onClick={() => {
              setShowBackupCode(!showBackupCode);
              setTwoFactorCode("");
            }}
          >
            {showBackupCode
              ? t("twoFactor.verification.useAuthenticatorCode")
              : t("twoFactor.verification.useBackupCode")}
          </Button>
          {/* The pending challenge lives in page state; a reload starts the sign-in over. */}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-[13px] font-medium text-ink-3 hover:text-ink"
            onClick={() => window.location.reload()}
          >
            {t("auth.calm.backToSignIn")}
          </Button>
        </div>
      </PublicCardFoot>
    </PublicCard>
  );
}
