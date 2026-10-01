"use client";

import React from "react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { IconGripVertical } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { AuthProvider } from "./edit-provider-form";

interface ProviderRowProps {
  provider: AuthProvider;
  onUpdate: (updates: Partial<AuthProvider>) => void;
  onEdit: () => void;
  saving: boolean;
  getIcon: (provider: AuthProvider) => React.ReactNode;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  isDragging: boolean;
}

function hostOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** One provider: grey icon, name, status line, Configure, and the on/off switch. */
export function ProviderRow({
  provider,
  onUpdate,
  onEdit,
  saving,
  getIcon,
  dragHandleProps,
  isDragging,
}: ProviderRowProps) {
  const t = useTranslations();
  const configured = !!provider.clientId;
  const typeLabel = provider.type === "oidc" ? t("authProviders.calm.typeOidc") : t("authProviders.calm.typeOauth2");
  const status = configured
    ? [typeLabel, hostOf(provider.issuerUrl)].filter(Boolean).join(" · ")
    : t("authProviders.calm.notConfigured");

  return (
    <div className={cn("group flex min-h-[64px] items-center gap-3 bg-background py-3", isDragging && "bg-surface-2")}>
      {dragHandleProps && (
        <span
          {...dragHandleProps}
          aria-label={t("authProviders.dragToReorder")}
          className="-ml-1 grid cursor-grab place-items-center rounded text-ink-icon opacity-60 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100"
        >
          <IconGripVertical className="size-4" aria-hidden="true" />
        </span>
      )}
      <span
        aria-hidden="true"
        className="grid size-[18px] shrink-0 place-items-center text-ink-icon grayscale [&_svg]:size-[17px]"
      >
        {getIcon(provider)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{provider.displayName}</div>
        <div className="truncate text-[12.5px] text-ink-3">{status}</div>
      </div>
      <Button
        type="button"
        variant="link"
        className="h-auto px-1"
        onClick={onEdit}
        disabled={saving}
        aria-label={t("authProviders.calm.configureName", { name: provider.displayName })}
      >
        {t("authProviders.calm.configure")}
      </Button>
      <Switch
        aria-label={provider.displayName}
        checked={provider.enabled}
        onCheckedChange={(enabled) => onUpdate({ enabled })}
        disabled={saving}
      />
    </div>
  );
}
