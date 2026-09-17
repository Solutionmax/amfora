"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowUpRight, IconEye, IconEyeOff } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";
import { DefaultFooter } from "@/components/ui/default-footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppInfo } from "@/contexts/app-info-context";
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
  const { appName, appLogo } = useAppInfo();

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
      <div className="grid min-h-screen bg-[#071827] lg:grid-cols-[minmax(0,1fr)_520px]">
        <aside className="relative hidden overflow-hidden lg:block">
          <img
            src="/art/amfora-glass.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-[#071827]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071827] via-[#071827]/15 to-[#071827]/45" />
          <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16">
            <div className="flex items-center gap-3">
              {appLogo ? (
                <img alt="" className="size-9 rounded bg-white/95 p-1 object-contain" src={appLogo} />
              ) : (
                <AmphoraMark className="size-9 text-sky-300" />
              )}
              <span className="max-w-[18rem] truncate font-display text-2xl font-bold tracking-tight">{appName}</span>
            </div>
            <div className="max-w-md">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-sky-200/80">
                {t("registerWithInvite.pageTitle")}
              </p>
              <p className="mt-5 font-display text-6xl font-extrabold leading-[0.95] tracking-[-0.04em] xl:text-7xl">
                {t("home.header.fileSharing")} <span className="text-sky-200">{t("home.header.tagline")}</span>
              </p>
              <p className="mt-7 text-base leading-7 text-white/70">{t("home.privacyMessage")}</p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
              {t("home.points.selfHosted")}
            </p>
          </div>
        </aside>
        <section className="relative flex min-h-screen flex-col bg-background">
          <div className="relative h-32 overflow-hidden lg:hidden">
            <img
              src="/art/amfora-glass.webp"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover object-[50%_42%]"
            />
            <div className="absolute inset-0 bg-[#071827]/65" />
            <div className="relative flex h-full items-end px-6 pb-4 text-white">
              {appLogo ? (
                <img alt="" className="mr-2.5 size-8 rounded bg-white/95 p-1 object-contain" src={appLogo} />
              ) : (
                <AmphoraMark className="mr-2.5 size-8 text-sky-200" />
              )}
              <span className="truncate font-display text-xl font-bold">{appName}</span>
            </div>
          </div>
          <div className="absolute right-6 top-6 z-20 rounded-lg border border-border bg-background/95 p-1 shadow-sm">
            <LanguageSwitcher />
          </div>
          <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12 sm:py-16">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl border border-border/80 bg-card p-6 text-center shadow-[0_24px_80px_-40px_rgba(7,24,39,0.55)] sm:p-8"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 font-display text-xl font-bold text-primary">
                !
              </div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight">
                {t("registerWithInvite.errors.invalidToken")}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{tokenError}</p>
              <Button className="mt-6 h-11 w-full rounded-xl" onClick={() => router.push("/login")}>
                <IconArrowLeft className="size-4" />
                {t("forgotPassword.backToLogin")}
              </Button>
            </motion.div>
          </div>
          <DefaultFooter />
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-[#071827] lg:grid-cols-[minmax(0,1fr)_520px]">
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src="/art/amfora-glass.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-[#071827]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071827] via-[#071827]/15 to-[#071827]/45" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16">
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img alt="" className="size-9 rounded bg-white/95 p-1 object-contain" src={appLogo} />
            ) : (
              <AmphoraMark className="size-9 text-sky-300" />
            )}
            <span className="max-w-[18rem] truncate font-display text-2xl font-bold tracking-tight">{appName}</span>
          </div>
          <div className="max-w-md">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-sky-200/80">
              {t("registerWithInvite.pageTitle")}
            </p>
            <p className="mt-5 font-display text-6xl font-extrabold leading-[0.95] tracking-[-0.04em] xl:text-7xl">
              {t("home.header.fileSharing")} <span className="text-sky-200">{t("home.header.tagline")}</span>
            </p>
            <p className="mt-7 text-base leading-7 text-white/70">{t("home.privacyMessage")}</p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            {t("home.points.selfHosted")}
          </p>
        </div>
      </aside>
      <section className="relative flex min-h-screen flex-col bg-background">
        <div className="relative h-32 overflow-hidden lg:hidden">
          <img
            src="/art/amfora-glass.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[50%_42%]"
          />
          <div className="absolute inset-0 bg-[#071827]/65" />
          <div className="relative flex h-full items-end px-6 pb-4 text-white">
            {appLogo ? (
              <img alt="" className="mr-2.5 size-8 rounded bg-white/95 p-1 object-contain" src={appLogo} />
            ) : (
              <AmphoraMark className="mr-2.5 size-8 text-sky-200" />
            )}
            <span className="truncate font-display text-xl font-bold">{appName}</span>
          </div>
        </div>
        <div className="absolute right-6 top-6 z-20 rounded-lg border border-border bg-background/95 p-1 shadow-sm">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12 sm:py-16">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-[0_24px_80px_-40px_rgba(7,24,39,0.55)] sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                {t("registerWithInvite.pageTitle")}
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
                {t("registerWithInvite.title")}
              </h1>
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

              <Button
                type="submit"
                className="mt-2 h-12 w-full justify-between rounded-xl px-4"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t("registerWithInvite.buttons.creating")
                  : t("registerWithInvite.buttons.createAccount")}
                <IconArrowUpRight className="size-5" />
              </Button>
            </form>
          </motion.div>
        </div>
        <DefaultFooter />
      </section>
    </div>
  );
}
