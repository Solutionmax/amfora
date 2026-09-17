import { IconEye, IconEyeClosed, IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <section className="border-b pb-6">
      <header className="flex items-center gap-3 border-b pb-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
          <IconLock className="size-4" />
        </span>
        <h2 className="font-display text-lg font-bold tracking-tight">{t("profile.password.title")}</h2>
      </header>
      <div className="pt-5">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="relative space-y-2">
            <Label htmlFor="profile-new-password">{t("profile.password.newPassword")}</Label>
            <Input
              id="profile-new-password"
              {...register("newPassword")}
              type={isNewPasswordVisible ? "text" : "password"}
              className="h-11 rounded-lg bg-background pr-10"
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

          <div className="relative space-y-2">
            <Label htmlFor="profile-confirm-password">{t("profile.password.confirmPassword")}</Label>
            <Input
              id="profile-confirm-password"
              {...register("confirmPassword")}
              type={isConfirmPasswordVisible ? "text" : "password"}
              className="h-11 rounded-lg bg-background pr-10"
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
            <Button
              className="mt-4 h-11 rounded-lg font-semibold"
              variant="default"
              disabled={isSubmitting}
              type="submit"
            >
              {!isSubmitting && <IconLock className="h-4 w-4" />}
              {t("profile.password.updateButton")}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
