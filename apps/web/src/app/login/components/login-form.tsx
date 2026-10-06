import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { PasswordField } from "@/components/auth/password-field";
import { FormError, PublicCardFoot, PublicFormSkeleton } from "@/components/auth/public-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { getEnabledProviders } from "@/http/endpoints";
import { createLoginSchema, type LoginFormValues } from "../schemas/schema";
import { MultiProviderButtons } from "./multi-provider-buttons";

interface PasswordLoginFormProps {
  error?: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onSubmit: (data: LoginFormValues) => Promise<void>;
  passwordAuthEnabled: boolean;
  /** The external sign-in buttons: they ask the server who is set up, so the preview leaves them out. */
  providers?: ReactNode;
}

/** The sign-in fields and button, with nothing that asks the server before you press them. */
export function PasswordLoginForm({
  error,
  isVisible,
  onToggleVisibility,
  onSubmit,
  passwordAuthEnabled,
  providers,
}: PasswordLoginFormProps) {
  const t = useTranslations();
  const message = error ? error.replace("errors.", "") : null;
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginSchema(t, passwordAuthEnabled)),
    defaultValues: {
      emailOrUsername: "",
      password: passwordAuthEnabled ? "" : undefined,
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <>
      {providers}
      <FormError>{message}</FormError>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <Field
          label={t("login.emailOrUsernameLabel")}
          htmlFor="login-email-or-username"
          error={errors.emailOrUsername?.message}
        >
          <Input
            id="login-email-or-username"
            type="text"
            autoComplete="username"
            placeholder={t("login.emailOrUsernamePlaceholder")}
            disabled={isSubmitting}
            aria-invalid={!!errors.emailOrUsername}
            {...register("emailOrUsername")}
          />
        </Field>
        {passwordAuthEnabled && (
          <Field label={t("login.passwordLabel")} htmlFor="login-password" error={errors.password?.message}>
            <PasswordField
              id="login-password"
              autoComplete="current-password"
              placeholder={t("login.passwordPlaceholder")}
              disabled={isSubmitting}
              visible={isVisible}
              onToggleVisible={onToggleVisibility}
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </Field>
        )}
        <Button className="mt-2 w-full" size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("login.signingIn") : t("login.signIn")}
        </Button>
      </form>

      {passwordAuthEnabled && (
        <PublicCardFoot>
          <Link
            className="rounded-[5px] font-semibold text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-primary/35"
            href="/forgot-password"
          >
            {t("login.forgotPassword")}
          </Link>
        </PublicCardFoot>
      )}
    </>
  );
}

interface LoginFormProps {
  error?: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onSubmit: (data: LoginFormValues) => Promise<void>;
  passwordAuthEnabled: boolean;
  authConfigLoading: boolean;
}

export function LoginForm({
  error,
  isVisible,
  onToggleVisibility,
  onSubmit,
  passwordAuthEnabled,
  authConfigLoading,
}: LoginFormProps) {
  const t = useTranslations();
  const [hasEnabledProviders, setHasEnabledProviders] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(true);

  useEffect(() => {
    const checkProviders = async () => {
      try {
        const response = await getEnabledProviders();
        const data = response.data as any;
        setHasEnabledProviders(data.success && data.data && data.data.length > 0);
      } catch (error) {
        console.error("Error checking providers:", error);
        setHasEnabledProviders(false);
      } finally {
        setProvidersLoading(false);
      }
    };

    checkProviders();
  }, []);

  const message = error ? error.replace("errors.", "") : null;

  if (authConfigLoading || providersLoading) {
    return <PublicFormSkeleton />;
  }

  if (!passwordAuthEnabled && hasEnabledProviders) {
    return (
      <>
        <FormError>{message}</FormError>
        <MultiProviderButtons showSeparator={false} />
      </>
    );
  }

  if (!passwordAuthEnabled && !hasEnabledProviders) {
    return (
      <>
        <FormError>{message}</FormError>
        <p className="text-[13px] text-ink-3">{t("login.noAuthMethodsAvailable")}</p>
      </>
    );
  }

  return (
    <PasswordLoginForm
      error={error}
      isVisible={isVisible}
      onSubmit={onSubmit}
      onToggleVisibility={onToggleVisibility}
      passwordAuthEnabled={passwordAuthEnabled}
      providers={<MultiProviderButtons />}
    />
  );
}
