"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { IconCopy, IconLock } from "@tabler/icons-react";
import axios from "axios";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { secretLink, secretOptions } from "@/app/secrets/lib/secret-options";
import { FormError, PublicFormSkeleton } from "@/components/auth/public-card";
import {
  emptyDraft,
  isDraftReady,
  sealDraft,
  SecretFields,
  type SecretDraft,
} from "@/components/secrets/secret-fields";
import { SecretShell } from "@/components/secrets/secret-shell";
import { Button } from "@/components/ui/button";
import { createAnonymousSecret, getSecretLimits, type SecretLimits } from "@/http/endpoints/secrets";
import { copyText } from "@/lib/clipboard";

const HTTP_TOO_MANY = 429;

/** The form itself, mounted once the limits are known so its defaults fit them. */
function CreateForm({ limits, onCreated }: { limits: SecretLimits; onCreated: (link: string) => void }) {
  const t = useTranslations("secrets");
  const options = useMemo(() => secretOptions(limits), [limits]);
  const [draft, setDraft] = useState<SecretDraft>(() => emptyDraft(options));
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isDraftReady(draft)) return;
    setIsBusy(true);
    setError(null);
    try {
      const { request, linkKey } = await sealDraft(draft);
      const { id } = await createAnonymousSecret(request);
      onCreated(secretLink(window.location.origin, id, linkKey));
    } catch (cause) {
      const tooMany = axios.isAxiosError(cause) && cause.response?.status === HTTP_TOO_MANY;
      setError(tooMany ? t("public.tooManySecrets") : t("createFailed"));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-[18px]">
      <FormError>{error}</FormError>
      <SecretFields draft={draft} onChange={setDraft} limits={limits} options={options} disabled={isBusy} />
      <Button type="submit" className="h-[42px] w-full" disabled={isBusy || !isDraftReady(draft)}>
        <IconLock />
        {isBusy ? t("form.sealing") : t("form.create")}
      </Button>
      <p className="text-[12.5px] text-ink-3">{t("public.noAccount")}</p>
    </form>
  );
}

/** Making a secret without an account. Only reachable while an administrator has switched it on. */
export default function SecretCreatePage() {
  const t = useTranslations("secrets");
  const router = useRouter();
  const [limits, setLimits] = useState<SecretLimits | null>(null);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSecretLimits()
      .then((all) => {
        if (cancelled) return;
        if (all.anonymousEnabled) setLimits(all.anonymous);
        else router.replace("/login");
      })
      .catch(() => !cancelled && router.replace("/login"));
    return () => {
      cancelled = true;
    };
  }, [router]);

  const copy = async () => {
    if (!link) return;
    try {
      await copyText(link);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  if (link) {
    return (
      <SecretShell title={t("public.readyTitle")} description={t("public.readyText")}>
        <div className="grid gap-3.5">
          <code
            data-testid="secret-link"
            className="select-all break-all rounded-xl border border-line-2 px-4 py-3 font-mono text-[13px] font-medium text-ink-2"
          >
            {link}
          </code>
          <Button className="h-[42px] w-full" onClick={() => void copy()}>
            <IconCopy />
            {t("copyLink")}
          </Button>
          <Button variant="outline" className="h-[42px] w-full" onClick={() => setLink(null)}>
            {t("public.another")}
          </Button>
        </div>
      </SecretShell>
    );
  }

  return (
    <SecretShell title={t("public.createTitle")} description={t("public.createText")}>
      {limits ? <CreateForm limits={limits} onCreated={setLink} /> : <PublicFormSkeleton fields={2} />}
    </SecretShell>
  );
}
