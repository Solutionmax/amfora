"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/** Account details for someone who follows an invitation link. */
export function InviteForm({
  form,
  onSubmit,
  isSubmitting,
}: {
  form: UseFormReturn<RegisterFormData>;
  onSubmit: (data: RegisterFormData) => Promise<void>;
  isSubmitting: boolean;
}) {
  const t = useTranslations();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;
  const password = watch("password");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
        <Field
          label={t("registerWithInvite.labels.firstName")}
          htmlFor="invite-first-name"
          error={errors.firstName?.message}
        >
          <Input
            id="invite-first-name"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            {...register("firstName", { required: t("registerWithInvite.validation.firstNameRequired") })}
          />
        </Field>
        <Field
          label={t("registerWithInvite.labels.lastName")}
          htmlFor="invite-last-name"
          error={errors.lastName?.message}
        >
          <Input
            id="invite-last-name"
            autoComplete="family-name"
            aria-invalid={!!errors.lastName}
            {...register("lastName", { required: t("registerWithInvite.validation.lastNameRequired") })}
          />
        </Field>
      </div>

      <Field label={t("registerWithInvite.labels.username")} htmlFor="invite-username" error={errors.username?.message}>
        <Input
          id="invite-username"
          autoComplete="username"
          aria-invalid={!!errors.username}
          {...register("username", {
            required: t("registerWithInvite.validation.usernameMinLength"),
            minLength: { value: 3, message: t("registerWithInvite.validation.usernameMinLength") },
          })}
        />
      </Field>

      <Field label={t("registerWithInvite.labels.email")} htmlFor="invite-email" error={errors.email?.message}>
        <Input
          id="invite-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email", {
            required: t("registerWithInvite.validation.invalidEmail"),
            pattern: { value: EMAIL_PATTERN, message: t("registerWithInvite.validation.invalidEmail") },
          })}
        />
      </Field>

      <Field
        label={t("registerWithInvite.labels.password")}
        htmlFor="invite-password"
        hint={t("auth.calm.passwordRule")}
        error={errors.password?.message}
      >
        <PasswordField
          id="invite-password"
          autoComplete="new-password"
          visible={showPassword}
          onToggleVisible={() => setShowPassword(!showPassword)}
          aria-invalid={!!errors.password}
          {...register("password", {
            required: t("registerWithInvite.validation.passwordMinLength"),
            minLength: { value: 8, message: t("registerWithInvite.validation.passwordMinLength") },
          })}
        />
      </Field>

      <Field
        label={t("registerWithInvite.labels.confirmPassword")}
        htmlFor="invite-confirm-password"
        error={errors.confirmPassword?.message}
      >
        <PasswordField
          id="invite-confirm-password"
          autoComplete="new-password"
          visible={showConfirmPassword}
          onToggleVisible={() => setShowConfirmPassword(!showConfirmPassword)}
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword", {
            required: t("registerWithInvite.validation.passwordsMatch"),
            validate: (value) => value === password || t("registerWithInvite.validation.passwordsMatch"),
          })}
        />
      </Field>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
        {isSubmitting ? t("registerWithInvite.buttons.creating") : t("registerWithInvite.buttons.createAccount")}
      </Button>
    </form>
  );
}
