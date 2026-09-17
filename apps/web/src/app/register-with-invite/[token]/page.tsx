"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
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
      <div className="relative flex min-h-screen flex-col bg-background">
        <div className="absolute right-6 top-6 z-50">
          <LanguageSwitcher />
        </div>
        <div className="container mx-auto flex flex-grow max-w-5xl items-center px-4 py-20 sm:px-6">
          <div className="relative flex w-full items-center justify-center">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex w-full max-w-sm flex-col gap-4 rounded-[1.75rem] border bg-card px-8 pb-10 pt-8 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">{t("registerWithInvite.errors.invalidToken")}</h1>
                <p className="text-muted-foreground mb-4">{tokenError}</p>
                <Button className="rounded-lg" onClick={() => router.push("/login")}>
                  {t("forgotPassword.backToLogin")}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
        <DefaultFooter />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="absolute right-6 top-6 z-50">
        <LanguageSwitcher />
      </div>

      <div className="container mx-auto flex flex-grow max-w-5xl items-center px-4 py-20 sm:px-6">
        <div className="relative flex w-full items-center justify-center">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-md flex-col gap-6 rounded-[1.75rem] border bg-card px-8 pb-10 pt-8 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <div className="mb-3 flex items-center justify-center gap-2.5">
                {appLogo ? (
                  <img alt="" className="size-8 rounded object-contain" src={appLogo} />
                ) : (
                  <AmphoraMark className="size-8 text-primary" />
                )}
                <span className="font-display text-xl font-bold tracking-tight">{appName}</span>
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight">{t("registerWithInvite.title")}</h1>
              <p className="text-muted-foreground text-sm mt-2">{t("registerWithInvite.description")}</p>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    {...register("confirmPassword", {
                      required: t("registerWithInvite.validation.passwordsMatch"),
                      validate: (value) => value === password || t("registerWithInvite.validation.passwordsMatch"),
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="h-12 w-full rounded-lg" disabled={isSubmitting}>
                {isSubmitting
                  ? t("registerWithInvite.buttons.creating")
                  : t("registerWithInvite.buttons.createAccount")}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
      <DefaultFooter />
    </div>
  );
}
