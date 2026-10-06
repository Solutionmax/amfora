"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PasskeysForm } from "@/app/profile/components/passkeys-form";
import { TwoFactorForm } from "@/app/profile/components/two-factor-form";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { BrandMark } from "@/components/brand/brand-mark";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";
import { useAppInfo } from "@/contexts/app-info-context";
import { useAuth } from "@/contexts/auth-context";
import { getCurrentUser, logout as logoutRequest } from "@/http/endpoints";
import { safeNext } from "@/lib/two-factor-setup";

/**
 * Where a user lands while the installation asks for a second step and they have none. It reuses
 * the profile sections, and "Continue" asks the server whether the requirement is now met.
 */
function SetupContent() {
  const t = useTranslations();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { appName } = useAppInfo();
  const { setUser, setIsAdmin, logout } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const handleContinue = async () => {
    setIsChecking(true);
    try {
      const { data } = await getCurrentUser();
      if (data?.user?.twoFactorSetupRequired) {
        toast.error(t("twoFactorSetup.notYet"));
        return;
      }
      if (data?.user) {
        const { isAdmin, ...userData } = data.user;
        setUser(userData);
        setIsAdmin(isAdmin);
      }
      router.replace(next);
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setIsChecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      logout();
      router.push("/login");
    }
  };

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] bg-background px-4 py-5 text-ink md:px-10 md:py-7">
      <header className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2.5">
          <BrandMark className="size-7 shrink-0 text-primary" />
          <span className="font-display text-base font-semibold tracking-[-0.01em]">{appName}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
          {t("twoFactorSetup.signOut")}
        </Button>
      </header>
      <main className="mx-auto w-full max-w-[640px] py-10 md:py-14">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.02em] lg:text-[30px]">
          {t("twoFactorSetup.title")}
        </h1>
        <p className="mt-2 text-ink-3">{t("twoFactorSetup.text")}</p>
        <div className="mt-8 [&>section:first-child]:border-t [&>section:first-child]:pt-7">
          <TwoFactorForm />
          <PasskeysForm />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <Button onClick={() => void handleContinue()} disabled={isChecking}>
            {t("twoFactorSetup.continue")}
          </Button>
          <span className="text-[13px] text-ink-3">{t("twoFactorSetup.continueHint")}</span>
        </div>
      </main>
    </div>
  );
}

export default function TwoFactorSetupPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingScreen />}>
        <SetupContent />
      </Suspense>
    </ProtectedRoute>
  );
}
