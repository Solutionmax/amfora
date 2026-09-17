"use client";

import { useState } from "react";
import { IconLock, IconShieldLock, IconUser } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { SectionLayout } from "@/components/ui/section-layout";
import { PasswordForm } from "./components/password-form";
import { ProfileForm } from "./components/profile-form";
import { ProfilePicture } from "./components/profile-picture";
import { TwoFactorForm } from "./components/two-factor-form";
import { useProfile } from "./hooks/use-profile";

export default function ProfilePage() {
  const [activeId, setActiveId] = useState("account");
  const t = useTranslations();
  const profile = useProfile();

  if (profile.isLoading) {
    return <LoadingScreen />;
  }

  const sections = [
    { id: "account", label: t("profile.form.title"), icon: IconUser },
    { id: "password", label: t("profile.password.title"), icon: IconLock },
    { id: "twoFactor", label: t("twoFactor.title"), icon: IconShieldLock },
  ];

  return (
    <ProtectedRoute>
      <FileManagerLayout title={t("profile.pageTitle")}>
        <SectionLayout sections={sections} activeId={activeId} onSelect={setActiveId} label={t("profile.pageTitle")}>
          <div className="max-w-3xl space-y-6">
            <div className="rounded-2xl border bg-secondary/30 p-5 sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{t("profile.pageTitle")}</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">{t("profile.header.title")}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("profile.header.subtitle")}</p>
            </div>
            {activeId === "account" && (
              <div className="flex flex-col gap-6">
                <ProfilePicture
                  userData={profile.userData}
                  onImageChange={profile.handleImageChange}
                  onImageRemove={profile.handleImageRemove}
                />
                <ProfileForm form={profile.profileForm} onSubmit={profile.onProfileSubmit} />
              </div>
            )}
            {activeId === "password" && (
              <PasswordForm
                form={profile.passwordForm}
                isConfirmPasswordVisible={profile.isConfirmPasswordVisible}
                isNewPasswordVisible={profile.isNewPasswordVisible}
                onSubmit={profile.onPasswordSubmit}
                onToggleConfirmPassword={() => profile.setIsConfirmPasswordVisible(!profile.isConfirmPasswordVisible)}
                onToggleNewPassword={() => profile.setIsNewPasswordVisible(!profile.isNewPasswordVisible)}
              />
            )}
            {activeId === "twoFactor" && <TwoFactorForm />}
          </div>
        </SectionLayout>
      </FileManagerLayout>
    </ProtectedRoute>
  );
}
