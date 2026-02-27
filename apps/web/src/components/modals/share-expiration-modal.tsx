"use client";

import { useEffect, useState } from "react";
import { IconCalendar, IconClock, IconClockOff } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { Switch } from "@/components/ui/switch";
import { updateShare } from "@/http/endpoints";

interface ShareExpirationModalProps {
  shareId: string | null;
  share: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ShareExpirationModal({ shareId, share, onClose, onSuccess }: ShareExpirationModalProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  useEffect(() => {
    if (share) {
      const hasCurrentExpiration = !!share.expiration;
      setHasExpiration(hasCurrentExpiration);

      if (hasCurrentExpiration) {
        const date = new Date(share.expiration);
        setExpirationDate(date.toISOString().slice(0, 16));
      } else {
        setExpirationDate("");
      }
    }
  }, [share]);

  const handleSave = async () => {
    if (!shareId) return;

    if (hasExpiration) {
      if (!expirationDate.trim()) {
        toast.error(t("shareExpiration.validation.dateRequired"));
        return;
      }

      const selectedDate = new Date(expirationDate);
      const now = new Date();

      if (selectedDate <= now) {
        toast.error(t("shareExpiration.validation.dateMustBeFuture"));
        return;
      }
    }

    setIsLoading(true);
    try {
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

      if (onSuccess) {
        onSuccess();
      }
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
      defaultDate.setDate(defaultDate.getDate() + 7);
      setExpirationDate(defaultDate.toISOString().slice(0, 16));
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader size="sm" />
          {share?.expiration ? t("common.updating") : t("common.saving")}
        </div>
      );
    }
    return share?.expiration ? t("common.update") : t("common.save");
  };

  return (
    <Dialog open={!!shareId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("shareExpiration.title")}</DialogTitle>
          <DialogDescription>{t("shareExpiration.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">{t("shareExpiration.currentStatus")}</h3>
            <div className="flex gap-2">
              {share?.expiration ? (
                <div className="bg-yellow-500/20 text-yellow-800 border border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20 rounded-md px-2 py-1 text-xs font-medium flex items-center gap-1">
                  <IconClock className="h-3 w-3" />
                  {t("shareExpiration.expires")} {new Date(share.expiration).toLocaleString()}
                </div>
              ) : (
                <div className="bg-green-500/20 text-green-800 border border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 rounded-md px-2 py-1 text-xs font-medium flex items-center gap-1">
                  <IconClockOff className="h-3 w-3" />
                  {t("shareExpiration.neverExpires")}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="expiration-enabled" checked={hasExpiration} onCheckedChange={handleExpirationToggle} />
              <Label htmlFor="expiration-enabled" className="flex items-center gap-2">
                <IconCalendar size={16} />
                {t("shareExpiration.enableExpiration")}
              </Label>
            </div>

            {hasExpiration && (
              <div className="space-y-4 pl-6 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="expiration-date">{t("shareExpiration.expirationDate")}</Label>
                  <Input
                    id="expiration-date"
                    type="datetime-local"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>{t("shareExpiration.info.title")}</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>{t("shareExpiration.info.willBeInaccessible")}</li>
                    <li>{t("shareExpiration.info.canBeChanged")}</li>
                  </ul>
                </div>
              </div>
            )}

            {!hasExpiration && (
              <div className="pl-6 border-l-2 border-muted">
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">{t("shareExpiration.info.noExpiration")}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {getButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
