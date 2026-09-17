"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowUpRight, IconEye, IconEyeOff } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PublicAuthShell } from "@/components/brand/public-auth-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerWithInvite, validateInviteToken } from "@/http/endpoints/invite";

interface RegisterFormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterWithInvitePage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>();

  const password = watch("password");

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

  if (isValidating) {
    return <LoadingScreen />;
  }

  if (!tokenValid) {
    return (
      <PublicAuthShell eyebrow={t("registerWithInvite.pageTitle")}>
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 font-display text-xl font-bold text-primary">
            !
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">
            {t("registerWithInvite.errors.invalidToken")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{tokenError}</p>
          <Button className="mt-6 h-11 w-full justify-between rounded-xl px-4" onClick={() => router.push("/login")}>
            <span>{t("forgotPassword.backToLogin")}</span>
            <IconArrowLeft className="size-4" />
          </Button>
        </div>
      </PublicAuthShell>
    );
  }

  return (
    <PublicAuthShell eyebrow={t("registerWithInvite.pageTitle")}>
      <div className="mb-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          {t("registerWithInvite.pageTitle")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{t("registerWithInvite.title")}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("registerWithInvite.description")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t("registerWithInvite.labels.firstName")}</Label>
            <Input
              id="firstName"
              placeholder={t("registerWithInvite.labels.firstNamePlaceholder")}
              {...register("firstName", {
                required: t("registerWithInvite.validation.firstNameRequired"),
              })}
            />
            {errors.firstName && <p className="text-destructive text-sm">{errors.firstName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">{t("registerWithInvite.labels.lastName")}</Label>
            <Input
              id="lastName"
              placeholder={t("registerWithInvite.labels.lastNamePlaceholder")}
              {...register("lastName", {
                required: t("registerWithInvite.validation.lastNameRequired"),
              })}
            />
            {errors.lastName && <p className="text-destructive text-sm">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">{t("registerWithInvite.labels.username")}</Label>
          <Input
            id="username"
            placeholder={t("registerWithInvite.labels.usernamePlaceholder")}
            {...register("username", {
              required: t("registerWithInvite.validation.usernameMinLength"),
              minLength: {
                value: 3,
                message: t("registerWithInvite.validation.usernameMinLength"),
              },
            })}
          />
          {errors.username && <p className="text-destructive text-sm">{errors.username.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("registerWithInvite.labels.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("registerWithInvite.labels.emailPlaceholder")}
            {...register("email", {
              required: t("registerWithInvite.validation.invalidEmail"),
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: t("registerWithInvite.validation.invalidEmail"),
              },
            })}
          />
          {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("registerWithInvite.labels.password")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("registerWithInvite.labels.passwordPlaceholder")}
              className="pe-10"
              {...register("password", {
                required: t("registerWithInvite.validation.passwordMinLength"),
                minLength: {
                  value: 8,
                  message: t("registerWithInvite.validation.passwordMinLength"),
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={t("registerWithInvite.labels.password")}
              className="absolute end-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("registerWithInvite.labels.confirmPassword")}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("registerWithInvite.labels.confirmPasswordPlaceholder")}
              className="pe-10"
              {...register("confirmPassword", {
                required: t("registerWithInvite.validation.passwordsMatch"),
                validate: (value) => value === password || t("registerWithInvite.validation.passwordsMatch"),
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={t("registerWithInvite.labels.confirmPassword")}
              className="absolute end-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" className="mt-2 h-12 w-full justify-between rounded-xl px-4" disabled={isSubmitting}>
          {isSubmitting ? t("registerWithInvite.buttons.creating") : t("registerWithInvite.buttons.createAccount")}
          <IconArrowUpRight className="size-5" />
        </Button>
      </form>
    </PublicAuthShell>
  );
}
