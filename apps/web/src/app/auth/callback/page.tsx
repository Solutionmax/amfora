"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { useAuth } from "@/contexts/auth-context";
import { getCurrentUser } from "@/http/endpoints";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setIsAuthenticated, setIsAdmin } = useAuth();
  const t = useTranslations();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      let errorMessage = "Authentication failed";

      switch (error) {
        case "oauth_error":
          errorMessage = "OAuth authentication failed";
          break;
        case "missing_parameters":
          errorMessage = "Missing authentication parameters";
          break;
        case "registration_disabled":
          errorMessage = "Registration is disabled for this provider";
          break;
        case "provider_disabled":
          errorMessage = "This authentication provider is disabled";
          break;
        case "state_expired":
          errorMessage = "Authentication session expired";
          break;
        case "account_inactive":
          errorMessage = "Your account is inactive";
          break;
        default:
          errorMessage = "Authentication failed";
      }

      toast.error(errorMessage);
      router.push("/login");
      return;
    }

    if (token) {
      document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;

      // Buscar dados do usuário após definir o cookie
      const fetchUserData = async () => {
        try {
          const response = await getCurrentUser();
          if (response?.data?.user) {
            const { isAdmin, ...userData } = response.data.user;
            setUser(userData);
            setIsAdmin(isAdmin);
            setIsAuthenticated(true);
            toast.success(t("auth.successfullyAuthenticated"));
            router.push("/dashboard");
          } else {
            throw new Error("No user data received");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error(t("auth.authenticationFailed"));
          router.push("/login");
        }
      };

      fetchUserData();
      return;
    }

    router.push("/login");
  }, [router, searchParams, setUser, setIsAuthenticated, setIsAdmin, t]);

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
