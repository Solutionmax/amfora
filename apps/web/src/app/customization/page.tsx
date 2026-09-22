"use client";

import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { AppearanceSection } from "./components/appearance-section";
import { BrandSection } from "./components/brand-section";
import { BrandpackSection } from "./components/brandpack-section";
import { DownloadPageSection } from "./components/download-page-section";
import { PreviewPanel } from "./components/preview-panel";

export default function CustomizationPage() {
  const t = useTranslations();

  return (
    <ProtectedRoute requireAdmin>
      <FileManagerLayout title={t("customization.pageTitle")} subline={t("customization.v2.subline")}>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="card-soft rounded-[calc(var(--radius)+4px)] border border-line bg-surface">
            <BrandSection />
            <AppearanceSection />
            <DownloadPageSection />
            <BrandpackSection />
          </div>
          <div className="xl:sticky xl:top-6">
            <PreviewPanel />
          </div>
        </div>
      </FileManagerLayout>
    </ProtectedRoute>
  );
}
