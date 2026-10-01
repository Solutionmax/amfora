"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { BackToSignIn } from "@/components/auth/back-to-sign-in";
import { PublicCard, PublicCardFoot } from "@/components/auth/public-card";
import { PublicShell } from "@/components/brand/public-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";
import { registerWithInvite, validateInviteToken } from "@/http/endpoints/invite";
import { InviteForm, type RegisterFormData } from "./components/invite-form";

export default function RegisterWithInvitePage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterFormData>();

  useEffect(() => {
    const checkToken = async () => {
      try {
        const response = await validateInviteToken(token);

        if (!response.valid) {
          if (response.used) {
            setTokenError(t("registerWithInvite.errors.tokenUsed"));
          } else if (response.expired) {
            setTokenError(t("registerWithInvite.errors.tokenExpired"));
          } else {
            setTokenError(t("registerWithInvite.errors.invalidToken"));
          }
          setTokenValid(false);
        } else {
          setTokenValid(true);
        }
      } catch (error) {
        console.error("Error validating token:", error);
        setTokenError(t("registerWithInvite.errors.invalidToken"));
        setTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      checkToken();
    }
  }, [token, t]);

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      toast.error(t("registerWithInvite.validation.passwordsMatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      await registerWithInvite({
        token,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        password: data.password,
      });

      toast.success(t("registerWithInvite.messages.success"));

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      console.error("Error registering:", error);

      const errorMessage = error.response?.data?.error;
      if (errorMessage?.includes("already been used")) {
        toast.error(t("registerWithInvite.errors.tokenUsed"));
      } else if (errorMessage?.includes("expired")) {
        toast.error(t("registerWithInvite.errors.tokenExpired"));
      } else if (errorMessage?.includes("Username already exists")) {
        toast.error(t("registerWithInvite.errors.usernameExists"));
      } else if (errorMessage?.includes("Email already exists")) {
        toast.error(t("registerWithInvite.errors.emailExists"));
      } else {
        toast.error(t("registerWithInvite.errors.createFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const story = { headline: `${t("public.invite.title")} ${t("public.invite.accent")}` };

  if (isValidating) {
    return <LoadingScreen />;
  }

  if (!tokenValid) {
    return (
      <PublicShell
        story={story}
        card={
          <PublicCard title={t("registerWithInvite.calm.unusableTitle")} description={tokenError}>
            <Button size="lg" className="w-full" onClick={() => router.push("/login")}>
              {t("auth.calm.backToSignIn")}
            </Button>
          </PublicCard>
        }
      />
    );
  }

  return (
    <PublicShell
      story={story}
      card={
        <PublicCard title={t("registerWithInvite.title")} description={t("public.invite.text")}>
          <InviteForm form={form} onSubmit={onSubmit} isSubmitting={isSubmitting} />
          <PublicCardFoot>
            <BackToSignIn />
          </PublicCardFoot>
        </PublicCard>
      }
    />
  );
}
