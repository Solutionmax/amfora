"use client";

import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { PasswordForm } from "./components/password-form";
import { ProfileForm } from "./components/profile-form";
import { ProfilePicture } from "./components/profile-picture";
import { TwoFactorForm } from "./components/two-factor-form";
import { useProfile } from "./hooks/use-profile";

export default function ProfilePage() {
  const t = useTranslations();
  const profile = useProfile();

  if (profile.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      <FileManagerLayout title={t("profile.pageTitle")}>
        <div className="flex flex-col gap-8">
          <ProfilePicture
            userData={profile.userData}
            onImageChange={profile.handleImageChange}
            onImageRemove={profile.handleImageRemove}
          />
          <ProfileForm form={profile.profileForm} onSubmit={profile.onProfileSubmit} />
          <PasswordForm
            form={profile.passwordForm}
            isConfirmPasswordVisible={profile.isConfirmPasswordVisible}
            isNewPasswordVisible={profile.isNewPasswordVisible}
            onSubmit={profile.onPasswordSubmit}
            onToggleConfirmPassword={() => profile.setIsConfirmPasswordVisible(!profile.isConfirmPasswordVisible)}
            onToggleNewPassword={() => profile.setIsNewPasswordVisible(!profile.isNewPasswordVisible)}
          />
          <TwoFactorForm />
        </div>
      </FileManagerLayout>
    </ProtectedRoute>
  );
}
