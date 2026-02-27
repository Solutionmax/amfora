import { IconEye, IconEyeClosed, IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordFormProps } from "../types";

export function PasswordForm({
  form,
  isNewPasswordVisible,
  isConfirmPasswordVisible,
  onToggleNewPassword,
  onToggleConfirmPassword,
  onSubmit,
}: PasswordFormProps) {
  const t = useTranslations();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">{t("profile.password.title")}</h2>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="relative">
            <Input
              {...register("newPassword")}
              type={isNewPasswordVisible ? "text" : "password"}
              className="pr-10"
              placeholder={t("profile.password.newPassword")}
              aria-invalid={!!errors.newPassword}
            />
            <button
              type="button"
              onClick={onToggleNewPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {isNewPasswordVisible ? <IconEye className="h-5 w-5" /> : <IconEyeClosed className="h-5 w-5" />}
            </button>
            {errors.newPassword && <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>}
          </div>

          <div className="relative">
            <Input
              {...register("confirmPassword")}
              type={isConfirmPasswordVisible ? "text" : "password"}
              className="pr-10"
              placeholder={t("profile.password.confirmPassword")}
              aria-invalid={!!errors.confirmPassword}
            />
            <button
              type="button"
              onClick={onToggleConfirmPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {isConfirmPasswordVisible ? <IconEye className="h-5 w-5" /> : <IconEyeClosed className="h-5 w-5" />}
            </button>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button className="mt-4 font-semibold" variant="default" disabled={isSubmitting} type="submit">
              {!isSubmitting && <IconLock className="h-4 w-4" />}
              {t("profile.password.updateButton")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
