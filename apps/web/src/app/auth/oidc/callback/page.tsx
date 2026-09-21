"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/brand/brand-mark";
import { TransferShell } from "@/components/brand/transfer-shell";
import { useAuth } from "@/contexts/auth-context";
import { getCurrentUser } from "@/http/endpoints";

export default function OIDCCallbackPage() {
  const router = useRouter();
  const { setUser, setIsAuthenticated, setIsAdmin } = useAuth();
  const t = useTranslations();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const response = await getCurrentUser();
        const { isAdmin, ...userData } = response.data.user;

        setUser(userData);
        setIsAdmin(isAdmin);
        setIsAuthenticated(true);

        router.push("/dashboard");
      } catch (error) {
        console.error("OIDC callback error:", error);
        router.push("/login?error=authentication_failed");
      }
    };

    handleCallback();
  }, [router, setUser, setIsAuthenticated, setIsAdmin]);

  return (
    <TransferShell centered>
      <div className="flex flex-col items-center px-8 py-12 text-center">
        <span className="tile">
          <BrandMark className="size-6" />
        </span>
        <div className="mt-6 size-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="mt-4 text-sm text-ink-3">{t("login.processing")}</p>
      </div>
    </TransferShell>
  );
}
