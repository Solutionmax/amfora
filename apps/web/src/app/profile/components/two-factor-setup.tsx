"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { IconCopy } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import type { TwoFactorSetupResponse } from "@/http/endpoints/auth/two-factor/types";
import { copyText } from "@/lib/clipboard";
import { digitsOnly, groupKey } from "../utils";

const CODE_LENGTH = 6;

/** Inline setup: QR code, the manual key, and the first code from the app. */
export function TwoFactorSetup({
  setupData,
  code,
  onCodeChange,
  onVerify,
  onCancel,
  isBusy,
}: {
  setupData: TwoFactorSetupResponse;
  code: string;
  onCodeChange: (code: string) => void;
  onVerify: () => void;
  onCancel: () => void;
  isBusy: boolean;
}) {
  const t = useTranslations();
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    codeRef.current?.focus();
  }, []);

  const handleCopy = async () => {
    try {
      await copyText(setupData.manualEntryKey);
      toast.success(t("common.copied"));
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (code.length === CODE_LENGTH) onVerify();
  };

  return (
    <div className="grid gap-5 rounded-xl border border-line p-5 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-[22px]">
      <img
        src={setupData.qrCode}
        alt={t("twoFactor.setup.qrCode")}
        className="size-[132px] rounded-lg border border-line bg-white p-2"
      />
      <form className="grid min-w-0 content-start gap-[18px]" onSubmit={handleSubmit}>
        <div className="min-w-0">
          <p className="text-[12.5px] text-ink-3">{t("profile.calm.scanHint")}</p>
          <div className="mt-1 flex items-start gap-1.5">
            <code className="min-w-0 break-all font-mono text-[13px] font-medium tracking-[0.06em] text-ink-2">
              {groupKey(setupData.manualEntryKey)}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-my-1.5 size-7 shrink-0"
              onClick={() => void handleCopy()}
              aria-label={t("profile.calm.copyKey")}
            >
              <IconCopy className="size-[15px]" />
            </Button>
          </div>
        </div>
        <Field label={t("profile.calm.codeFromApp")} htmlFor="two-factor-setup-code">
          <Input
            ref={codeRef}
            id="two-factor-setup-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            placeholder="000000"
            value={code}
            onChange={(event) => onCodeChange(digitsOnly(event.target.value, CODE_LENGTH))}
            className="h-11 max-w-[200px] text-center font-mono text-lg font-medium tracking-[0.4em] md:text-lg"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isBusy || code.length !== CODE_LENGTH}>
            {t("profile.calm.verifyAndTurnOn")}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isBusy}>
            {t("twoFactor.setup.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
