"use client";

import React, { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-section";
import { copyText } from "@/lib/clipboard";

interface CallbackUrlDisplayProps {
  providerName: string;
}

const COPIED_RESET_MS = 2000;

/** The redirect URI to paste at the provider, with a copy button. */
export function CallbackUrlDisplay({ providerName }: CallbackUrlDisplayProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/providers/${providerName}/callback`
      : `/api/auth/providers/${providerName}/callback`;

  const copyToClipboard = async () => {
    try {
      await copyText(callbackUrl);
      setCopied(true);
      toast.success(t("authProviders.form.callbackUrlCopied"));
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error(t("common.unexpectedError"));
    }
  };

  return (
    <Field label={t("authProviders.form.callbackUrl")} hint={t("authProviders.form.callbackUrlDescription")}>
      <div className="flex min-h-10 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface-2 py-1 pl-3 pr-1">
        <code className="mono min-w-0 flex-1 break-all text-[12.5px] text-ink-2">{callbackUrl}</code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={copyToClipboard}
          aria-label={t("authProviders.form.copyCallbackUrl")}
        >
          {copied ? <IconCheck aria-hidden="true" /> : <IconCopy aria-hidden="true" />}
        </Button>
      </div>
    </Field>
  );
}
