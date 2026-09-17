import { IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordModalProps } from "../types";

export function PasswordModal({ isOpen, password, isError, onPasswordChange, onSubmit }: PasswordModalProps) {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="rounded-[1.5rem] sm:max-w-md">
        <DialogHeader className="gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <IconLock className="size-5" />
          </div>
          <DialogTitle>{t("share.password.title")}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <p>{t("share.password.protected")}</p>
          </div>
          {isError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <p>{t("share.password.incorrect")}</p>
            </div>
          )}
        </DialogHeader>
        <div className="py-3">
          <Input
            type="password"
            value={password}
            placeholder={t("share.password.placeholder")}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
        </div>
        <DialogFooter>
          <Button className="rounded-full px-6" onClick={onSubmit}>
            {t("share.password.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
