import { IconUserEdit } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileFormProps } from "../types";

export function ProfileForm({ form, onSubmit }: ProfileFormProps) {
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
          <IconUserEdit className="size-4" />
        </span>
        <h2 className="font-display text-lg font-bold tracking-tight">{t("profile.form.title")}</h2>
      </header>
      <div className="pt-5">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-first-name">{t("profile.form.firstName")}</Label>
              <Input
                id="profile-first-name"
                {...register("firstName")}
                className={`h-11 rounded-lg bg-background ${errors.firstName ? "border-destructive" : ""}`}
                aria-invalid={!!errors.firstName}
                aria-errormessage={errors.firstName ? "profile-firstName-error" : undefined}
                placeholder={t("profile.form.firstName")}
              />
              {errors.firstName && (
                <span id="profile-firstName-error" className="text-sm text-destructive">
                  {errors.firstName.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-last-name">{t("profile.form.lastName")}</Label>
              <Input
                id="profile-last-name"
                {...register("lastName")}
                className={`h-11 rounded-lg bg-background ${errors.lastName ? "border-destructive" : ""}`}
                aria-invalid={!!errors.lastName}
                aria-errormessage={errors.lastName ? "profile-lastName-error" : undefined}
                placeholder={t("profile.form.lastName")}
              />
              {errors.lastName && (
                <span id="profile-lastName-error" className="text-sm text-destructive">
                  {errors.lastName.message}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-username">{t("profile.form.username")}</Label>
            <Input
              id="profile-username"
              {...register("username")}
              className={`h-11 rounded-lg bg-background ${errors.username ? "border-destructive" : ""}`}
              aria-invalid={!!errors.username}
              aria-errormessage={errors.username ? "profile-username-error" : undefined}
              placeholder={t("profile.form.username")}
            />
            {errors.username && (
              <span id="profile-username-error" className="text-sm text-destructive">
                {errors.username.message}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-email">{t("profile.form.email")}</Label>
            <Input
              id="profile-email"
              {...register("email")}
              type="email"
              className={`h-11 rounded-lg bg-background ${errors.email ? "border-destructive" : ""}`}
              aria-invalid={!!errors.email}
              aria-errormessage={errors.email ? "profile-email-error" : undefined}
              placeholder={t("profile.form.email")}
            />
            {errors.email && (
              <span id="profile-email-error" className="text-sm text-destructive">
                {errors.email.message}
              </span>
            )}
          </div>
          <div className="flex justify-end">
            <Button className="mt-4 h-11 rounded-lg font-semibold" disabled={isSubmitting} type="submit">
              {!isSubmitting && <IconUserEdit className="w-5 h-5" />}
              {t("profile.form.updateButton")}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
