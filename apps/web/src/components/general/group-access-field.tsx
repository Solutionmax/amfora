"use client";

import { useTranslations } from "next-intl";

import { Field } from "@/components/ui/form-section";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePickableGroups } from "@/hooks/use-pickable-groups";

const ANYONE = "anyone";

/**
 * "Who can open it": anyone with the link, or only the members of one group. Stays out of the way
 * when there are no groups to pick and the share is not limited to one.
 */
export function GroupAccessField({
  id,
  value,
  onChange,
  enabled = true,
  currentGroup,
}: {
  id: string;
  /** The chosen group, or null for anyone with the link. */
  value: string | null;
  onChange: (groupId: string | null) => void;
  /** Turn on when the dialog is open; the groups are loaded then. */
  enabled?: boolean;
  /** The group a share already has, so it can be shown even when the user could not pick it. */
  currentGroup?: { id: string; name: string } | null;
}) {
  const t = useTranslations();
  const { groups } = usePickableGroups(enabled);
  const options =
    currentGroup && !groups.some((group) => group.id === currentGroup.id) ? [currentGroup, ...groups] : groups;

  if (options.length === 0 && !value) return null;

  return (
    <Field label={t("groups.access.label")} htmlFor={id} hint={t("groups.access.hint")}>
      <Select value={value ?? ANYONE} onValueChange={(next) => onChange(next === ANYONE ? null : next)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANYONE}>{t("groups.access.anyone")}</SelectItem>
          {options.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {t("groups.access.onlyMembers", { name: group.name })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
