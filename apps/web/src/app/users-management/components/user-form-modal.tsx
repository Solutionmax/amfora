import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserFormModalProps } from "../types";

export function UserFormModal({ isOpen, onClose, modalMode, selectedUser, formMethods, onSubmit }: UserFormModalProps) {
  const t = useTranslations();
  const {
    register,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = formMethods;
  const isCreate = modalMode === "create";
  const isAdmin = watch("isAdmin");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={formMethods.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>{isCreate ? t("users.calm.form.titleCreate") : t("users.calm.form.titleEdit")}</DialogTitle>
            <DialogDescription>
              {isCreate
                ? t("users.calm.form.descriptionCreate")
                : t("users.calm.form.descriptionEdit", { username: selectedUser?.username ?? "" })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("users.form.firstName")} htmlFor="user-first-name" error={errors.firstName?.message}>
                <Input
                  id="user-first-name"
                  autoComplete="given-name"
                  aria-invalid={!!errors.firstName}
                  {...register("firstName")}
                />
              </Field>
              <Field label={t("users.form.lastName")} htmlFor="user-last-name" error={errors.lastName?.message}>
                <Input
                  id="user-last-name"
                  autoComplete="family-name"
                  aria-invalid={!!errors.lastName}
                  {...register("lastName")}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("users.form.username")} htmlFor="user-username" error={errors.username?.message}>
                <Input
                  id="user-username"
                  autoComplete="off"
                  aria-invalid={!!errors.username}
                  {...register("username")}
                />
              </Field>
              <Field label={t("users.form.email")} htmlFor="user-email" error={errors.email?.message}>
                <Input
                  id="user-email"
                  type="email"
                  autoComplete="off"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </Field>
            </div>
            <Field
              label={isCreate ? t("users.form.password") : t("users.calm.form.newPassword")}
              htmlFor="user-password"
              error={errors.password?.message}
              hint={isCreate ? t("users.calm.form.passwordHint") : t("users.form.passwordPlaceholder")}
            >
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
            </Field>
            {!isCreate && (
              <Field label={t("users.form.role")} htmlFor="user-role" error={errors.isAdmin?.message}>
                <Select
                  value={String(isAdmin ?? selectedUser?.isAdmin ?? false)}
                  onValueChange={(value) => setValue("isAdmin", value === "true", { shouldDirty: true })}
                >
                  <SelectTrigger id="user-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">{t("users.calm.user")}</SelectItem>
                    <SelectItem value="true">{t("users.calm.administrator")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose} type="button">
              {t("common.cancel")}
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? t("common.saving") : isCreate ? t("users.calm.addUser") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
