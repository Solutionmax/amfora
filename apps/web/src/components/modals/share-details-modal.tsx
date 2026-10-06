"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconClock,
  IconCopy,
  IconExternalLink,
  IconEye,
  IconLink,
  IconLock,
  IconMail,
  IconQrcode,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import { LinkTags } from "@/components/general/share-tags";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Fact, Facts } from "@/components/ui/facts";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { LineList, LineRow, SubHeading } from "@/components/ui/line-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getShare, updateShare } from "@/http/endpoints";
import type { Share } from "@/http/endpoints/shares/types";
import { copyText } from "@/lib/clipboard";
import { getFileIcon } from "@/utils/file-icons";
import { formatFileSize } from "@/utils/format-file-size";
import { GenerateShareLinkModal } from "./generate-share-link-modal";
import { QrCodeModal } from "./qr-code-modal";
import { ShareExpirationModal } from "./share-expiration-modal";
import { ShareSecurityModal } from "./share-security-modal";

interface ShareDetailsModalProps {
  shareId: string | null;
  onClose: () => void;
  onUpdateName?: (shareId: string, newName: string) => Promise<void>;
  onUpdateDescription?: (shareId: string, newDescription: string) => Promise<void>;
  onGenerateLink?: (shareId: string, alias: string) => Promise<void>;
  onManageFiles?: (share: any) => void;
  onUpdateSecurity?: (shareId: string) => Promise<void>;
  onUpdateExpiration?: (shareId: string) => Promise<void>;
  refreshTrigger?: number;
  onSuccess?: () => void;
}

type SubDialog = "link" | "security" | "expiration" | "qr" | null;

const linkClass =
  "-mx-1 rounded-md px-1 py-0.5 text-[13px] font-semibold text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/35";

