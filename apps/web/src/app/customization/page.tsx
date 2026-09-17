"use client";

import { useState } from "react";
import { IconBrush, IconPalette, IconRadiusBottomLeft, IconSunMoon, IconTypography } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { SectionLayout } from "@/components/ui/section-layout";
import { BackgroundPickerForm } from "./components/background-picker-form";
import { ColorPickerForm } from "./components/color-picker-form";
import { FontPickerForm } from "./components/font-picker-form";
import { RadiusPickerForm } from "./components/radius-picker-form";
import { ThemePickerForm } from "./components/theme-picker-form";

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
          <div className="max-w-4xl">{panels[activeId]}</div>
        </SectionLayout>
      </FileManagerLayout>
    </ProtectedRoute>
  );
}
