import { IconDeviceFloppy, IconUserPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserFormModalProps } from "../types";

export function UserFormModal({ isOpen, onClose, modalMode, selectedUser, formMethods, onSubmit }: UserFormModalProps) {
  const t = useTranslations();
  const {
    register,
    formState: { errors, isSubmitting },
    control,
  } = formMethods;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <Form {...formMethods}>
          <form onSubmit={formMethods.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 mb-2">
                <IconUserPlus size={24} className="mr-1" />
                {modalMode === "create" ? t("users.form.titleCreate") : t("users.form.titleEdit")}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{t("users.form.firstName")}</Label>
                        <Input {...field} className={errors.firstName ? "border-destructive" : ""} />
                        {errors.firstName && <FormMessage>{errors.firstName.message}</FormMessage>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{t("users.form.lastName")}</Label>
                        <Input {...field} className={errors.lastName ? "border-destructive" : ""} />
                        {errors.lastName && <FormMessage>{errors.lastName.message}</FormMessage>}
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("users.form.username")}</Label>
                  <Input {...register("username")} className={errors.username ? "border-destructive" : ""} />
                  {errors.username && <FormMessage>{errors.username.message}</FormMessage>}
                </div>

                <div className="space-y-2">
                  <Label>{t("users.form.email")}</Label>
                  <Input {...register("email")} type="email" className={errors.email ? "border-destructive" : ""} />
                  {errors.email && <FormMessage>{errors.email.message}</FormMessage>}
                </div>

                <div className="space-y-2">
                  <Label>{modalMode === "create" ? t("users.form.password") : t("users.form.newPassword")}</Label>
                  <Input
                    {...register("password")}
                    type="password"
                    className={errors.password ? "border-destructive" : ""}
                    placeholder={modalMode === "edit" ? t("users.form.passwordPlaceholder") : undefined}
                  />
                  {errors.password && <FormMessage>{errors.password.message}</FormMessage>}
                </div>

                {modalMode === "edit" && (
                  <div className="space-y-2">
                    <Label>{t("users.form.role")}</Label>
                    <FormField
                      control={control}
                      name="isAdmin"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            defaultValue={selectedUser?.isAdmin ? "true" : "false"}
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value?.toString()}
                          >
                            <SelectTrigger className={errors.isAdmin ? "border-destructive" : ""}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">{t("users.form.roleUser")}</SelectItem>
                              <SelectItem value="true">{t("users.form.roleAdmin")}</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.isAdmin && <FormMessage>{errors.isAdmin.message}</FormMessage>}
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} type="button">
                {t("common.cancel")}
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {modalMode === "create" ? "" : <IconDeviceFloppy className="h-4 w-4" />}
                {modalMode === "create" ? t("users.form.create") : t("users.form.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
