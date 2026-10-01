"use client";

import type { ComponentProps } from "react";
import { IconClock, IconEye, IconFolder, IconLink, IconLock, IconMail, IconTrash } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { LineList, LineRow, SubHeading } from "@/components/ui/line-list";
import { Switch } from "@/components/ui/switch";
import type { Share } from "@/http/endpoints/shares/types";
import { cn } from "@/lib/utils";
import { getFileIcon } from "@/utils/file-icons";
import { formatFileSize } from "@/utils/format-file-size";
import { filesInFolder, topLevelItems } from "../lib/share-list";
import type { ShareDetailActions } from "./share-detail-types";

interface SectionProps {
  share: Share;
  actions: ShareDetailActions;
}

/** A quiet text button, like the "Change" and "Remove" links in the mockup. */
function TextAction({ muted, className, ...props }: ComponentProps<"button"> & { muted?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "-mx-1 rounded-md px-1 py-0.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/35",
        muted
          ? "text-ink-3 hover:text-bad"
          : "text-primary hover:text-[color-mix(in_oklab,var(--primary)_75%,var(--ink))]",
        className
      )}
      {...props}
    />
  );
}

export function FilesSection({ share, actions }: SectionProps) {
  const t = useTranslations();
  const { folders, files } = topLevelItems({ folders: share.folders ?? [], files: share.files ?? [] });
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <section className="mb-[26px]">
      <SubHeading>{t("shares.calm.files")}</SubHeading>
      {isEmpty ? (
        <p className="py-3 text-[13px] text-ink-3">
          {t("shares.calm.noFiles")}{" "}
          <TextAction onClick={() => actions.onManageFiles(share)}>{t("shares.calm.addFiles")}</TextAction>
        </p>
      ) : (
        <LineList>
          {folders.map((folder) => (
            <LineRow
              key={folder.id}
              icon={<IconFolder stroke={1.8} />}
              title={folder.name}
              sub={t("shares.calm.folderFiles", { count: filesInFolder(share, folder.id) })}
            >
              <TextAction
                muted
                aria-label={t("shares.calm.removeLabel", { name: folder.name })}
                onClick={() => actions.onRemoveItem(share, { kind: "folder", id: folder.id, name: folder.name })}
              >
                {t("shares.calm.remove")}
              </TextAction>
            </LineRow>
          ))}
          {files.map((file) => {
            const { icon: FileIcon } = getFileIcon(file.name);
            return (
              <LineRow
                key={file.id}
                icon={<FileIcon stroke={1.8} />}
                title={<span title={file.name}>{file.name}</span>}
                sub={formatFileSize(Number(file.size) || 0)}
              >
                <TextAction
                  muted
                  aria-label={t("shares.calm.removeLabel", { name: file.name })}
                  onClick={() => actions.onRemoveItem(share, { kind: "file", id: file.id, name: file.name })}
                >
                  {t("shares.calm.remove")}
                </TextAction>
              </LineRow>
            );
          })}
        </LineList>
      )}
    </section>
  );
}

export function AccessSection({ share, actions }: SectionProps) {
  const t = useTranslations();
  const format = useFormatter();
  const hasPassword = share.security?.hasPassword ?? false;
  const maxViews = share.security?.maxViews ?? null;
  const alias = share.alias?.alias;

  return (
    <section className="mb-[26px]">
      <SubHeading>{t("shares.calm.access")}</SubHeading>
      <LineList>
        <LineRow
          icon={<IconLock stroke={1.8} />}
          title={t("shares.calm.password")}
          sub={hasPassword ? t("shares.calm.passwordOn") : t("shares.calm.passwordOff")}
        >
          {hasPassword && (
            <TextAction aria-label={t("shares.calm.changePassword")} onClick={() => actions.onSecurity(share)}>
              {t("shares.calm.change")}
            </TextAction>
          )}
          <Switch
            checked={hasPassword}
            aria-label={t("shares.calm.password")}
            onCheckedChange={(on) => (on ? actions.onSecurity(share) : actions.onRemovePassword(share))}
          />
        </LineRow>
        <LineRow
          icon={<IconClock stroke={1.8} />}
          title={t("shares.calm.expires")}
          sub={
            share.expiration
              ? format.dateTime(new Date(share.expiration), { dateStyle: "medium", timeStyle: "short" })
              : t("shares.calm.neverExpires")
          }
        >
          <TextAction aria-label={t("shares.calm.changeExpiry")} onClick={() => actions.onExpiration(share)}>
            {t("shares.calm.change")}
          </TextAction>
        </LineRow>
        <LineRow
          icon={<IconEye stroke={1.8} />}
          title={t("shares.calm.viewLimit")}
          sub={maxViews ? t("shares.calm.viewLimitValue", { count: maxViews }) : t("shares.calm.noLimit")}
        >
          <TextAction aria-label={t("shares.calm.changeViewLimit")} onClick={() => actions.onViewLimit(share)}>
            {t("shares.calm.change")}
          </TextAction>
        </LineRow>
        <LineRow
          icon={<IconLink stroke={1.8} />}
          title={t("shares.calm.customLink")}
          sub={alias ? <span className="font-mono">/s/{alias}</span> : t("shares.calm.noLink")}
        >
          <TextAction aria-label={t("shares.calm.changeLink")} onClick={() => actions.onLink(share)}>
            {alias ? t("shares.calm.change") : t("shares.calm.createLink")}
          </TextAction>
        </LineRow>
      </LineList>
    </section>
  );
}

export function RecipientsSection({ share, actions, smtpEnabled }: SectionProps & { smtpEnabled: boolean }) {
  const t = useTranslations();
  const recipients = share.recipients ?? [];
  const canNotify = smtpEnabled && recipients.length > 0 && !!share.alias?.alias;

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <SubHeading>{t("shares.calm.recipients")}</SubHeading>
        <div className="flex items-center gap-2">
          {canNotify && <TextAction onClick={() => actions.onNotify(share)}>{t("shares.calm.notifyAll")}</TextAction>}
          <TextAction onClick={() => actions.onManageRecipients(share)}>{t("shares.calm.manage")}</TextAction>
        </div>
      </div>
      {recipients.length === 0 ? (
        <p className="py-3 text-[13px] text-ink-3">{t("shares.calm.noRecipients")}</p>
      ) : (
        <LineList>
          {recipients.map((recipient) => (
            <LineRow key={recipient.id} icon={<IconMail stroke={1.8} />} title={recipient.email} />
          ))}
        </LineList>
      )}
      {!smtpEnabled && recipients.length > 0 && <p className="text-[12.5px] text-ink-3">{t("shares.calm.smtpOff")}</p>}
    </section>
  );
}

export function DeleteShareSection({ share, actions }: SectionProps) {
  const t = useTranslations();
  return (
    <div className="mt-[34px]">
      <Button variant="destructive" onClick={() => actions.onDelete(share)}>
        <IconTrash />
        {t("shares.calm.deleteShare")}
      </Button>
    </div>
  );
}
