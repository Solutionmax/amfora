"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
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
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { generateInviteToken } from "@/http/endpoints/invite";
import { copyText } from "@/lib/clipboard";

interface GenerateInviteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COPIED_RESET_MS = 2000;

export function GenerateInviteLinkModal({ isOpen, onClose }: GenerateInviteLinkModalProps) {
  const t = useTranslations();
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await generateInviteToken();

      setInviteUrl(`${window.location.origin}/register-with-invite/${response.token}`);
      toast.success(t("users.invite.generated"));
    } catch (error) {
      console.error("Failed to generate invite token:", error);
      toast.error(t("users.invite.errors.generateFailed"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;

    try {
      await copyText(inviteUrl);
      setCopied(true);
      toast.success(t("users.invite.linkCopied"));
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(t("common.unexpectedError"));
    }
  };

  const handleClose = () => {
    setInviteUrl(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("users.calm.invite.title")}</DialogTitle>
          <DialogDescription>{t("users.calm.invite.description")}</DialogDescription>
        </DialogHeader>

        {inviteUrl && (
          <Field label={t("users.calm.invite.linkLabel")} htmlFor="invite-url" hint={t("users.calm.invite.hint")}>
            <div className="flex gap-2">
              <Input
                id="invite-url"
                value={inviteUrl}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
                className="mono text-[13px]"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0"
                onClick={handleCopy}
                aria-label={t("users.invite.copyLink")}
              >
                {copied ? <IconCheck aria-hidden="true" /> : <IconCopy aria-hidden="true" />}
                {copied ? t("common.copied") : t("common.copy")}
              </Button>
            </div>
          </Field>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            {inviteUrl ? t("common.close") : t("common.cancel")}
          </Button>
          {!inviteUrl && (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? t("users.invite.generating") : t("users.calm.invite.create")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
