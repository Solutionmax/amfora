"use client";

import { IconLock, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Chip, Statement } from "@/components/brand/statement";
import { useAppInfo } from "@/contexts/app-info-context";
import { formatFileSize } from "@/utils/format-file-size";
import type { ReverseShareInfo } from "../types";

/** Left column of a receive link: who is asking, what for, and the limits. */
export function ReceiveStatement({ reverseShare }: { reverseShare: ReverseShareInfo | null }) {
  const t = useTranslations();
  const { appName } = useAppInfo();
  const owner = reverseShare?.name || appName;

  return (
    <Statement
      eyebrow={t("public.receive.eyebrow")}
      title={t("public.receive.title")}
      accentLine={t("public.receive.accent", { name: owner })}
      quote={reverseShare?.description || undefined}
      chips={
        reverseShare && (
          <>
            {reverseShare.maxFileSize ? (
              <Chip icon={<IconUpload />}>
                {t("public.receive.limits.size", { size: formatFileSize(reverseShare.maxFileSize) })}
              </Chip>
            ) : null}
            {reverseShare.maxFiles ? (
              <Chip>{t("public.receive.limits.files", { count: reverseShare.maxFiles })}</Chip>
            ) : null}
            <Chip icon={<IconLock />}>{t("public.receive.limits.encrypted")}</Chip>
          </>
        )
      }
    />
  );
}
