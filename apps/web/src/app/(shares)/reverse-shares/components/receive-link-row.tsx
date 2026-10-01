"use client";

import { IconCopy, IconExternalLink, IconLink, IconQrcode } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { reverseShareUrl, type ReverseShare } from "../hooks/use-reverse-shares";

/** The public upload link in mono, with QR, open and copy. Without an alias it offers to make one. */
export function ReceiveLinkRow({
  reverseShare,
  onCopyLink,
  onViewQrCode,
  onCreateLink,
}: {
  reverseShare: ReverseShare;
  onCopyLink: () => void;
  onViewQrCode: () => void;
  onCreateLink: () => void;
}) {
  const t = useTranslations();
  const url = reverseShareUrl(reverseShare);
  const alias = reverseShare.alias?.alias;

  if (!url || !alias) {
    return (
      <div className="mb-3 mt-[26px] flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed border-line-2 py-2 pl-4 pr-2">
        <p className="min-w-0 flex-1 text-[13px] text-ink-3">{t("reverseShares.calm.noLinkHint")}</p>
        <Button variant="outline" size="sm" onClick={onCreateLink}>
          <IconLink />
          {t("reverseShares.card.createLink")}
        </Button>
      </div>
    );
  }

  const host = url.slice(0, url.length - alias.length - "/r/".length).replace(/^https?:\/\//, "");

  return (
    <div className="mb-3 mt-[26px] flex items-center gap-1 rounded-xl border border-line-2 py-1.5 pl-4 pr-1.5">
      <code className="mono min-w-0 flex-1 truncate text-[13px] text-ink-3" title={url}>
        <span className="max-sm:hidden">{host}</span>/r/
        <b className="font-medium text-ink">{alias}</b>
      </code>
      <Button variant="ghost" size="icon" onClick={onViewQrCode} aria-label={t("reverseShares.card.viewQrCode")}>
        <IconQrcode />
      </Button>
      <Button variant="ghost" size="icon" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={t("reverseShares.card.openInNewTab")}>
          <IconExternalLink />
        </a>
      </Button>
      <Button variant="outline" size="sm" className="ml-1" onClick={onCopyLink}>
        <IconCopy />
        {t("reverseShares.calm.copyLink")}
      </Button>
    </div>
  );
}
