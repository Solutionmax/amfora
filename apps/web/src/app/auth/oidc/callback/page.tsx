"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
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
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center rounded-[1.75rem] border bg-card p-10 text-center shadow-sm">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <AmphoraMark className="size-6" />
        </span>
        <div className="mt-6 size-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="mt-4 text-sm text-muted-foreground">{t("login.processing")}</p>
      </div>
    </div>
  );
}
