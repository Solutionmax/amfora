"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordField } from "@/components/auth/password-field";
import { FormError } from "@/components/auth/public-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { useAppInfo } from "@/contexts/app-info-context";
import { registerUser } from "@/http/endpoints";

interface RegisterFormProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
}

/** First run: create the administrator account. */
export function RegisterForm({ isVisible, onToggleVisibility }: RegisterFormProps) {
  const t = useTranslations();
  const { refreshAppInfo } = useAppInfo();
  const [error, setError] = useState<string | null>(null);

  const registerSchema = z.object({
    firstName: z.string().min(1, t("register.validation.firstNameRequired")),
    lastName: z.string().min(1, t("register.validation.lastNameRequired")),
    username: z.string().min(3, t("register.validation.usernameMinLength")),
    email: z.string().email(t("register.validation.invalidEmail")),
    password: z.string().min(8, t("register.validation.passwordMinLength")),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    setError(null);
    try {
      await registerUser({
        ...data,
      });

      await refreshAppInfo();
      toast.success(t("register.validation.success"));
    } catch {
      setError(t("register.validation.error"));
      toast.error(t("register.validation.error"));
    }
  };

  return (
    <>
      <FormError>{error}</FormError>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <Field label={t("register.labels.firstName")} htmlFor="register-first-name" error={errors.firstName?.message}>
            <Input
              id="register-first-name"
              autoComplete="given-name"
              disabled={isSubmitting}
              aria-invalid={!!errors.firstName}
              {...register("firstName")}
            />
          </Field>
          <Field label={t("register.labels.lastName")} htmlFor="register-last-name" error={errors.lastName?.message}>
            <Input
              id="register-last-name"
              autoComplete="family-name"
              disabled={isSubmitting}
              aria-invalid={!!errors.lastName}
              {...register("lastName")}
            />
          </Field>
        </div>
        <Field label={t("register.labels.username")} htmlFor="register-username" error={errors.username?.message}>
          <Input
            id="register-username"
            autoComplete="username"
            disabled={isSubmitting}
            aria-invalid={!!errors.username}
            {...register("username")}
          />
        </Field>
        <Field label={t("register.labels.email")} htmlFor="register-email" error={errors.email?.message}>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            disabled={isSubmitting}
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </Field>
        <Field
          label={t("register.labels.password")}
          htmlFor="register-password"
          hint={t("auth.calm.passwordRule")}
          error={errors.password?.message}
        >
          <PasswordField
            id="register-password"
            autoComplete="new-password"
            disabled={isSubmitting}
            visible={isVisible}
            onToggleVisible={onToggleVisibility}
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </Field>
        <Button className="mt-2 w-full" size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("register.buttons.creating") : t("register.buttons.createAdmin")}
        </Button>
      </form>
    </>
  );
}
