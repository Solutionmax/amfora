"use client";

import { useTranslations } from "next-intl";

import { HOURS_PER_DAY, type SecretOptions } from "@/app/secrets/lib/secret-options";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CreateSecretRequest, SecretLimits } from "@/http/endpoints/secrets";
import { sealSecret } from "@/lib/secret-crypto";

const MAX_LABEL_LENGTH = 80;
const MAX_PASSPHRASE_LENGTH = 200;

export interface SecretDraft {
  text: string;
  label: string;
  expiryHours: number;
  maxOpens: number;
  usePassphrase: boolean;
  passphrase: string;
}

export function emptyDraft(options: SecretOptions): SecretDraft {
  return {
    text: "",
    label: "",
    expiryHours: options.defaultExpiryHours,
    maxOpens: 1,
    usePassphrase: false,
    passphrase: "",
  };
}

export function isDraftReady(draft: SecretDraft): boolean {
  return draft.text.length > 0 && (!draft.usePassphrase || draft.passphrase.length > 0);
}

/** Seals the draft in the browser. Only the returned request goes to the server; the link key stays here. */
export async function sealDraft(draft: SecretDraft): Promise<{ request: CreateSecretRequest; linkKey: string }> {
  const passphrase = draft.usePassphrase ? draft.passphrase : "";
  const { linkKey, ciphertext, proof, verifier } = await sealSecret(draft.text, passphrase);
  const label = draft.label.trim();
  return {
    linkKey,
    request: {
      ciphertext,
      proof,
      verifier,
      hasPassphrase: passphrase.length > 0,
      ...(label ? { label } : {}),
      expiresInHours: draft.expiryHours,
      maxOpens: draft.maxOpens,
    },
  };
}

interface SecretFieldsProps {
  draft: SecretDraft;
  onChange: (draft: SecretDraft) => void;
  limits: SecretLimits;
  options: SecretOptions;
  /** The label is for the maker's own list, so a visitor without an account gets none. */
  showLabel?: boolean;
  disabled?: boolean;
}

/** The fields of a new secret, shared by the dialog for signed-in users and the public page. */
export function SecretFields({ draft, onChange, limits, options, showLabel, disabled }: SecretFieldsProps) {
  const t = useTranslations("secrets.form");
  const format = useTranslations("secrets");
  const set = (patch: Partial<SecretDraft>) => onChange({ ...draft, ...patch });

  const expiryLabel = (hours: number) =>
    hours % HOURS_PER_DAY === 0 ? format("days", { count: hours / HOURS_PER_DAY }) : format("hours", { count: hours });

  return (
    <>
      <Field
        label={t("secret")}
        htmlFor="secret-text"
        hint={
          <span className="flex justify-between gap-3">
            <span>{t("secretHint")}</span>
            <span className="shrink-0 tabular-nums">
              {draft.text.length.toLocaleString()} / {limits.maxLength.toLocaleString()}
            </span>
          </span>
        }
      >
        <Textarea
          id="secret-text"
          className="min-h-[132px] font-mono text-[13px] leading-relaxed"
          value={draft.text}
          maxLength={limits.maxLength}
          placeholder={t("secretPlaceholder")}
          onChange={(event) => set({ text: event.target.value })}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          autoFocus
        />
      </Field>

      {showLabel && (
        <Field label={t("label")} htmlFor="secret-label" hint={t("labelHint")}>
          <Input
            id="secret-label"
            value={draft.label}
            maxLength={MAX_LABEL_LENGTH}
            placeholder={t("labelPlaceholder")}
            onChange={(event) => set({ label: event.target.value })}
            autoComplete="off"
            disabled={disabled}
          />
        </Field>
      )}

      <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-3.5">
        <Field label={t("expires")} htmlFor="secret-expiry">
          <Select
            value={String(draft.expiryHours)}
            onValueChange={(value) => set({ expiryHours: Number(value) })}
            disabled={disabled}
          >
            <SelectTrigger id="secret-expiry" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.expiryHours.map((hours) => (
                <SelectItem key={hours} value={String(hours)}>
                  {expiryLabel(hours)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("canBeOpened")} htmlFor="secret-opens">
          <Select
            value={String(draft.maxOpens)}
            onValueChange={(value) => set({ maxOpens: Number(value) })}
            disabled={disabled}
          >
            <SelectTrigger id="secret-opens" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.openCounts.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {format("times", { count })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3.5">
        <label htmlFor="secret-use-passphrase" className="min-w-0">
          <span className="block text-[13.5px] font-semibold">{t("passphrase")}</span>
          <span className="block text-[12.5px] text-ink-3">{t("passphraseHint")}</span>
        </label>
        <Switch
          id="secret-use-passphrase"
          checked={draft.usePassphrase}
          onCheckedChange={(usePassphrase) => set({ usePassphrase, passphrase: "" })}
          disabled={disabled}
        />
      </div>
      {draft.usePassphrase && (
        <Field label={t("passphrase")} htmlFor="secret-passphrase">
          <Input
            id="secret-passphrase"
            value={draft.passphrase}
            maxLength={MAX_PASSPHRASE_LENGTH}
            onChange={(event) => set({ passphrase: event.target.value })}
            autoComplete="off"
            disabled={disabled}
          />
        </Field>
      )}
    </>
  );
}
