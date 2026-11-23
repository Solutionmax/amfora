"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiInstance from "@/config/api";
import { usePasskeysAvailable } from "@/hooks/use-passkeys-available";

/** A separate proof, never inferred from the age of the signed-in session. */
export function CredentialVerification({
  register,
  providers = [],
}: {
  register: any;
  providers?: { name: string; displayName: string }[];
}) {
  const t = useTranslations();
  const available = usePasskeysAvailable();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function verify() {
    setBusy(true);
    try {
      const options = (await apiInstance.post("/api/auth/passkeys/reauthenticate/options", {})).data;
      const response = await startAuthentication({ optionsJSON: options });
      await apiInstance.post("/api/auth/passkeys/reauthenticate/verify", { response });
      setMessage(t("profile.verification.ready"));
    } catch {
      setMessage(t("profile.verification.failed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-2">
      <label className="text-sm">
        {t("profile.verification.password")}
        <Input type="password" autoComplete="current-password" {...register("currentPassword")} />
      </label>
      <p className="text-sm text-ink-3">{t("profile.verification.hint")}</p>
      {available && (
        <Button type="button" variant="outline" disabled={busy} onClick={verify}>
          {t("profile.verification.passkey")}
        </Button>
      )}
      {providers.map((provider) => (
        <a
          key={provider.name}
          href={`/api/auth/providers/${encodeURIComponent(provider.name)}/authorize?reauthenticate=true`}
          className="text-sm underline"
        >
          {t("profile.verification.provider", { name: provider.displayName })}
        </a>
      ))}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
