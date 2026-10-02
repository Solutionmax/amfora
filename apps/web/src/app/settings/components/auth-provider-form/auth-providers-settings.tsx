"use client";

import React, { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSection } from "@/components/ui/form-section";
import { ProviderIcon } from "@/components/ui/icon-picker-lazy";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthProviders } from "../../hooks/use-auth-providers";
import { LoadError } from "../load-error";
import { AddProviderForm } from "./add-provider-form";
import { AuthProviderDeleteModal } from "./auth-provider-delete-modal";
import { AuthProvider, EditProviderForm } from "./edit-provider-form";
import { ProviderList } from "./provider-list";

const SKELETON_ROWS = 4;

function ProvidersSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col [&>*+*]:border-t [&>*+*]:border-line">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex min-h-[64px] items-center gap-3.5 py-3">
          <Skeleton className="size-[17px] rounded" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Sign-in tab: external providers as lines, configured in a dialog. */
export function AuthProvidersSettings() {
  const t = useTranslations();
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    providers,
    loading,
    loadError,
    saving,
    editingProvider,
    editingFormData,
    hideDisabledProviders,
    providerToDelete,
    isDeleting,
    enabledCount,
    filteredProviders,
    loadProviders,
    updateProvider,
    addProvider,
    editProvider,
    deleteProvider,
    handleDragEnd,
    handleHideDisabledProvidersChange,
    handleEditProvider,
    handleDeleteProvider,
    handleCancelEdit,
    setEditingFormData,
    setProviderToDelete,
  } = useAuthProviders();

  const getProviderIcon = (provider: AuthProvider) => <ProviderIcon name={provider.icon || "FaCog"} />;

  const handleConfirmDelete = async () => {
    if (!providerToDelete) return;
    await deleteProvider(providerToDelete.id);
    handleCancelEdit();
  };

  const renderList = () => {
    if (loading && providers.length === 0) return <ProvidersSkeleton />;
    if (loadError) return <LoadError message={t("authProviders.messages.loadFailed")} onRetry={loadProviders} />;

    return (
      <>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-3">
          <span>{t("authProviders.enabledOfTotal", { enabled: enabledCount, total: providers.length })}</span>
          {providers.length > 0 && (
            <label htmlFor="hideDisabledProviders" className="flex cursor-pointer items-center gap-2">
              <Checkbox
                id="hideDisabledProviders"
                checked={hideDisabledProviders}
                onCheckedChange={(checked) => handleHideDisabledProvidersChange(checked === true)}
              />
              {t("authProviders.hideDisabledProviders")}
            </label>
          )}
        </div>
        <ProviderList
          filteredProviders={filteredProviders}
          hideDisabledProviders={hideDisabledProviders}
          onDragEnd={handleDragEnd}
          onUpdateProvider={updateProvider}
          onEditProvider={handleEditProvider}
          saving={saving}
          getIcon={getProviderIcon}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="button" variant="outline" onClick={() => setShowAddForm(true)}>
            <IconPlus aria-hidden="true" />
            {t("authProviders.calm.add")}
          </Button>
          {!hideDisabledProviders && providers.length > 1 && (
            <p className="text-[12.5px] text-ink-3">{t("authProviders.calm.dragHint")}</p>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      <FormSection title={t("authProviders.title")} description={t("authProviders.calm.description")}>
        {renderList()}
      </FormSection>

      <Dialog open={!!editingProvider} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {t("authProviders.calm.configureTitle", { name: editingProvider?.displayName ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("authProviders.calm.configureDescription")}</DialogDescription>
          </DialogHeader>
          {editingProvider && (
            <EditProviderForm
              key={editingProvider.id}
              provider={editingProvider}
              onSave={editProvider}
              onCancel={handleCancelEdit}
              saving={saving === editingProvider.id}
              editingFormData={editingFormData}
              setEditingFormData={setEditingFormData}
              onDelete={editingProvider.isOfficial ? undefined : () => handleDeleteProvider(editingProvider)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AddProviderForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onAddProvider={addProvider}
        saving={saving === "new"}
      />

      <AuthProviderDeleteModal
        provider={providerToDelete}
        isOpen={!!providerToDelete}
        onConfirm={handleConfirmDelete}
        onClose={() => setProviderToDelete(null)}
        isDeleting={isDeleting}
      />
    </>
  );
}
