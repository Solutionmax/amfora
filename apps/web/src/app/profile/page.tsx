"use client";

import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { PasswordForm } from "./components/password-form";
import { ProfileForm } from "./components/profile-form";
import { ProfileHead } from "./components/profile-head";
import { TwoFactorForm } from "./components/two-factor-form";
import { useProfile } from "./hooks/use-profile";

// The same measure as the "narrow" frame; the profile keeps its own head (avatar + name) instead of a page title.
const NARROW = "w-full max-w-[820px] flex-1 px-4 pb-28 pt-7 sm:px-8 lg:px-14 lg:pt-11";

function ProfileSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-9">
      <div className="flex items-center gap-5">
        <Skeleton className="size-[72px] rounded-full" />
        <div className="grid gap-2.5">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      {[0, 1].map((section) => (
        <div
          key={section}
          className="grid gap-4 border-t border-line pt-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10"
        >
          <div className="grid content-start gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="grid gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const t = useTranslations();
  const profile = useProfile();
  const { isAdmin } = useAuth();
  const firstName = profile.profileForm.watch("firstName");
  const lastName = profile.profileForm.watch("lastName");

  const content = (() => {
    if (profile.isLoading) return <ProfileSkeleton />;

    if (profile.loadError || !profile.userData) {
      return (
        <div className="grid gap-3">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.02em] lg:text-[30px]">
            {t("profile.pageTitle")}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-ink-3">
            {t("profile.errors.loadFailed")}
            <Button variant="outline" size="sm" onClick={profile.reload}>
              {t("common.calm.retry")}
            </Button>
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="pb-7">
          <ProfileHead
            userData={profile.userData}
            isAdmin={isAdmin === true}
            firstName={firstName}
            lastName={lastName}
            onImageChange={profile.handleImageChange}
            onImageRemove={profile.handleImageRemove}
          />
        </div>
        <div className="[&>section:first-child]:border-t [&>section:first-child]:pt-7 md:[&>section:first-child]:pt-8">
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
      </>
    );
  })();

  return (
    <ProtectedRoute>
      <FileManagerLayout title={t("profile.pageTitle")} variant="bare">
        <div className={NARROW}>{content}</div>
      </FileManagerLayout>
    </ProtectedRoute>
  );
}
