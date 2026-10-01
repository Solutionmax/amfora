"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { SaveBar } from "@/components/ui/save-bar";
import { SectionLayout } from "@/components/ui/section-layout";
import { GROUP_ORDER, groupTitle } from "../constants";
import { SettingsFormProps, ValidGroup } from "../types";
import { AuthProvidersSettings } from "./auth-provider-form/auth-providers-settings";
import { settingsFormId, SettingsGroup } from "./settings-group";

const orderOf = (group: string) => {
  const index = GROUP_ORDER.indexOf(group);

  return index === -1 ? GROUP_ORDER.length : index;
};

/** Text tabs, one per settings group. The tab is kept in the address (#email) so it survives a reload. */
export function SettingsForm({ groupedConfigs, groupForms, onGroupSubmit }: SettingsFormProps) {
  const t = useTranslations();
  const groups = Object.keys(groupedConfigs).sort((a, b) => orderOf(a) - orderOf(b));
  const [activeGroup, setActiveGroup] = useState<string>(groups[0] ?? "general");

  const groupKey = groups.join(",");

  useEffect(() => {
    const known = groupKey.split(",");
    const fromHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash && known.includes(hash)) setActiveGroup(hash);
    };

    fromHash();
    window.addEventListener("hashchange", fromHash);

    return () => window.removeEventListener("hashchange", fromHash);
  }, [groupKey]);

  const select = (group: string) => {
    setActiveGroup(group);
    window.history.replaceState(null, "", `#${group}`);
  };

  const form = groupForms[activeGroup as ValidGroup];
  const isDirty = !!form?.formState.isDirty;

  const renderPanel = () => {
    if (activeGroup === "auth-providers") return <AuthProvidersSettings />;
    if (!form) return null;

    return (
      <SettingsGroup
        key={activeGroup}
        configs={groupedConfigs[activeGroup] ?? []}
        form={form}
        group={activeGroup}
        onSubmit={(data) => onGroupSubmit(activeGroup as ValidGroup, data)}
      />
    );
  };

  return (
    <>
      <SectionLayout
        sections={groups.map((group) => ({ id: group, label: groupTitle(t, group) }))}
        activeId={activeGroup}
        onSelect={select}
        label={t("settings.pageTitle")}
      >
        {renderPanel()}
      </SectionLayout>
      <SaveBar
        visible={isDirty}
        saving={!!form?.formState.isSubmitting}
        onDiscard={() => form?.reset()}
        form={form ? settingsFormId(activeGroup) : undefined}
      />
    </>
  );
}
