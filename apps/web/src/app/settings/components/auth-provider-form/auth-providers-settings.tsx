"use client";

import React, { useState } from "react";
import { IconSettings, IconShieldCheck } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { renderIconByName } from "@/components/ui/icon-picker";
import { Label } from "@/components/ui/label";
import { useAuthProviders } from "../../hooks/use-auth-providers";
import { AddProviderForm } from "./add-provider-form";
import { AuthProviderDeleteModal } from "./auth-provider-delete-modal";
import { ProviderList } from "./provider-list";

export function AuthProvidersSettings() {
  const t = useTranslations();

  const [showAddForm, setShowAddForm] = useState(false);

  const {
    providers,
    loading,
    saving,
    editingProvider,
    editingFormData,
    hideDisabledProviders,
    providerToDelete,
    isDeleting,
    enabledCount,
    filteredProviders,
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

  const getProviderIcon = (provider: any) => {
    const iconName = provider.icon || "FaCog";
    return renderIconByName(iconName, "w-5 h-5");
  };

  const handleToggleAddForm = () => {
    setShowAddForm(!showAddForm);
  };

  const handleConfirmDelete = async () => {
    if (providerToDelete) {
      await deleteProvider(providerToDelete.id);
    }
  };

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <CardHeader className="border-b bg-muted/30 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border bg-background p-3 text-primary">
            <IconShieldCheck className="size-5" />
          </div>
          <div className="min-w-0 space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">{t("authProviders.title")}</h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t("authProviders.description")}</p>
            <Badge variant="secondary">{t("authProviders.enabledCount", { count: enabledCount })}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <IconSettings className="h-6 w-6 animate-spin" />
            {t("authProviders.loadingProviders")}
          </div>
        ) : (
          <div className="space-y-4">
            <div className={showAddForm ? "space-y-4" : "flex flex-wrap justify-between items-center gap-3"}>
              <div className="text-sm text-muted-foreground">
                {hideDisabledProviders
                  ? t("authProviders.enabledOfTotal", { enabled: filteredProviders.length, total: providers.length })
                  : t("authProviders.providersConfigured", { count: providers.length })}
              </div>

              <AddProviderForm
                showAddForm={showAddForm}
                onToggleForm={handleToggleAddForm}
                onAddProvider={addProvider}
                saving={saving === "new"}
              />
            </div>

            {providers.length > 0 && (
              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="hideDisabledProviders"
                  checked={hideDisabledProviders}
                  onCheckedChange={handleHideDisabledProvidersChange}
                />
                <Label htmlFor="hideDisabledProviders" className="text-sm cursor-pointer">
                  {t("authProviders.hideDisabledProviders")}
                </Label>
              </div>
            )}

            <ProviderList
              providers={providers}
              filteredProviders={filteredProviders}
              hideDisabledProviders={hideDisabledProviders}
              onDragEnd={handleDragEnd}
              onUpdateProvider={updateProvider}
              onEditProvider={handleEditProvider}
              onDeleteProvider={handleDeleteProvider}
              saving={saving}
              getIcon={getProviderIcon}
              editingProvider={editingProvider}
              editProvider={editProvider}
              onCancelEdit={handleCancelEdit}
              editingFormData={editingFormData}
              setEditingFormData={setEditingFormData}
            />
          </div>
        )}

        <AuthProviderDeleteModal
          provider={providerToDelete}
          isOpen={!!providerToDelete}
          onConfirm={handleConfirmDelete}
          onClose={() => setProviderToDelete(null)}
          isDeleting={isDeleting}
        />
      </CardContent>
    </Card>
  );
}
