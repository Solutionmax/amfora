"use client";

import type { ReactNode } from "react";
import {
  IconCopy,
  IconExternalLink,
  IconEye,
  IconInfoCircle,
  IconLock,
  IconShieldLock,
  IconTrash,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import { SecretTags } from "@/components/secrets/secret-tags";
import { Button } from "@/components/ui/button";
import { Fact, Facts } from "@/components/ui/facts";
import { LineList, LineRow, SubHeading } from "@/components/ui/line-list";
import type { Secret } from "@/http/endpoints/secrets";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

function Note({ title, children, quiet }: { title: string; children: ReactNode; quiet?: boolean }) {
  return (
    <div
      className={cn(
        "mt-[22px] flex items-start gap-3 rounded-xl px-[15px] py-[13px] text-[13px] text-ink-2",
        quiet ? "bg-surface-2 [&>svg]:text-ink-icon" : "bg-primary-soft [&>svg]:text-primary"
      )}
    >
      <IconInfoCircle className="mt-0.5 size-[17px] shrink-0" stroke={1.8} aria-hidden="true" />
      <p>
        <b className="block font-semibold text-ink">{title}</b>
        {children}
      </p>
    </div>
  );
}

/** Right column: one secret. The link shows only right after making it, the text never. */
export function SecretDetail({
  secret,
  freshLink,
  onDelete,
}: {
  secret: Secret;
  /** Set only for the secret made in this tab a moment ago. */
  freshLink: string | null;
  onDelete: (secret: Secret) => void;
}) {
  const t = useTranslations("secrets");
  const format = useFormatter();
  const isWaiting = secret.status === "waiting";

  const day = (value: string) => format.dateTime(new Date(value), { day: "numeric", month: "short" });
  const moment = (value: string) =>
    format.dateTime(new Date(value), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  const copy = async () => {
    if (!freshLink) return;
    try {
      await copyText(freshLink);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const openedText = () => {
    if (secret.status === "burned") return t("burnedText");
    if (!secret.lastOpenedAt) return isWaiting ? t("notOpened") : t("neverOpened");
    const last = t("lastOpened", { when: moment(secret.lastOpenedAt) });
    const next = isWaiting
      ? t("leftThenDestroyed", { count: secret.maxOpens - secret.opens })
      : t("destroyedAfterLast");
    return `${last} ${next}`;
  };

  // Shown without its scheme, like the link of a share; the copy button takes the whole address.
  const [linkBase, linkKey] = (freshLink ?? "").replace(/^https?:\/\//, "").split("#");

  return (
    <article>
      <header>
        <h2 className="break-words font-display text-[26px] font-bold leading-[1.15] tracking-[-0.02em] lg:text-[30px]">
          {secret.label || t("untitled")}
        </h2>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-ink-3">
          <SecretTags secret={secret} />
          <span>· {t("created", { date: day(secret.createdAt) })}</span>
        </p>
      </header>

      {freshLink ? (
        <>
          <Note title={t("copyNowTitle")}>{t("copyNowText")}</Note>
          <div className="mb-3 mt-3.5 flex items-center gap-1.5 rounded-xl border border-line-2 py-1.5 pl-4 pr-1.5">
            <code
              data-testid="secret-link"
              className="min-w-0 flex-1 truncate font-mono text-[13.5px] font-medium text-ink-3"
            >
              {linkBase}#<b className="font-medium text-ink">{linkKey}</b>
            </code>
            <Button variant="ghost" size="icon" aria-label={t("openPage")} asChild>
              <a href={freshLink} target="_blank" rel="noopener noreferrer">
                <IconExternalLink />
              </a>
            </Button>
            <Button variant="outline" onClick={() => void copy()}>
              <IconCopy />
              <span className="max-sm:sr-only">{t("copyLink")}</span>
            </Button>
          </div>
        </>
      ) : isWaiting ? (
        <Note title={t("linkGoneTitle")} quiet>
          {t("linkGoneText")}
        </Note>
      ) : (
        <Note title={t("textGoneTitle")} quiet>
          {t("textGoneText")}
        </Note>
      )}

      <Facts className="mb-[34px] mt-[30px] [&_dd.font-display]:text-[22px]">
        <Fact label={t("facts.status")} value={t(`status.${secret.status}`)} />
        <Fact
          label={secret.status === "expired" ? t("facts.expired") : t("facts.expires")}
          value={day(secret.expiresAt)}
        />
        <Fact label={t("facts.opened")} value={t("opensOf", { opens: secret.opens, max: secret.maxOpens })} />
      </Facts>

      <section>
        <SubHeading>{t("access")}</SubHeading>
        <LineList top className="mt-1.5">
          <LineRow
            icon={<IconLock stroke={1.8} />}
            title={t("form.passphrase")}
            sub={secret.hasPassphrase ? t("passphraseOn") : t("passphraseOff")}
          >
            <span className="text-[13px] text-ink-2">{secret.hasPassphrase ? t("on") : t("off")}</span>
          </LineRow>
          <LineRow icon={<IconEye stroke={1.8} />} title={t("facts.opened")} sub={openedText()}>
            <span className="text-[13px] tabular-nums text-ink-2">
              {t("opensOf", { opens: secret.opens, max: secret.maxOpens })}
            </span>
          </LineRow>
          <LineRow icon={<IconShieldLock stroke={1.8} />} title={t("encryption")} sub={t("encryptionText")}>
            <span className="text-[13px] text-ink-2">{t("endToEnd")}</span>
          </LineRow>
        </LineList>
      </section>

      <div className="mt-10">
        <Button variant="destructive" onClick={() => onDelete(secret)}>
          <IconTrash />
          {isWaiting ? t("delete") : t("deleteRecord")}
        </Button>
      </div>
    </article>
  );
}
