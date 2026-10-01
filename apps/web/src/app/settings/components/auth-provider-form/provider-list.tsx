"use client";

import React from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { IconShieldLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/ui/empty-state";
import { AuthProvider } from "./edit-provider-form";
import { ProviderRow } from "./provider-row";

const LIST = "flex min-w-0 flex-col [&>*+*]:border-t [&>*+*]:border-line";

interface ProviderListProps {
  filteredProviders: AuthProvider[];
  hideDisabledProviders: boolean;
  onDragEnd: (result: DropResult) => void;
  onUpdateProvider: (id: string, updates: Partial<AuthProvider>) => void;
  onEditProvider: (provider: AuthProvider) => void;
  saving: string | null;
  getIcon: (provider: AuthProvider) => React.ReactNode;
}

/** Hairline list of providers. Drag to reorder when every provider is shown. */
export function ProviderList({
  filteredProviders,
  hideDisabledProviders,
  onDragEnd,
  onUpdateProvider,
  onEditProvider,
  saving,
  getIcon,
}: ProviderListProps) {
  const t = useTranslations();

  if (filteredProviders.length === 0) {
    return (
      <EmptyState
        className="py-8"
        icon={<IconShieldLock />}
        title={hideDisabledProviders ? t("authProviders.noProvidersEnabled") : t("authProviders.noProvidersConfigured")}
      />
    );
  }

  const row = (
    provider: AuthProvider,
    dragHandleProps: React.ComponentProps<typeof ProviderRow>["dragHandleProps"],
    isDragging = false
  ) => (
    <ProviderRow
      provider={provider}
      onUpdate={(updates) => onUpdateProvider(provider.id, updates)}
      onEdit={() => onEditProvider(provider)}
      saving={saving === provider.id}
      getIcon={getIcon}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    />
  );

  if (hideDisabledProviders) {
    return (
      <div className={LIST}>
        {filteredProviders.map((provider) => (
          <React.Fragment key={provider.id}>{row(provider, null)}</React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="providers">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className={LIST}>
            {filteredProviders.map((provider, index) => (
              <Draggable key={provider.id} draggableId={provider.id} index={index}>
                {(draggable, snapshot) => (
                  <div ref={draggable.innerRef} {...draggable.draggableProps}>
                    {row(provider, draggable.dragHandleProps, snapshot.isDragging)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
