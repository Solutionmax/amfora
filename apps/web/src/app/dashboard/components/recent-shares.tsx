import Link from "next/link";
import { IconChevronRight, IconCopy, IconLink, IconPlus, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { linkStatus, LinkTags } from "@/components/general/share-tags";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LineList, LineRow } from "@/components/ui/line-list";
import type { Share } from "@/http/endpoints/shares/types";
import { SectionHeading } from "./section-heading";

const SHOWN = 4;

export function isOpenShare(share: Share) {
  const status = linkStatus({ expiration: share.expiration });
  return status === "active" || status === "neverExpires";
}

/** Shares whose link still works: name, tags, Copy link and a way into the share. */
export function RecentShares({
  shares,
  onCopyLink,
  onCreateLink,
  onCreateShare,
}: {
  shares: Share[];
  onCopyLink: (share: Share) => void;
  onCreateLink: (share: Share) => void;
  onCreateShare: () => void;
}) {
  const t = useTranslations();
  const open = shares.filter(isOpenShare).slice(0, SHOWN);

  return (
    <section aria-labelledby="active-shares">
      <SectionHeading
        title={<span id="active-shares">{t("dashboard.calm.activeShares")}</span>}
        href="/shares"
        linkLabel={t("dashboard.calm.allShares")}
      />
      {open.length === 0 ? (
        <EmptyState
          className="border-t border-line py-10"
          icon={<IconShare />}
          title={t("dashboard.calm.noActiveShares")}
          description={t("dashboard.calm.noActiveSharesHint")}
          action={
            <Button variant="outline" onClick={onCreateShare}>
              <IconPlus />
              {t("dashboard.calm.newShare")}
            </Button>
          }
        />
      ) : (
        <LineList top>
          {open.map((share) => {
            const name = share.name || t("dashboard.calm.untitledShare");
            const items = (share.files?.length ?? 0) + (share.folders?.length ?? 0);
            return (
              <LineRow
                key={share.id}
                icon={<IconShare stroke={1.8} />}
                title={name}
                sub={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {t("dashboard.calm.shareMeta", { items, views: share.views ?? 0 })}
                    <span className="sm:hidden">
                      <LinkTags expiration={share.expiration} hasPassword={!!share.security?.hasPassword} />
                    </span>
                  </span>
                }
              >
                <span className="max-sm:hidden">
                  <LinkTags expiration={share.expiration} hasPassword={!!share.security?.hasPassword} />
                </span>
                {share.alias?.alias ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCopyLink(share)}
                    aria-label={t("dashboard.calm.copyLinkFor", { name })}
                  >
                    <IconCopy />
                    <span className="max-sm:hidden">{t("dashboard.calm.copyLink")}</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateLink(share)}
                    aria-label={t("dashboard.calm.createLinkFor", { name })}
                  >
                    <IconLink />
                    <span className="max-sm:hidden">{t("dashboard.calm.createLink")}</span>
                  </Button>
                )}
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/shares?id=${share.id}`} aria-label={t("dashboard.calm.openShare", { name })}>
                    <IconChevronRight />
                  </Link>
                </Button>
              </LineRow>
            );
          })}
        </LineList>
      )}
    </section>
  );
}
