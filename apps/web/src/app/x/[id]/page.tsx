"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { IconCheck, IconCopy, IconEye } from "@tabler/icons-react";
import axios from "axios";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { FormError, PublicFormSkeleton } from "@/components/auth/public-card";
import { SecretShell } from "@/components/secrets/secret-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-section";
import { PasswordInput } from "@/components/ui/password-input";
import { getSecretStatus, openSecret } from "@/http/endpoints/secrets";
import { copyText } from "@/lib/clipboard";
import { secretOpener } from "@/lib/secret-crypto";

type View =
  | { step: "loading" }
  | { step: "gone" }
  | { step: "waiting"; hasPassphrase: boolean; opensLeft: number }
  | { step: "shown"; text: string; opensLeft: number };

const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY = 429;

/**
 * The page a reader lands on. Loading it costs nothing; only the button opens the secret,
 * so a chat app that fetches the link for a preview cannot use it up.
 */
export default function SecretRevealPage() {
  const t = useTranslations("secrets.public");
  const format = useTranslations("secrets");
  const id = useParams()?.id as string;
  const [view, setView] = useState<View>({ step: "loading" });
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // A link without its key cannot open anything, so do not even ask.
    if (!window.location.hash.slice(1)) {
      setView({ step: "gone" });
      return;
    }
    getSecretStatus(id)
      .then((status) => !cancelled && setView({ step: "waiting", ...status }))
      .catch(() => !cancelled && setView({ step: "gone" }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const reveal = async (event: FormEvent) => {
    event.preventDefault();
    if (view.step !== "waiting") return;
    setIsBusy(true);
    setError(null);
    try {
      const opener = await secretOpener(window.location.hash.slice(1), passphrase);
      const { ciphertext, opensLeft } = await openSecret(id, { proof: opener.proof, verifier: opener.verifier });
      setView({ step: "shown", text: opener.open(ciphertext), opensLeft });
      setPassphrase("");
    } catch (cause) {
      const response = axios.isAxiosError(cause) ? cause.response : undefined;
      if (response?.status === HTTP_FORBIDDEN) {
        setError(t("wrongPassphrase", { count: Number(response.data?.attemptsLeft ?? 0) }));
      } else if (response?.status === HTTP_TOO_MANY) {
        setError(t("tooManyTries"));
      } else {
        // Used up, expired, deleted, or a link that lost part of its key.
        setView({ step: "gone" });
      }
    } finally {
      setIsBusy(false);
    }
  };

  const copy = async () => {
    if (view.step !== "shown") return;
    try {
      await copyText(view.text);
      toast.success(t("copied"));
    } catch {
      toast.error(format("copyFailed"));
    }
  };

  if (view.step === "loading") {
    return (
      <SecretShell title={t("waitingTitle")}>
        <PublicFormSkeleton fields={0} />
      </SecretShell>
    );
  }

  if (view.step === "gone") {
    return <SecretShell title={t("goneTitle")} description={t("goneText")} />;
  }

  if (view.step === "shown") {
    return (
      <SecretShell title={t("shownTitle")} description={view.opensLeft > 0 ? t("shownTextMore") : t("shownTextLast")}>
        <div className="grid gap-3.5">
          <pre
            data-testid="secret-text"
            tabIndex={0}
            className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-line-2 bg-surface px-4 py-3.5 font-mono text-[13.5px] font-medium leading-relaxed"
          >
            {view.text}
          </pre>
          <Button className="h-[42px] w-full" onClick={() => void copy()}>
            <IconCopy />
            {t("copy")}
          </Button>
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-warn">
            <IconCheck className="size-4 shrink-0" aria-hidden="true" />
            {view.opensLeft > 0 ? t("worksMore", { count: view.opensLeft }) : t("destroyed")}
          </p>
        </div>
      </SecretShell>
    );
  }

  const more = view.opensLeft > 1 ? t("opensMore", { count: view.opensLeft }) : t("opensOnce");
  return (
    <SecretShell
      title={t("waitingTitle")}
      description={`${view.hasPassphrase ? `${t("hasPassphrase")} ` : ""}${more} ${t("thenDestroyed")}`}
    >
      <form onSubmit={reveal} className="grid gap-3.5">
        <FormError>{error}</FormError>
        {view.hasPassphrase && (
          <Field label={format("form.passphrase")} htmlFor="secret-passphrase" hint={t("passphraseHint")}>
            <PasswordInput
              id="secret-passphrase"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              autoComplete="off"
              autoFocus
              required
            />
          </Field>
        )}
        <Button type="submit" className="h-[42px] w-full" disabled={isBusy || (view.hasPassphrase && !passphrase)}>
          <IconEye />
          {isBusy ? t("opening") : t("show")}
        </Button>
        {!view.hasPassphrase && <p className="text-[12.5px] text-ink-3">{t("previewSafe")}</p>}
      </form>
    </SecretShell>
  );
}
