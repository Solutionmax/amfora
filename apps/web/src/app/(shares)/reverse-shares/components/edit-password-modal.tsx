"use client";

import { useState } from "react";
import { IconEye, IconEyeOff, IconLock, IconLockOpen } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ReverseShare } from "../hooks/use-reverse-shares";

interface EditPasswordFormData {
  hasPassword: boolean;
  password: string;
}

interface EditPasswordModalProps {
  reverseShare: ReverseShare | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePassword: (id: string, data: { hasPassword: boolean; password?: string }) => Promise<void>;
  isUpdating?: boolean;
}

export function EditPasswordModal({
  reverseShare,
  isOpen,
  onClose,
  onUpdatePassword,
  isUpdating = false,
}: EditPasswordModalProps) {
  const t = useTranslations();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<EditPasswordFormData>({
    defaultValues: {
      hasPassword: reverseShare?.hasPassword || false,
      password: "",
    },
  });

  const hasPassword = form.watch("hasPassword");

  const onSubmit = async (data: EditPasswordFormData) => {
    if (!reverseShare) return;

    if (data.hasPassword) {
      if (!data.password) {
        form.setError("password", { message: t("validation.passwordRequired") });
        return;
      }
      if (data.password.length < 4) {
        form.setError("password", { message: t("validation.passwordMinLength") });
        return;
      }
    }

    try {
      await onUpdatePassword(reverseShare.id, {
        hasPassword: data.hasPassword,
        password: data.hasPassword ? data.password : undefined,
      });

      toast.success(
        data.hasPassword
          ? t("reverseShares.messages.passwordProtectionEnabled")
          : t("reverseShares.messages.passwordProtectionDisabled")
      );

      onClose();
      form.reset();
    } catch (error) {
      console.error("Failed to update password:", error);
      toast.error(t("reverseShares.errors.passwordUpdateFailed"));
    }
  };

  const handleClose = () => {
    onClose();
    form.reset({
      hasPassword: reverseShare?.hasPassword || false,
      password: "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconLock size={20} />
            {t("reverseShares.modals.password.title")}
          </DialogTitle>
          <DialogDescription>{t("reverseShares.modals.password.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Toggle Proteção */}
            <FormField
              control={form.control}
              name="hasPassword"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      {field.value ? (
                        <IconLock className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <IconLockOpen className="h-4 w-4 text-green-600" />
                      )}
                      {t("reverseShares.modals.password.hasPassword")}
                    </FormLabel>
                    <FormDescription>
                      {field.value
                        ? t("reverseShares.labels.thisLinkProtected")
                        : t("reverseShares.labels.thisLinkPublic")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                          form.setValue("password", "");
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Campos de Senha */}
            {hasPassword && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("reverseShares.modals.password.password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={t("reverseShares.labels.enterPassword")}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>{t("reverseShares.form.password.passwordHelp")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
                {t("reverseShares.modals.password.cancel")}
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin">⠋</div>
                    {t("reverseShares.modals.password.saving")}
                  </div>
                ) : (
                  t("reverseShares.modals.password.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
