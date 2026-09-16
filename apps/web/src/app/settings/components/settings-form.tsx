"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

import { SectionLayout } from "@/components/ui/section-layout";
import { createGroupMetadata } from "../constants";
import { SettingsFormProps, ValidGroup } from "../types";
import { AuthProvidersSettings } from "./auth-provider-form/auth-providers-settings";
import { SettingsGroup } from "./settings-group";

const GROUP_ORDER: string[] = ["general", "email", "auth-providers", "security", "storage"];

export function SettingsForm({ groupedConfigs, groupForms, onGroupSubmit }: SettingsFormProps) {
  const t = useTranslations();
  const GROUP_METADATA = createGroupMetadata(t);

  const sortedGroups = Object.entries(groupedConfigs).sort(([a], [b]) => {
    const indexA = GROUP_ORDER.indexOf(a);
    const indexB = GROUP_ORDER.indexOf(b);

    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  const [activeGroup, setActiveGroup] = useState<string>(sortedGroups[0]?.[0] ?? "general");

  const renderPanel = (group: string, configs: (typeof sortedGroups)[number][1]) => {
    if (group === "auth-providers") {
      return <AuthProvidersSettings key={group} />;
    }

    const form = groupForms[group as ValidGroup];
    if (!form) {
      return null;
    }

    return (
      <SettingsGroup
        key={group}
        configs={configs}
        form={form}
        group={group}
        onSubmit={(data) => onGroupSubmit(group as ValidGroup, data)}
      />
    );
  };

  return (
    <SectionLayout
      sections={sortedGroups.map(([group]) => {
        const metadata = GROUP_METADATA[group as keyof typeof GROUP_METADATA];
        return {
          id: group,
          label: t.has(`settings.groups.${group}.title`)
            ? t(`settings.groups.${group}.title`)
            : (metadata?.title ?? group),
          icon: metadata?.icon,
        };
      })}
      activeId={activeGroup}
      onSelect={setActiveGroup}
      label={t("settings.pageTitle")}
    >
      {sortedGroups.filter(([group]) => group === activeGroup).map(([group, configs]) => renderPanel(group, configs))}
    </SectionLayout>
  );
}
