"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { resetPassword } from "@/http/endpoints";

const createSchema = (t: (key: string) => string) =>
  z
    .object({
      password: z.string().min(8, t("validation.passwordLength")),
      confirmPassword: z.string().min(8, t("validation.passwordLength")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordsMatch"),
      path: ["confirmPassword"],
    });

export type ResetPasswordFormData = z.infer<ReturnType<typeof createSchema>>;

export function useResetPassword() {
  const t = useTranslations();
  const schema = createSchema(t);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    try {
      await resetPassword({
        token,
        password: data.password,
      });

      toast.success(t("resetPassword.messages.success"));
      router.push("/login");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        toast.error(t("resetPassword.errors.serverError"));
      } else {
        toast.error(t("common.unexpectedError"));
      }
    }
  };

  return {
    token,
    form,
    isPasswordVisible,
    isConfirmPasswordVisible,
    setIsPasswordVisible,
    setIsConfirmPasswordVisible,
    onSubmit,
  };
}
