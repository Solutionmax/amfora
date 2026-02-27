"use client";

import { useState } from "react";
import { IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordModalProps } from "../types";

export function PasswordModal({ isOpen, onSubmit, onClose }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
            <IconLock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <DialogTitle>{t("reverseShares.upload.password.title")}</DialogTitle>
          <DialogDescription>{t("reverseShares.upload.password.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("reverseShares.upload.password.label")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("reverseShares.upload.password.placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
              {t("reverseShares.upload.password.cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={!password.trim() || isSubmitting}>
              {isSubmitting ? t("reverseShares.upload.password.verifying") : t("reverseShares.upload.password.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
