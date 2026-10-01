"use client";

import { useState, type ReactNode } from "react";
import {
  IconFiles,
  IconFileText,
  IconLayout,
  IconLink,
  IconLock,
  IconMail,
  IconRuler2,
  IconUser,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineList, LineRow } from "@/components/ui/line-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { FieldRequirement, PageLayout } from "@/http/endpoints/reverse-shares/types";
import { useReverseShareDetails } from "../hooks/use-reverse-share-details";
import type { ReverseShare, ReverseShareChanges } from "../hooks/use-reverse-shares";
import { parseFileTypes, positiveIntOrNull } from "../lib/receive-format";
import { FileSizeInput } from "./file-size-input";
import { FileTypesTagsInput } from "./file-types-tags-input";

type Editing = "types" | "maxFiles" | "maxSize" | null;

export interface SenderRulesProps {
  reverseShare: ReverseShare;
  onUpdate: (changes: ReverseShareChanges) => Promise<boolean>;
  onEditPassword: () => void;
  onRemovePassword: () => Promise<unknown> | void;
  onEditAlias: () => void;
}

const FIELD_OPTIONS: FieldRequirement[] = ["REQUIRED", "OPTIONAL", "HIDDEN"];

/** A rule row that opens a small editor underneath it. */
function RuleWithEditor({
  isEditing,
  row,
  hint,
  saving,
  onSave,
  onCancel,
  children,
}: {
  isEditing: boolean;
  row: ReactNode;
  hint?: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  const t = useTranslations();

  return (
    <div>
      {row}
      {isEditing && (
        <form
          className="grid gap-2 pb-4 pl-[31px]"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          {children}
          {hint && <p className="text-[12.5px] text-ink-3">{hint}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** What senders must do before their files come in. Every row saves on its own. */
export function SenderRules({
  reverseShare,
  onUpdate,
  onEditPassword,
  onRemovePassword,
  onEditAlias,
}: SenderRulesProps) {
  const t = useTranslations();
  const { formatFileSize } = useReverseShareDetails();
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (what: Exclude<Editing, null>, value: string) => {
    setDraft(value);
    setEditing(what);
  };

  /** One save at a time, so quick changes cannot race each other. */
  const save = async (changes: ReverseShareChanges) => {
    if (saving) return false;
    setSaving(true);
    try {
      return await onUpdate(changes);
    } finally {
      setSaving(false);
    }
  };

  const saveAndClose = async (changes: ReverseShareChanges) => {
    if (await save(changes)) setEditing(null);
  };

  const removePassword = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onRemovePassword();
    } finally {
      setSaving(false);
    }
  };

  const fieldSub = (value: string) =>
    value === "REQUIRED"
      ? t("reverseShares.calm.rules.fieldRequired")
      : value === "HIDDEN"
        ? t("reverseShares.calm.rules.fieldHidden")
        : t("reverseShares.calm.rules.fieldOptional");

  const fieldSelect = (value: string, label: string, onChange: (next: FieldRequirement) => void) => (
    <Select value={value || "OPTIONAL"} disabled={saving} onValueChange={(next) => onChange(next as FieldRequirement)}>
      <SelectTrigger size="sm" className="w-[118px]" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {FIELD_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`reverseShares.labels.fieldOptions.${option.toLowerCase()}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const changeButton = (label: string, onClick: () => void) => (
    <Button variant="link" className="h-auto px-0" onClick={onClick} aria-label={label}>
      {t("reverseShares.calm.change")}
    </Button>
  );

  const types = parseFileTypes(reverseShare.allowedFileTypes);
  const alias = reverseShare.alias?.alias;

  return (
    <LineList>
      <LineRow
        icon={<IconUser />}
        title={t("reverseShares.calm.rules.name")}
        sub={fieldSub(reverseShare.nameFieldRequired)}
      >
        {fieldSelect(reverseShare.nameFieldRequired, t("reverseShares.calm.rules.name"), (next) =>
          save({ nameFieldRequired: next })
        )}
      </LineRow>

      <LineRow
        icon={<IconMail />}
        title={t("reverseShares.calm.rules.email")}
        sub={fieldSub(reverseShare.emailFieldRequired)}
      >
        {fieldSelect(reverseShare.emailFieldRequired, t("reverseShares.calm.rules.email"), (next) =>
          save({ emailFieldRequired: next })
        )}
      </LineRow>

      <LineRow
        icon={<IconLock />}
        title={t("reverseShares.calm.rules.password")}
        sub={
          reverseShare.hasPassword
            ? t("reverseShares.calm.rules.passwordOn")
            : t("reverseShares.calm.rules.passwordOff")
        }
      >
        {reverseShare.hasPassword && changeButton(t("reverseShares.calm.rules.changePassword"), onEditPassword)}
        <Switch
          checked={reverseShare.hasPassword}
          disabled={saving}
          onCheckedChange={(checked) => (checked ? onEditPassword() : removePassword())}
          aria-label={t("reverseShares.calm.rules.password")}
        />
      </LineRow>

      <RuleWithEditor
        isEditing={editing === "types"}
        row={
          <LineRow
            icon={<IconFileText />}
            title={t("reverseShares.calm.rules.types")}
            sub={types.length ? types.join(", ") : t("reverseShares.calm.rules.anyType")}
          >
            {editing !== "types" &&
              changeButton(t("reverseShares.calm.rules.types"), () => startEdit("types", types.join(",")))}
          </LineRow>
        }
        hint={t("reverseShares.calm.rules.typesHint")}
        saving={saving}
        onCancel={() => setEditing(null)}
        onSave={() => saveAndClose({ allowedFileTypes: parseFileTypes(draft).join(",") || null })}
      >
        <FileTypesTagsInput
          value={parseFileTypes(draft)}
          onChange={(tags) => setDraft(tags.join(","))}
          placeholder={t("reverseShares.calm.typesPlaceholder")}
          ariaLabel={t("reverseShares.calm.rules.types")}
        />
      </RuleWithEditor>

      <RuleWithEditor
        isEditing={editing === "maxFiles"}
        row={
          <LineRow
            icon={<IconFiles />}
            title={t("reverseShares.calm.rules.maxFiles")}
            sub={
              reverseShare.maxFiles
                ? t("reverseShares.calm.rules.maxFilesValue", { count: reverseShare.maxFiles })
                : t("reverseShares.labels.noLimit")
            }
          >
            {editing !== "maxFiles" &&
              changeButton(t("reverseShares.calm.rules.maxFiles"), () =>
                startEdit("maxFiles", reverseShare.maxFiles ? String(reverseShare.maxFiles) : "")
              )}
          </LineRow>
        }
        hint={t("reverseShares.calm.rules.emptyNoLimit")}
        saving={saving}
        onCancel={() => setEditing(null)}
        onSave={() => saveAndClose({ maxFiles: positiveIntOrNull(draft) })}
      >
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("reverseShares.calm.unlimited")}
          aria-label={t("reverseShares.calm.rules.maxFiles")}
          className="max-w-[180px]"
        />
      </RuleWithEditor>

      <RuleWithEditor
        isEditing={editing === "maxSize"}
        row={
          <LineRow
            icon={<IconRuler2 />}
            title={t("reverseShares.calm.rules.maxSize")}
            sub={
              reverseShare.maxFileSize
                ? t("reverseShares.calm.rules.maxSizeValue", { size: formatFileSize(reverseShare.maxFileSize) })
                : t("reverseShares.labels.noLimit")
            }
          >
            {editing !== "maxSize" &&
              changeButton(t("reverseShares.calm.rules.maxSize"), () =>
                startEdit("maxSize", reverseShare.maxFileSize ? String(reverseShare.maxFileSize) : "")
              )}
          </LineRow>
        }
        hint={t("reverseShares.calm.rules.emptyNoLimit")}
        saving={saving}
        onCancel={() => setEditing(null)}
        onSave={() => saveAndClose({ maxFileSize: positiveIntOrNull(draft) })}
      >
        <div className="max-w-[260px]">
          <FileSizeInput value={draft} onChange={setDraft} placeholder={t("reverseShares.calm.unlimited")} />
        </div>
      </RuleWithEditor>

      <LineRow
        icon={<IconLayout />}
        title={t("reverseShares.calm.rules.layout")}
        sub={t("reverseShares.calm.rules.layoutHint")}
      >
        <Select
          value={reverseShare.pageLayout || "DEFAULT"}
          disabled={saving}
          onValueChange={(next) => save({ pageLayout: next as PageLayout })}
        >
          <SelectTrigger size="sm" className="w-[118px]" aria-label={t("reverseShares.calm.rules.layout")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="DEFAULT">{t("reverseShares.labels.layoutOptions.default")}</SelectItem>
            <SelectItem value="VESSEL">{t("reverseShares.labels.layoutOptions.vessel")}</SelectItem>
          </SelectContent>
        </Select>
      </LineRow>

      <LineRow
        icon={<IconLink />}
        title={t("reverseShares.calm.rules.alias")}
        sub={alias ? <span className="mono">/r/{alias}</span> : t("reverseShares.calm.noLinkYet")}
      >
        {changeButton(t("reverseShares.calm.rules.alias"), onEditAlias)}
      </LineRow>
    </LineList>
  );
}
