"use client";

import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "./components/load-error";
import { SettingsForm } from "./components/settings-form";
import { UpdateCard } from "./components/update-card";
import { useSettings } from "./hooks/use-settings";

const SKELETON_BLOCKS = 2;
const SKELETON_FIELDS = 3;

/** Tabs and FormSection blocks in outline while the settings load. */
function SettingsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-8 flex gap-6 border-b border-line pb-3">
        {[52, 56, 52, 40, 90].map((width, index) => (
          <Skeleton key={index} className="h-4" style={{ width }} />
        ))}
      </div>
      {Array.from({ length: SKELETON_BLOCKS }, (_, block) => (
        <div
          key={block}
          className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10"
        >
          <div className="grid content-start gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="grid gap-5">
            {Array.from({ length: SKELETON_FIELDS }, (_, field) => (
              <div key={field} className="grid gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsContent() {
  const t = useTranslations();
  const settings = useSettings();

  const renderBody = () => {
    if (settings.error) {
      return <LoadError message={t("settings.errors.loadFailed")} onRetry={() => settings.reload()} />;
    }
    if (settings.isLoading) return <SettingsSkeleton />;

    return (
      <SettingsForm
        groupForms={settings.groupForms}
        groupedConfigs={settings.groupedConfigs}
        onGroupSubmit={settings.onGroupSubmit}
      />
    );
  };

  return (
    <FileManagerLayout title={t("settings.pageTitle")} subline={t("settings.calm.subline")} variant="narrow">
      <div>
        <UpdateCard />
        {renderBody()}
      </div>
    </FileManagerLayout>
  );
}

export default function SettingsPage() {
  // Admins only; everyone else is sent to the dashboard before any settings are requested.
  return (
    <ProtectedRoute requireAdmin>
      <SettingsContent />
    </ProtectedRoute>
  );
}
