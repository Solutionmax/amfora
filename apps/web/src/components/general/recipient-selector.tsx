"use client";

import { useEffect, useState } from "react";
import { IconBell, IconMail, IconPlus, IconTrash, IconUsers, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useShareContext } from "@/contexts/share-context";
import { addRecipients, notifyRecipients, removeRecipients } from "@/http/endpoints";

interface Recipient {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface RecipientSelectorProps {
  shareId: string;
  selectedRecipients: Recipient[];
  shareAlias?: string;
  onSuccess: () => void;
}

export function RecipientSelector({ shareId, selectedRecipients, shareAlias, onSuccess }: RecipientSelectorProps) {
  const t = useTranslations();
  const { smtpEnabled } = useShareContext();
  const [recipients, setRecipients] = useState<string[]>(selectedRecipients?.map((recipient) => recipient.email) || []);
  const [newRecipient, setNewRecipient] = useState("");
  const [selectedForAction, setSelectedForAction] = useState<Set<string>>(new Set());
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);

  useEffect(() => {
    setRecipients(selectedRecipients?.map((recipient) => recipient.email) || []);
    setSelectedForAction(new Set());
  }, [selectedRecipients]);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.trim()) return;

    if (!isValidEmail(newRecipient)) {
      toast.error(t("recipientSelector.invalidEmail"));
      return;
    }

    if (recipients.includes(newRecipient)) {
      toast.error(t("recipientSelector.duplicateEmail"));
      return;
    }

    setIsAddingRecipient(true);
    try {
      await addRecipients(shareId, { emails: [newRecipient] });
      setRecipients([...recipients, newRecipient]);
      setNewRecipient("");
      toast.success(t("recipientSelector.addSuccess"));
      onSuccess();
    } catch {
      toast.error(t("recipientSelector.addError"));
    } finally {
      setIsAddingRecipient(false);
    }
  };

  const handleRemoveRecipient = async (email: string) => {
    try {
      await removeRecipients(shareId, { emails: [email] });
      setRecipients(recipients.filter((r) => r !== email));
      setSelectedForAction((prev) => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
      toast.success(t("recipientSelector.removeSuccess"));
      onSuccess();
    } catch {
      toast.error(t("recipientSelector.removeError"));
    }
  };

  const handleRemoveSelected = async () => {
    const emailsToRemove = Array.from(selectedForAction);
    try {
      await removeRecipients(shareId, { emails: emailsToRemove });
      setRecipients(recipients.filter((r) => !selectedForAction.has(r)));
      setSelectedForAction(new Set());
      toast.success(t("recipientSelector.bulkRemoveSuccess", { count: emailsToRemove.length }));
      onSuccess();
    } catch {
      toast.error(t("recipientSelector.bulkRemoveError"));
    }
  };

  const handleNotifySelected = async () => {
    if (!shareAlias) return;

    const emailsToNotify = Array.from(selectedForAction);
    const link = `${window.location.origin}/s/${shareAlias}`;
    const loadingToast = toast.loading(t("recipientSelector.sendingNotifications"));

    try {
      await notifyRecipients(shareId, { shareLink: link });
      toast.dismiss(loadingToast);
      toast.success(t("recipientSelector.bulkNotifySuccess", { count: emailsToNotify.length }));
      setSelectedForAction(new Set());
    } catch {
      toast.dismiss(loadingToast);
      toast.error(t("recipientSelector.bulkNotifyError"));
    }
  };

  const handleNotifyAll = async () => {
    if (!shareAlias) return;

    const link = `${window.location.origin}/s/${shareAlias}`;
    const loadingToast = toast.loading(t("recipientSelector.sendingNotifications"));

    try {
      await notifyRecipients(shareId, { shareLink: link });
      toast.dismiss(loadingToast);
      toast.success(t("recipientSelector.notifySuccess"));
    } catch {
      toast.dismiss(loadingToast);
      toast.error(t("recipientSelector.notifyError"));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedForAction(new Set(recipients));
    } else {
      setSelectedForAction(new Set());
    }
  };

  const handleSelectRecipient = (email: string, checked: boolean) => {
    const newSelected = new Set(selectedForAction);
    if (checked) {
      newSelected.add(email);
    } else {
      newSelected.delete(email);
    }
    setSelectedForAction(newSelected);
  };

  const isAllSelected = recipients.length > 0 && selectedForAction.size === recipients.length;
  const hasSelection = selectedForAction.size > 0;

  const notifyOne = async (email: string) => {
    const link = `${window.location.origin}/s/${shareAlias}`;
    const loadingToast = toast.loading(t("recipientSelector.sendingNotifications"));
    try {
      await notifyRecipients(shareId, { shareLink: link });
      toast.dismiss(loadingToast);
      toast.success(t("recipientSelector.singleNotifySuccess", { email }));
    } catch {
      toast.dismiss(loadingToast);
      toast.error(t("recipientSelector.singleNotifyError"));
    }
  };

  const canNotify = smtpEnabled === "true" && !!shareAlias;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <label htmlFor="recipient-email" className="text-[13px] font-medium text-ink-2">
          {t("recipientSelector.addRecipient")}
        </label>
        <div className="flex gap-2">
          <Input
            id="recipient-email"
            type="email"
            className="flex-1"
            placeholder={t("recipientSelector.emailPlaceholder")}
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isAddingRecipient && handleAddRecipient()}
            disabled={isAddingRecipient}
          />
          <Button variant="outline" onClick={handleAddRecipient} disabled={!newRecipient.trim() || isAddingRecipient}>
            <IconPlus />
            {isAddingRecipient ? t("common.loadingSimple") : t("recipientSelector.add")}
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex min-h-8 items-center justify-between gap-3">
          {hasSelection ? (
            <>
              <span className="text-[13px] font-medium">
                {t("recipientSelector.selectedCount", { count: selectedForAction.size })}
              </span>
              <div className="flex items-center gap-1.5">
                {canNotify && (
                  <Button variant="outline" size="sm" onClick={handleNotifySelected}>
                    <IconBell />
                    {t("recipientSelector.notifySelected")}
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={handleRemoveSelected}>
                  <IconTrash />
                  {t("recipientSelector.removeSelected")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedForAction(new Set())}
                  aria-label={t("common.cancel")}
                >
                  <IconX />
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-sans text-[12.5px] font-semibold tracking-normal text-ink-3">
                {t("recipientSelector.recipients", { count: recipients.length })}
              </h3>
              {recipients.length > 0 && canNotify && (
                <Button variant="ghost" size="sm" onClick={handleNotifyAll}>
                  <IconBell />
                  {t("recipientSelector.notifyAll")}
                </Button>
              )}
            </>
          )}
        </div>

        {recipients.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 border-t border-line px-4 py-10 text-center">
            <IconUsers className="mb-1 size-6 text-ink-icon" />
            <p className="font-semibold">{t("recipientSelector.noRecipients")}</p>
            <p className="text-[13px] text-ink-3">{t("recipientSelector.noRecipientsDescription")}</p>
          </div>
        ) : (
          <div className="border-t border-line">
            <label className="flex items-center gap-3 border-b border-line px-1 py-2.5 text-[13px] text-ink-3">
              <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
              {t("recipientSelector.selectAll")}
            </label>
            <div className="max-h-80 overflow-y-auto">
              {recipients.map((email) => {
                const isSelected = selectedForAction.has(email);
                return (
                  <div
                    key={email}
                    className={`group flex items-center gap-3 border-b border-line px-1 py-2.5 transition-colors ${
                      isSelected ? "bg-primary-soft" : "hover:bg-surface-2"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectRecipient(email, checked as boolean)}
                      aria-label={t("recipientSelector.selectRecipient", { email })}
                    />
                    <IconMail className="size-[17px] shrink-0 text-ink-icon" />
                    <span className="min-w-0 flex-1 truncate font-medium">{email}</span>
                    {canNotify && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => notifyOne(email)}
                        aria-label={t("recipientSelector.notifySingle")}
                        title={t("recipientSelector.notifySingle")}
                      >
                        <IconBell />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-bad hover:[&_svg]:text-bad"
                      onClick={() => handleRemoveRecipient(email)}
                      aria-label={t("recipientSelector.removeSingle")}
                      title={t("recipientSelector.removeSingle")}
                    >
                      <IconTrash />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