/** Read-mostly view of one share, opened from places that have no detail column (the dashboard). */
export function ShareDetailsModal({
  shareId,
  onClose,
  onUpdateName,
  onUpdateDescription,
  onGenerateLink,
  onManageFiles,
  onUpdateSecurity,
  onUpdateExpiration,
  refreshTrigger,
  onSuccess,
}: ShareDetailsModalProps) {
  const t = useTranslations();
  const format = useFormatter();
  const [share, setShare] = useState<Share | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sub, setSub] = useState<SubDialog>(null);
  const [draft, setDraft] = useState<{ name: string; description: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const canEdit = !!onUpdateName || !!onUpdateDescription;

  const loadShareDetails = useCallback(async () => {
    if (!shareId) return;
    setIsLoading(true);
    try {
      const response = await getShare(shareId);
      setShare(response.data.share);
    } catch {
      toast.error(t("shareDetails.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [shareId, t]);

  useEffect(() => {
    if (shareId) {
      setDraft(null);
      void loadShareDetails();
    } else {
      setShare(null);
    }
  }, [shareId, loadShareDetails]);

  useEffect(() => {
    if (refreshTrigger) void loadShareDetails();
  }, [refreshTrigger, loadShareDetails]);

  const afterChange = async () => {
    setSub(null);
    await loadShareDetails();
    onSuccess?.();
  };

  // Saved here; the end date is left out, so the server keeps it.
  const saveDraft = async () => {
    if (!share || !draft) return;
    setIsSaving(true);
    try {
      await updateShare({
        id: share.id,
        name: draft.name,
        description: draft.description,
      });
      toast.success(t("shareManager.updateSuccess"));
      setDraft(null);
      await afterChange();
    } catch {
      toast.error(t("shareManager.updateError"));
    } finally {
      setIsSaving(false);
    }
  };

  const alias = share?.alias?.alias;
  const shareLink = alias && typeof window !== "undefined" ? `${window.location.origin}/s/${alias}` : null;

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await copyText(shareLink);
      toast.success(t("shareDetails.linkCopied"));
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  };

  const maxViews = share?.security?.maxViews ?? null;

  return (
    <>
      <Dialog open={!!shareId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="break-words">
              {share?.name || (isLoading ? t("shareDetails.title") : t("shares.calm.untitled"))}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {share && (
                  <>
                    <LinkTags
                      expiration={share.expiration}
                      hasPassword={share.security?.hasPassword ?? false}
                      groupName={share.group?.name}
                    />
                    <span>
                      ·{" "}
                      {t("shares.calm.created", {
                        date: format.dateTime(new Date(share.createdAt), { dateStyle: "medium" }),
                      })}
                    </span>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {!share ? (
            <div aria-hidden className="space-y-3">
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <div className="min-w-0 space-y-6">
              {shareLink ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-line-2 py-1.5 pl-4 pr-1.5">
                  <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink-3">
                    {window.location.host}/s/<b className="font-medium text-ink">{alias}</b>
                  </code>
                  <Button variant="ghost" size="icon" aria-label={t("shares.calm.openLink")} asChild>
                    <a href={shareLink} target="_blank" rel="noopener noreferrer">
                      <IconExternalLink />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={t("shares.calm.qrCode")} onClick={() => setSub("qr")}>
                    <IconQrcode />
                  </Button>
                  <Button variant="outline" onClick={handleCopyLink}>
                    <IconCopy />
                    <span className="max-sm:sr-only">{t("shares.calm.copyLink")}</span>
                  </Button>
                </div>
              ) : (
                <p className="text-[13px] text-ink-3">{t("shares.calm.noLink")}</p>
              )}

              <Facts className="[&_dd.font-display]:text-[22px]">
                <Fact
                  label={t("shares.calm.views")}
                  value={share.views ?? 0}
                  hint={maxViews ? t("shares.calm.viewsOf", { max: maxViews }) : undefined}
                />
                <Fact label={t("shares.calm.files")} value={share.files?.length ?? 0} />
                <Fact label={t("shares.calm.recipients")} value={share.recipients?.length ?? 0} />
              </Facts>

              {draft ? (
                <form
                  className="grid gap-[18px]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveDraft();
                  }}
                >
                  {onUpdateName && (
                    <Field label={t("shares.calm.modals.nameLabel")} htmlFor="share-details-name">
                      <Input
                        id="share-details-name"
                        autoFocus
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      />
                    </Field>
                  )}
                  {onUpdateDescription && (
                    <Field label={t("shares.calm.modals.descriptionLabel")} htmlFor="share-details-description">
                      <Textarea
                        id="share-details-description"
                        rows={3}
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      />
                    </Field>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" type="button" onClick={() => setDraft(null)} disabled={isSaving}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? t("common.saving") : t("common.save")}
                    </Button>
                  </div>
                </form>
              ) : (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <SubHeading>{t("shares.calm.message")}</SubHeading>
                    {canEdit && (
                      <button
                        type="button"
                        className={linkClass}
                        onClick={() => setDraft({ name: share.name ?? "", description: share.description ?? "" })}
                      >
                        {t("shares.calm.edit")}
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line break-words text-ink-2">
                    {share.description || <span className="text-ink-3">{t("shareDetails.noDescription")}</span>}
                  </p>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between gap-3">
                  <SubHeading>{t("shares.calm.files")}</SubHeading>
                  {onManageFiles && (
                    <button type="button" className={linkClass} onClick={() => onManageFiles(share)}>
                      {t("sharesTable.actions.manageFiles")}
                    </button>
                  )}
                </div>
                {share.files?.length ? (
                  <LineList className="max-h-56 overflow-y-auto">
                    {share.files.map((file) => {
                      const { icon: FileIcon } = getFileIcon(file.name);
                      return (
                        <LineRow
                          key={file.id}
                          className="min-h-[52px] py-2"
                          icon={<FileIcon stroke={1.8} />}
                          title={file.name}
                          sub={formatFileSize(Number(file.size) || 0)}
                        />
                      );
                    })}
                  </LineList>
                ) : (
                  <p className="py-2 text-[13px] text-ink-3">{t("shares.calm.noFiles")}</p>
                )}
              </section>

              <section>
                <SubHeading>{t("shares.calm.access")}</SubHeading>
                <LineList>
                  <LineRow
                    className="min-h-[52px] py-2"
                    icon={<IconLock stroke={1.8} />}
                    title={t("shares.calm.password")}
                    sub={share.security?.hasPassword ? t("shares.calm.passwordOn") : t("shares.calm.passwordOff")}
                  >
                    {onUpdateSecurity && (
                      <button type="button" className={linkClass} onClick={() => setSub("security")}>
                        {t("shares.calm.change")}
                      </button>
                    )}
                  </LineRow>
                  <LineRow
                    className="min-h-[52px] py-2"
                    icon={<IconClock stroke={1.8} />}
                    title={t("shares.calm.expires")}
                    sub={
                      share.expiration
                        ? format.dateTime(new Date(share.expiration), { dateStyle: "medium", timeStyle: "short" })
                        : t("shares.calm.neverExpires")
                    }
                  >
                    {onUpdateExpiration && (
                      <button type="button" className={linkClass} onClick={() => setSub("expiration")}>
                        {t("shares.calm.change")}
                      </button>
                    )}
                  </LineRow>
                  <LineRow
                    className="min-h-[52px] py-2"
                    icon={<IconEye stroke={1.8} />}
                    title={t("shares.calm.viewLimit")}
                    sub={maxViews ? t("shares.calm.viewLimitValue", { count: maxViews }) : t("shares.calm.noLimit")}
                  />
                  <LineRow
                    className="min-h-[52px] py-2"
                    icon={<IconLink stroke={1.8} />}
                    title={t("shares.calm.customLink")}
                    sub={alias ? <span className="font-mono">/s/{alias}</span> : t("shares.calm.noLink")}
                  >
                    {onGenerateLink && (
                      <button type="button" className={linkClass} onClick={() => setSub("link")}>
                        {alias ? t("shares.calm.change") : t("shares.calm.createLink")}
                      </button>
                    )}
                  </LineRow>
                </LineList>
              </section>

              {share.recipients?.length > 0 && (
                <section>
                  <SubHeading>{t("shares.calm.recipients")}</SubHeading>
                  <LineList>
                    {share.recipients.map((recipient) => (
                      <LineRow
                        key={recipient.id}
                        className="min-h-[48px] py-2"
                        icon={<IconMail stroke={1.8} />}
                        title={recipient.email}
                      />
                    ))}
                  </LineList>
                </section>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={onClose}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {sub === "link" && share && (
        <GenerateShareLinkModal
          shareId={share.id}
          share={share}
          onClose={() => setSub(null)}
          onSuccess={afterChange}
          onGenerate={onGenerateLink || (() => Promise.resolve())}
        />
      )}
      {sub === "security" && share && (
        <ShareSecurityModal shareId={share.id} share={share} onClose={() => setSub(null)} onSuccess={afterChange} />
      )}
      {sub === "expiration" && share && (
        <ShareExpirationModal shareId={share.id} share={share} onClose={() => setSub(null)} onSuccess={afterChange} />
      )}
      {sub === "qr" && shareLink && (
        <QrCodeModal
          isOpen
          onClose={() => setSub(null)}
          shareLink={shareLink}
          shareName={share?.name || t("shares.calm.untitled")}
        />
      )}
    </>
  );
}
