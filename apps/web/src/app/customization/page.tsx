"use client";

import { useTranslations } from "next-intl";

import { LoadError } from "@/app/settings/components/load-error";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { SaveBar } from "@/components/ui/save-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppInfo } from "@/contexts/app-info-context";
import { AppearanceSection } from "./components/appearance-section";
import { BrandSection } from "./components/brand-section";
import { BrandpackSection } from "./components/brandpack-section";
import { DownloadPageSection } from "./components/download-page-section";
import { PreviewPanel } from "./components/preview-panel";
import { PublicThemeSection } from "./components/public-theme-section";
import { useCustomizationDraft } from "./hooks/use-customization-draft";

const SKELETON_BLOCKS = 3;

function CustomizationSkeleton() {
  return (
    <div aria-hidden="true" className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        {Array.from({ length: SKELETON_BLOCKS }, (_, index) => (
          <div
            key={index}
            className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[180px_minmax(0,1fr)] md:gap-7"
          >
            <div className="grid content-start gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-[14px]" />
    </div>
  );
}

function CustomizationForm() {
  const form = useCustomizationDraft();

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.save();
        }}
        className="min-w-0"
      >
        <BrandSection draft={form.draft} update={form.update} />
        <AppearanceSection draft={form.draft} update={form.update} />
        <PublicThemeSection draft={form.draft} update={form.update} />
        <DownloadPageSection draft={form.draft} update={form.update} hasBrandpack={form.hasBrandpack} />
        <BrandpackSection draft={form.draft} update={form.update} hasBrandpack={form.hasBrandpack} />
      </form>
      <div className="lg:sticky lg:top-10">
        <PreviewPanel name={form.draft.name} showCredit={form.draft.showCredit} />
      </div>
      <SaveBar visible={form.dirty} saving={form.saving} onDiscard={form.discard} onSave={form.save} />
    </div>
  );
}

function CustomizationContent() {
  const t = useTranslations();
  const { infoLoaded, isLoading, appName, refreshAppInfo } = useAppInfo();
  // The public app info always has a name; none after loading means the request failed.
  const failed = infoLoaded && !isLoading && !appName;

  const renderBody = () => {
    if (failed) return <LoadError message={t("customization.calm.loadFailed")} onRetry={() => refreshAppInfo()} />;
    if (!infoLoaded) return <CustomizationSkeleton />;

    return <CustomizationForm />;
  };

  return (
    <FileManagerLayout title={t("customization.pageTitle")} subline={t("customization.calm.subline")} variant="wide">
      {renderBody()}
    </FileManagerLayout>
  );
}

export default function CustomizationPage() {
  return (
    <ProtectedRoute requireAdmin>
      <CustomizationContent />
    </ProtectedRoute>
  );
}
