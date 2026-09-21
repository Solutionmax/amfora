"use client";

import { useState } from "react";
import { IconShield } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

interface TwoFactorVerificationProps {
  twoFactorCode: string;
  setTwoFactorCode: (code: string) => void;
  onSubmit: (rememberDevice?: boolean) => void;
  error?: string;
  isSubmitting: boolean;
}

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(rememberDevice);
  };

  const handleCodeChange = (value: string) => {
    setTwoFactorCode(value);
  };

  const handleBackupCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setTwoFactorCode(value);
  };

  return (
    <Card className="w-full gap-0 border-0 bg-transparent py-0 shadow-none">
      <CardHeader className="gap-3 border-b px-0 pb-5 pt-0 text-left">
        <div className="flex items-center gap-3">
          <div className="tile">
            <IconShield className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-xl">{t("twoFactor.verification.title")}</CardTitle>
            <CardDescription className="mt-1">
              {showBackupCode ? t("twoFactor.verification.backupDescription") : t("twoFactor.verification.description")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="twoFactorCode" className="mb-2 block">
              {showBackupCode ? t("twoFactor.verification.backupCode") : t("twoFactor.verification.verificationCode")}
            </Label>
            {showBackupCode ? (
              <Input
                id="twoFactorCode"
                type="text"
                placeholder={t("twoFactor.verification.backupCodePlaceholder")}
                value={twoFactorCode}
                onChange={handleBackupCodeChange}
                className="text-center tracking-widest font-mono"
                maxLength={9}
              />
            ) : (
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={twoFactorCode} onChange={handleCodeChange}>
                  <InputOTPGroup>
                    <InputOTPSlot className="w-7 min-[400px]:w-9" index={0} />
                    <InputOTPSlot className="w-7 min-[400px]:w-9" index={1} />
                    <InputOTPSlot className="w-7 min-[400px]:w-9" index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot className="w-7 min-[400px]:w-9" index={3} />
                    <InputOTPSlot className="w-7 min-[400px]:w-9" index={4} />
                    <InputOTPSlot className="w-7 min-[400px]:w-9" index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberDevice"
              checked={rememberDevice}
              onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
            />
            <Label htmlFor="rememberDevice" className="text-sm font-normal cursor-pointer">
              {t("twoFactor.verification.rememberDevice")}
            </Label>
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl"
            disabled={isSubmitting || twoFactorCode.length < (showBackupCode ? 8 : 6)}
          >
            {isSubmitting ? t("twoFactor.verification.verifying") : t("twoFactor.verification.verify")}
          </Button>

          {error && (
            <div className="rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</div>
          )}

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setShowBackupCode(!showBackupCode);
                setTwoFactorCode("");
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {showBackupCode
                ? t("twoFactor.verification.useAuthenticatorCode")
                : t("twoFactor.verification.useBackupCode")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
