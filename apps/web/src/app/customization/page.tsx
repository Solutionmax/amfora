"use client";

import { useState } from "react";
import {
  IconBrush,
  IconCheck,
  IconFile,
  IconPalette,
  IconRadiusBottomLeft,
  IconSunMoon,
  IconTypography,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { SectionLayout } from "@/components/ui/section-layout";
import { BackgroundPickerForm } from "./components/background-picker-form";
import { ColorPickerForm } from "./components/color-picker-form";
import { FontPickerForm } from "./components/font-picker-form";
import { RadiusPickerForm } from "./components/radius-picker-form";
import { ThemePickerForm } from "./components/theme-picker-form";

function CustomizationPreview() {
  const t = useTranslations();
  const { theme } = useTheme();

  return (
    <aside className="order-last rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            {t("customization.pageTitle")}
          </p>
          <h2 className="mt-2 font-display text-lg font-bold tracking-tight">{t("customization.preview.title")}</h2>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IconCheck className="size-4" />
        </span>
      </div>
      <div
        className="mt-5 space-y-4 border bg-background p-4"
        style={{ borderRadius: "var(--radius)", fontFamily: "var(--font-sans)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconFile className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t("quickAccess.files.title")}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{t("quickAccess.files.description")}</p>
            </div>
          </div>
          <span className="size-8 shrink-0 rounded-lg" style={{ backgroundColor: "var(--primary)" }} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="border bg-card p-3" style={{ borderRadius: "var(--radius)" }}>
            <p className="text-muted-foreground">{t("dashboard.recentFiles.title")}</p>
            <div className="mt-3 h-2 w-full rounded-full" style={{ backgroundColor: "var(--primary)" }} />
          </div>
          <div className="border bg-card p-3" style={{ borderRadius: "var(--radius)" }}>
            <p className="text-muted-foreground">{t("customization.theme.title")}</p>
            <p className="mt-2 font-medium capitalize">{theme || "system"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function CustomizationPage() {
  const t = useTranslations();
  const [activeId, setActiveId] = useState("theme");

  const sections = [
    { id: "theme", label: t("customization.theme.title"), icon: IconSunMoon },
    { id: "colors", label: t("customization.colors.title"), icon: IconPalette },
    { id: "typography", label: t("customization.fonts.title"), icon: IconTypography },
    { id: "radius", label: t("customization.radius.title"), icon: IconRadiusBottomLeft },
    { id: "background", label: t("customization.background.title"), icon: IconBrush },
  ];

  const panels: Record<string, React.ReactNode> = {
    theme: <ThemePickerForm />,
    colors: <ColorPickerForm />,
    typography: <FontPickerForm />,
    radius: <RadiusPickerForm />,
    background: <BackgroundPickerForm />,
  };

  return (
    <ProtectedRoute requireAdmin>
      <FileManagerLayout title={t("customization.pageTitle")}>
        <SectionLayout
          sections={sections}
          activeId={activeId}
          onSelect={setActiveId}
          label={t("customization.pageTitle")}
        >
          <div className="grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">{panels[activeId]}</div>
            <CustomizationPreview />
          </div>
        </SectionLayout>
      </FileManagerLayout>
    </ProtectedRoute>
  );
}
