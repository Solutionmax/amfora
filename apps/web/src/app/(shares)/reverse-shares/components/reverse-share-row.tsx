"use client";

import { useEffect, useState } from "react";
import {
  IconCopy,
  IconDotsVertical,
  IconEdit,
  IconExternalLink,
  IconInbox,
  IconLink,
  IconLock,
  IconLockOpen,
  IconQrcode,
  IconToggleLeft,
  IconToggleRight,
  IconTrash,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Chip } from "@/components/brand/statement";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFileSize } from "@/utils/format-file-size";
import { ReverseShare } from "../hooks/use-reverse-shares";
import { EditPasswordModal } from "./edit-password-modal";
import { ReceivedFilesList } from "./received-files-list";

export interface ReverseShareRowProps {
  reverseShare: ReverseShare;
  onCopyLink: (reverseShare: ReverseShare) => void;
  onDelete: (reverseShare: ReverseShare) => void;
  onEdit: (reverseShare: ReverseShare) => void;
  onGenerateLink: (reverseShare: ReverseShare) => void;
  onViewDetails: (reverseShare: ReverseShare) => void;
  onViewFiles: (reverseShare: ReverseShare) => void;
  onViewQrCode?: (reverseShare: ReverseShare) => void;
  onToggleActive?: (id: string, isActive: boolean) => Promise<unknown>;
  onUpdatePassword?: (id: string, data: { hasPassword: boolean; password?: string }) => Promise<unknown>;
  onRefresh?: () => void;
}

/** One receive link: who it is for, the link itself, the facts, and what came in. */
export function ReverseShareRow({
  reverseShare,
  onCopyLink,
  onDelete,
  onEdit,
  onGenerateLink,
  onViewDetails,
  onViewFiles,
  onViewQrCode,
  onToggleActive,
  onUpdatePassword,
  onRefresh,
}: ReverseShareRowProps) {
  const t = useTranslations();
  const [origin, setOrigin] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const files = reverseShare.files ?? [];
  const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const alias = reverseShare.alias?.alias;
  const url = alias && origin ? `${origin}/r/${alias}` : "";
  const isExpired = reverseShare.expiration ? new Date(reverseShare.expiration) < new Date() : false;
  const status = isExpired ? "expired" : reverseShare.isActive ? "active" : "inactive";
  const dot = { active: "bg-ok", inactive: "bg-ink-3", expired: "bg-bad" }[status];

  return (
    <article className="card-soft rounded-[calc(var(--radius)+4px)] border border-line bg-surface">
      <div className="flex flex-col gap-4 px-5 pb-4 pt-5 md:flex-row md:items-start md:justify-between md:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
            <h2 className="truncate font-display text-lg font-semibold tracking-[-0.01em]">
              {reverseShare.name || t("reverseShares.card.untitled")}
            </h2>
            <span className="text-xs text-ink-3">{t(`reverseShares.status.${status}`)}</span>
          </div>
          {reverseShare.description && <p className="mt-1 text-[13px] text-ink-3">{reverseShare.description}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {url ? (
              <>
                <span className="mono flex h-8 min-w-0 max-w-full items-center rounded-[var(--radius)] border border-line bg-surface-2 px-2.5 text-xs text-ink-2">
                  <span className="truncate">{url}</span>
                </span>
                <Button variant="outline" size="sm" onClick={() => onCopyLink(reverseShare)}>
                  <IconCopy className="size-4" />
                  {t("reverseShares.card.copyLink")}
                </Button>
                {onViewQrCode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => onViewQrCode(reverseShare)}
                    aria-label={t("reverseShares.card.viewQrCode")}
                  >
                    <IconQrcode className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  asChild
                  aria-label={t("reverseShares.card.openInNewTab")}
                >
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <IconExternalLink className="size-4" />
                  </a>
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onGenerateLink(reverseShare)}>
                <IconLink className="size-4" />
                {t("reverseShares.card.createLink")}
              </Button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip icon={<IconInbox />}>
              {reverseShare.maxFiles
                ? t("reverseShares.v2.filesOf", { count: files.length, max: reverseShare.maxFiles })
                : t("reverseShares.v2.filesReceived", { count: files.length })}
            </Chip>
            {totalSize > 0 && <Chip>{formatFileSize(totalSize)}</Chip>}
            {reverseShare.maxFileSize ? (
              <Chip>{t("reverseShares.v2.maxSize", { size: formatFileSize(reverseShare.maxFileSize) })}</Chip>
            ) : null}
            <Chip icon={reverseShare.hasPassword ? <IconLock /> : <IconLockOpen />}>
              {reverseShare.hasPassword ? t("reverseShares.status.protected") : t("reverseShares.v2.openLink")}
            </Chip>
            <Chip>
              {reverseShare.expiration
                ? t(isExpired ? "reverseShares.v2.expiredOn" : "reverseShares.v2.expiresOn", {
                    date: format(new Date(reverseShare.expiration), "d MMM"),
                  })
                : t("reverseShares.v2.noEndDate")}
            </Chip>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("reverseShares.v2.actions")}>
              <IconDotsVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onClick={() => onEdit(reverseShare)}>
              <IconEdit className="size-4" />
              {t("reverseShares.actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGenerateLink(reverseShare)}>
              <IconLink className="size-4" />
              {alias ? t("reverseShares.card.editLink") : t("reverseShares.card.createLink")}
            </DropdownMenuItem>
            {onUpdatePassword && (
              <DropdownMenuItem onClick={() => setShowPasswordModal(true)}>
                {reverseShare.hasPassword ? <IconLock className="size-4" /> : <IconLockOpen className="size-4" />}
                {t("reverseShares.labels.protectWithPassword")}
              </DropdownMenuItem>
            )}
            {onToggleActive && (
              <DropdownMenuItem onClick={() => onToggleActive(reverseShare.id, !reverseShare.isActive)}>
                {reverseShare.isActive ? <IconToggleLeft className="size-4" /> : <IconToggleRight className="size-4" />}
                {reverseShare.isActive ? t("reverseShares.v2.deactivate") : t("reverseShares.v2.activate")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onViewDetails(reverseShare)}>
              <IconInbox className="size-4" />
              {t("reverseShares.card.viewDetails")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-bad focus:text-bad" onClick={() => onDelete(reverseShare)}>
              <IconTrash className="size-4" />
              {t("reverseShares.card.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border-t border-line px-5 py-4 md:px-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-ink-3">
          {t("reverseShares.v2.received", { count: files.length })}
        </h3>
        <ReceivedFilesList files={files} onShowAll={() => onViewFiles(reverseShare)} onFileDeleted={onRefresh} />
      </div>

      {showPasswordModal && onUpdatePassword && (
        <EditPasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          reverseShare={reverseShare}
          onUpdatePassword={async (id, data) => {
            await onUpdatePassword(id, data);
          }}
        />
      )}
    </article>
  );
}
