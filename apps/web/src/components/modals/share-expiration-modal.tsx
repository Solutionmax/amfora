"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { toLocalInputValue } from "@/app/(shares)/shares/lib/share-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpiryField } from "@/components/ui/expiry-field";
import { Switch } from "@/components/ui/switch";
import { useLinkLifetime } from "@/hooks/use-link-lifetime";
import { updateShare } from "@/http/endpoints";

interface ShareExpirationModalProps {
  shareId: string | null;
  share: any;
  onClose: () => void;
  onSuccess?: () => void;
}

const FALLBACK_DAYS = 7;

export function ShareExpirationModal({ shareId, share, onClose, onSuccess }: ShareExpirationModalProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");
  const { defaultDays, maxDays, acceptsExpiry } = useLinkLifetime();
  const currentDate = share?.expiration ? toLocalInputValue(new Date(share.expiration)) : "";

  useEffect(() => {
    if (share) {
      setHasExpiration(!!share.expiration);
      setExpirationDate(share.expiration ? toLocalInputValue(new Date(share.expiration)) : "");
    }
  }, [share]);

  const handleSave = async () => {
    if (!shareId) return;
    if (!acceptsExpiry(hasExpiration ? expirationDate : "", currentDate)) return;

    if (hasExpiration) {
      if (!expirationDate.trim()) {
        toast.error(t("shareExpiration.validation.dateRequired"));
        return;
      }
      if (new Date(expirationDate) <= new Date()) {
        toast.error(t("shareExpiration.validation.dateMustBeFuture"));
        return;
      }
    }

    setIsLoading(true);
    try {
      // Leaving the date out clears it on the server.
      await updateShare({
        id: shareId,
        expiration: hasExpiration ? new Date(expirationDate).toISOString() : undefined,
      });

      const successMessage = hasExpiration
        ? share?.expiration
          ? t("shareExpiration.success.expirationUpdated")
          : t("shareExpiration.success.expirationSet")
        : t("shareExpiration.success.expirationRemoved");
      toast.success(successMessage);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to update share expiration:", error);
      toast.error(t("shareExpiration.error.updateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpirationToggle = (checked: boolean) => {
    setHasExpiration(checked);
    if (!checked) {
      setExpirationDate("");
    } else if (!expirationDate) {
      const defaultDate = new Date();
      const days = defaultDays > 0 ? defaultDays : maxDays > 0 ? Math.min(FALLBACK_DAYS, maxDays) : FALLBACK_DAYS;
      defaultDate.setDate(defaultDate.getDate() + days);
      setExpirationDate(toLocalInputValue(defaultDate));
    }
  };

  return (
    <Dialog open={!!shareId} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t("shares.calm.expires")}</DialogTitle>
          <DialogDescription>{t("shares.calm.modals.expirationDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-[18px]">
          <label htmlFor="expiration-enabled" className="flex cursor-pointer items-center gap-3.5">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t("shares.calm.modals.expiresSwitch")}</span>
              <span className="block text-[12.5px] text-ink-3">{t("shares.calm.modals.expiresSwitchHint")}</span>
            </span>
            <Switch id="expiration-enabled" checked={hasExpiration} onCheckedChange={handleExpirationToggle} />
          </label>

          {hasExpiration && (
            <ExpiryField
              id="expiration-date"
              label={t("shares.calm.modals.expiresOn")}
              hint={t("shareExpiration.info.willBeInaccessible")}
              value={expirationDate}
              onChange={setExpirationDate}
              maxDays={maxDays}
              unchanged={currentDate}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
