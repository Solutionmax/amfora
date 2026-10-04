"use client";

import {
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconLink,
  IconMail,
  IconPencil,
  IconPlus,
  IconQrcode,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";

import { linkStatus, LinkTags } from "@/components/general/share-tags";
import { Button } from "@/components/ui/button";
import { Fact, Facts } from "@/components/ui/facts";
import { SubHeading } from "@/components/ui/line-list";
import type { Share } from "@/http/endpoints/shares/types";
import { ShareActivity } from "./share-activity";
import { AccessSection, DeleteShareSection, FilesSection, RecipientsSection } from "./share-detail-sections";
import type { ShareDetailActions } from "./share-detail-types";

export function useShortDate() {
  const format = useFormatter();
  return (value: string) => {
    const date = new Date(value);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return format.dateTime(date, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
  };
}

function LinkRow({ share, actions }: { share: Share; actions: ShareDetailActions }) {
  const t = useTranslations();
  const alias = share.alias?.alias;
  const host = typeof window === "undefined" ? "" : window.location.host;

  if (!alias) {
    return (
      <div className="mb-3 mt-[26px] flex flex-wrap items-center gap-2 rounded-xl border border-line-2 py-1.5 pl-4 pr-1.5">
        <span className="min-w-0 flex-1 py-1.5 text-[13.5px] text-ink-3">{t("shares.calm.noLink")}</span>
        <Button variant="outline" onClick={() => actions.onLink(share)}>
          <IconLink />
          {t("shares.calm.createLink")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-3 mt-[26px] flex items-center gap-1.5 rounded-xl border border-line-2 py-1.5 pl-4 pr-1.5">
      <code className="min-w-0 flex-1 truncate font-mono text-[13.5px] font-medium text-ink-3">
        {host}/s/<b className="font-medium text-ink">{alias}</b>
      </code>
      <Button variant="ghost" size="icon" aria-label={t("shares.calm.openLink")} asChild>
        <a href={`/s/${alias}`} target="_blank" rel="noopener noreferrer">
          <IconExternalLink />
        </a>
      </Button>
      <Button variant="ghost" size="icon" aria-label={t("shares.calm.qrCode")} onClick={() => actions.onShowQr(share)}>
        <IconQrcode />
      </Button>
      <Button variant="outline" onClick={() => actions.onCopyLink(share)}>
        <IconCopy />
        <span className="max-sm:sr-only">{t("shares.calm.copyLink")}</span>
      </Button>
    </div>
  );
}

/** Right column: everything about one share, in the order of the approved mockup. */
export function ShareDetail({
  share,
  smtpEnabled,
  actions,
}: {
  share: Share;
  smtpEnabled: boolean;
  actions: ShareDetailActions;
}) {
  const t = useTranslations();
  const shortDate = useShortDate();
  const status = linkStatus({ expiration: share.expiration });
  const maxViews = share.security?.maxViews ?? null;

  return (
    <article>
      <header>
        <h2 className="break-words font-display text-[26px] font-bold leading-[1.15] tracking-[-0.02em] lg:text-[30px]">
          {share.name || t("shares.calm.untitled")}
        </h2>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-ink-3">
          <LinkTags expiration={share.expiration} hasPassword={share.security?.hasPassword ?? false} />
          <span>· {t("shares.calm.created", { date: shortDate(share.createdAt) })}</span>
          {share.expiration && (
            <span>
              ·{" "}
              {status === "expired"
                ? t("shares.calm.expiredOn", { date: shortDate(share.expiration) })
                : t("shares.calm.expiresOn", { date: shortDate(share.expiration) })}
            </span>
          )}
        </p>
      </header>

      <LinkRow share={share} actions={actions} />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => actions.onEdit(share)}>
          <IconPencil />
          {t("shares.calm.edit")}
        </Button>
        <Button variant="outline" onClick={() => actions.onManageFiles(share)}>
          <IconPlus />
          {t("shares.calm.addFiles")}
        </Button>
        <Button variant="outline" onClick={() => actions.onManageRecipients(share)}>
          <IconMail />
          {t("shares.calm.recipients")}
        </Button>
        {share.files?.length > 0 && (
          <Button variant="outline" onClick={() => actions.onDownloadAll(share)}>
            <IconDownload />
            {t("shares.calm.downloadAll")}
          </Button>
        )}
      </div>

      <Facts className="mb-[34px] mt-[30px] [&_dd.font-display]:text-[22px]">
        <Fact
          label={t("shares.calm.views")}
          value={share.views ?? 0}
          hint={maxViews ? t("shares.calm.viewsOf", { max: maxViews }) : undefined}
        />
        <Fact label={t("shares.calm.files")} value={share.files?.length ?? 0} />
        <Fact
          label={t("shares.calm.expires")}
          value={share.expiration ? shortDate(share.expiration) : t("shares.calm.never")}
        />
      </Facts>

      {share.description && (
        <section className="mb-[26px]">
          <SubHeading>{t("shares.calm.message")}</SubHeading>
          <p className="mt-1.5 whitespace-pre-line break-words text-ink-2">{share.description}</p>
        </section>
      )}

      <FilesSection share={share} actions={actions} />
      <AccessSection share={share} actions={actions} />
      <ShareActivity shareId={share.id} />
      <RecipientsSection share={share} actions={actions} smtpEnabled={smtpEnabled} />
      <DeleteShareSection share={share} actions={actions} />
    </article>
  );
}
