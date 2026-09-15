"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
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
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav
        className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
        aria-label={t("settings.pageTitle")}
      >
        {sortedGroups.map(([group]) => {
          const metadata = GROUP_METADATA[group as keyof typeof GROUP_METADATA];
          const active = group === activeGroup;

          return (
            <button
              key={group}
              type="button"
              onClick={() => setActiveGroup(group)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              )}
            >
              {metadata?.icon && React.createElement(metadata.icon, { className: "size-[18px]" })}
              {t.has(`settings.groups.${group}.title`)
                ? t(`settings.groups.${group}.title`)
                : (metadata?.title ?? group)}
            </button>
          );
        })}
      </nav>

      <div>
        {sortedGroups.filter(([group]) => group === activeGroup).map(([group, configs]) => renderPanel(group, configs))}
      </div>
    </div>
  );
}
