"use client";

import {
  IconClock,
  IconFolderShare,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { linkStatus, LinkTags } from "@/components/general/share-tags";
import { Button } from "@/components/ui/button";
import { Fact, Facts } from "@/components/ui/facts";
import { LineList, LineRow, SubHeading } from "@/components/ui/line-list";
import { Switch } from "@/components/ui/switch";
import { useSecureConfigs } from "@/hooks/use-secure-configs";
import { adminSwitchedOff } from "@/lib/admin-notifications";
import { useReverseShareDetails } from "../hooks/use-reverse-share-details";
import type { ReverseShare } from "../hooks/use-reverse-shares";
import { ReceiveLinkRow } from "./receive-link-row";
import { ReceivedFilesSection } from "./received-files-section";
import { SenderRules, type SenderRulesProps } from "./sender-rules";

export interface ReceiveDetailActions extends Omit<SenderRulesProps, "reverseShare"> {
  onEdit: () => void;
  onToggleActive: () => void;
  onCopyAll: () => void;
  onCopyLink: () => void;
  onViewQrCode: () => void;
  onManageFiles: () => void;
  onFilesChanged: () => void;
  onDelete: () => void;
  /** Ask for, or stop, the email before the end date. */
  onRemind: (on: boolean) => void;
}

/** Everything about one receive link: header, link, actions, numbers, what came in and the rules. */
export function ReceiveDetail({ reverseShare, ...actions }: ReceiveDetailActions & { reverseShare: ReverseShare }) {
  const t = useTranslations();
  const { configs } = useSecureConfigs();
  const expiryOff = adminSwitchedOff(configs, "notifyExpiryEnabled");
  const { formatShortDate, formatFileSize } = useReverseShareDetails();
  const files = reverseShare.files ?? [];
  const status = linkStatus({ expiration: reverseShare.expiration, isActive: reverseShare.isActive });
  const name = reverseShare.name || t("reverseShares.card.untitled");

  return (
    <article>
      <header>
        <h2 className="break-words font-display text-[26px] font-bold leading-[1.15] tracking-[-0.02em] lg:text-[30px]">
          {name}
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13.5px] text-ink-3">
          <LinkTags
            expiration={reverseShare.expiration}
            isActive={reverseShare.isActive}
            hasPassword={reverseShare.hasPassword}
          />
          <span>· {t("reverseShares.calm.receivedCount", { count: files.length })}</span>
          {status === "active" && reverseShare.expiration && (
            <span>· {t("reverseShares.calm.openUntil", { date: formatShortDate(reverseShare.expiration) })}</span>
          )}
        </p>
        {reverseShare.description && <p className="mt-3 text-ink-2">{reverseShare.description}</p>}
      </header>

      <ReceiveLinkRow
        reverseShare={reverseShare}
        onCopyLink={actions.onCopyLink}
        onViewQrCode={actions.onViewQrCode}
        onCreateLink={actions.onEditAlias}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={actions.onEdit}>
          <IconPencil />
          {t("reverseShares.actions.edit")}
        </Button>
        <Button variant="outline" onClick={actions.onToggleActive}>
          {reverseShare.isActive ? <IconPlayerPause /> : <IconPlayerPlay />}
          {reverseShare.isActive ? t("reverseShares.calm.pause") : t("reverseShares.calm.turnOn")}
        </Button>
        {files.length > 0 && (
          <Button variant="outline" onClick={actions.onCopyAll}>
            <IconFolderShare />
            {t("reverseShares.calm.copyAll")}
          </Button>
        )}
      </div>

      <Facts className="mb-[34px] mt-[30px]">
        <Fact
          label={t("reverseShares.calm.facts.received")}
          value={
            <>
              {files.length}
              {reverseShare.maxFiles ? (
                <small className="ml-1.5 text-[13px] font-semibold tracking-normal text-ink-3">
                  {t("reverseShares.calm.ofMax", { max: reverseShare.maxFiles })}
                </small>
              ) : null}
            </>
          }
        />
        <Fact label={t("reverseShares.calm.facts.maxPerFile")} value={formatFileSize(reverseShare.maxFileSize)} />
        <Fact
          label={t("reverseShares.calm.facts.expires")}
          value={reverseShare.expiration ? formatShortDate(reverseShare.expiration) : t("reverseShares.calm.never")}
          hint={status === "expired" ? t("ui.tags.expired") : undefined}
        />
      </Facts>

      <section aria-labelledby="received-files-heading">
        <div className="flex items-center justify-between gap-3">
          <SubHeading>
            <span id="received-files-heading">{t("reverseShares.calm.receivedFiles")}</span>
          </SubHeading>
          {files.length > 0 && (
            <Button variant="link" size="sm" className="h-auto px-0" onClick={actions.onManageFiles}>
              {t("reverseShares.calm.manageFiles")}
            </Button>
          )}
        </div>
        <div className="mb-7 mt-1">
          <ReceivedFilesSection files={files} onFileDeleted={actions.onFilesChanged} />
        </div>
      </section>

      <section aria-labelledby="sender-rules-heading">
        <SubHeading>
          <span id="sender-rules-heading">{t("reverseShares.calm.rules.title")}</span>
        </SubHeading>
        <div className="mt-1">
          <SenderRules
            reverseShare={reverseShare}
            onUpdate={actions.onUpdate}
            onEditPassword={actions.onEditPassword}
            onRemovePassword={actions.onRemovePassword}
            onEditAlias={actions.onEditAlias}
          />
        </div>
      </section>

      <section aria-labelledby="receive-notify-heading" className="mt-7">
        <SubHeading>
          <span id="receive-notify-heading">{t("reverseShares.calm.notify.title")}</span>
        </SubHeading>
        <LineList className="mt-1">
          <LineRow
            icon={<IconClock stroke={1.8} />}
            title={t("reverseShares.calm.notify.expiry")}
            sub={
              expiryOff
                ? t("reverseShares.calm.notify.offByAdmin")
                : reverseShare.expiration
                  ? t("reverseShares.calm.notify.expiryHint")
                  : t("reverseShares.calm.notify.noEndDate")
            }
          >
            <Switch
              checked={!!reverseShare.expiration && !expiryOff && (reverseShare.remindBeforeExpiry ?? false)}
              disabled={!reverseShare.expiration || expiryOff}
              aria-label={t("reverseShares.calm.notify.expiry")}
              onCheckedChange={actions.onRemind}
            />
          </LineRow>
        </LineList>
      </section>

      <div className="mt-[34px]">
        <Button variant="destructive" onClick={actions.onDelete}>
          <IconTrash />
          {t("reverseShares.calm.deleteLink")}
        </Button>
      </div>
    </article>
  );
}
