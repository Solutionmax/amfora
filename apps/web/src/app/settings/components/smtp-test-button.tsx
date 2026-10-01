"use client";

import { useState } from "react";
import { IconLoader2, IconPlugConnected } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { testSmtpConnection } from "@/http/endpoints/app";

interface SmtpTestButtonProps {
  getFormValues: () => {
    smtpEnabled: string;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPass: string;
    smtpSecure: string;
    smtpNoAuth: string;
    smtpTrustSelfSigned: string;
  };
}

/** Tests the SMTP values in the form as typed, before they are saved. */
export function SmtpTestButton({ getFormValues }: SmtpTestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations();

  const handleTestConnection = async () => {
    const formValues = getFormValues();

    if (formValues.smtpEnabled !== "true") {
      toast.error(t("settings.messages.smtpNotEnabled"));
      return;
    }

    if (!formValues.smtpHost || !formValues.smtpPort) {
      toast.error(t("settings.messages.smtpMissingHostPort"));
      return;
    }

    if (formValues.smtpNoAuth !== "true" && (!formValues.smtpUser || !formValues.smtpPass)) {
      toast.error(t("settings.messages.smtpMissingAuth"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await testSmtpConnection({ smtpConfig: formValues });

      if (response.data.success) {
        toast.success(t("settings.messages.smtpTestSuccess"));
      } else {
        toast.error(t("settings.messages.smtpTestGenericError"));
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || t("common.unexpectedError");
      toast.error(t("settings.messages.smtpTestFailed", { error: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid justify-items-start gap-1.5">
      <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isLoading}>
        {isLoading ? (
          <IconLoader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <IconPlugConnected aria-hidden="true" />
        )}
        {isLoading ? t("settings.buttons.testing") : t("settings.buttons.testSmtp")}
      </Button>
      <p className="text-[12.5px] text-ink-3">{t("settings.calm.smtpTestHint")}</p>
    </div>
  );
}
