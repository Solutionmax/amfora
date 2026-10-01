"use client";

import { useEffect, useState } from "react";
import { IconDice5 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

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
import { cn, customNanoid } from "@/lib/utils";
import type { ReverseShare } from "../hooks/use-reverse-shares";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const ALIAS_PATTERN = /^[a-zA-Z0-9-_]+$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 50;

const randomAlias = () => customNanoid(10, ALPHABET);
const cleanAlias = (value: string) =>
  value
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();

interface GenerateAliasModalProps {
  reverseShare: ReverseShare | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateAlias: (reverseShareId: string, alias: string) => Promise<boolean>;
}

/** Pick the address senders use: <host>/r/<alias>. */
export function GenerateAliasModal({ reverseShare, isOpen, onClose, onCreateAlias }: GenerateAliasModalProps) {
  const t = useTranslations();
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [prefix, setPrefix] = useState("/r/");
  const existing = reverseShare?.alias?.alias;

  useEffect(() => {
    setPrefix(`${window.location.host}/r/`);
  }, []);

  useEffect(() => {
    if (!isOpen || !reverseShare) return;
    setAlias(reverseShare.alias?.alias || randomAlias());
    setError(null);
  }, [isOpen, reverseShare]);

  const validate = (value: string) => {
    if (!value) return t("reverseShares.modals.alias.validation.required");
    if (value.length < MIN_LENGTH) return t("reverseShares.modals.alias.validation.minLength");
    if (value.length > MAX_LENGTH) return t("reverseShares.modals.alias.validation.maxLength");
    if (!ALIAS_PATTERN.test(value)) return t("reverseShares.modals.alias.validation.pattern");
    return null;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reverseShare) return;
    const problem = validate(alias);
    if (problem) return setError(problem);
    setSaving(true);
    try {
      if (await onCreateAlias(reverseShare.id, alias)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {existing ? t("reverseShares.calm.alias.editTitle") : t("reverseShares.calm.alias.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("reverseShares.calm.alias.description")}</DialogDescription>
        </DialogHeader>

        <form id="receive-alias-form" onSubmit={submit}>
          <Field
            label={t("reverseShares.modals.alias.aliasLabel")}
            htmlFor="receive-alias"
            hint={existing ? t("reverseShares.calm.alias.oldStops") : t("reverseShares.modals.alias.help")}
            error={error}
          >
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={cn(
                  "flex h-10 min-w-0 flex-1 items-center rounded-[var(--radius)] border border-line-2 bg-surface pl-3 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15",
                  error && "border-bad"
                )}
              >
                <span className="mono max-w-[45%] shrink-0 truncate text-[13px] text-ink-3">{prefix}</span>
                <input
                  id="receive-alias"
                  value={alias}
                  maxLength={MAX_LENGTH}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!error}
                  placeholder={t("reverseShares.modals.alias.aliasPlaceholder")}
                  onChange={(event) => {
                    setAlias(cleanAlias(event.target.value));
                    setError(null);
                  }}
                  className="mono h-full min-w-0 flex-1 bg-transparent pr-3 text-[13px] text-ink outline-none placeholder:text-ink-3"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10"
                onClick={() => {
                  setAlias(randomAlias());
                  setError(null);
                }}
                aria-label={t("reverseShares.modals.alias.randomTooltip")}
                title={t("reverseShares.modals.alias.randomTooltip")}
              >
                <IconDice5 />
              </Button>
            </div>
          </Field>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("reverseShares.modals.alias.cancel")}
          </Button>
          <Button type="submit" form="receive-alias-form" disabled={saving || alias.length < MIN_LENGTH}>
            {saving ? t("common.saving") : existing ? t("common.save") : t("reverseShares.calm.alias.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
