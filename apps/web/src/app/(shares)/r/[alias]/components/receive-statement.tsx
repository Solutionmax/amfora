"use client";

import { useTranslations } from "next-intl";

import { StageStory, type StageFact } from "@/components/brand/stage-shell";
import { useAppInfo } from "@/contexts/app-info-context";
import { formatFileSize } from "@/utils/format-file-size";
import type { ReverseShareInfo } from "../types";

/** Left side of a receive link: who is asking, what for, and the limits. */
export function ReceiveStatement({ reverseShare }: { reverseShare: ReverseShareInfo | null }) {
  const t = useTranslations();
  const { appName } = useAppInfo();
  const owner = reverseShare?.name || appName;

  const facts: StageFact[] = reverseShare
    ? [
        ...(reverseShare.maxFileSize
          ? [{ label: t("public.stage.maxSize"), value: formatFileSize(reverseShare.maxFileSize) }]
          : []),
        ...(reverseShare.maxFiles ? [{ label: t("public.stage.perUpload"), value: reverseShare.maxFiles }] : []),
        { label: t("public.stage.transfer"), value: t("public.stage.encrypted") },
      ]
    : [];

  return (
    <StageStory
      eyebrow={t("public.receive.eyebrow")}
      headline={`${t("public.receive.title")} ${t("public.receive.accent", { name: owner })}`}
      text={reverseShare?.description}
      facts={facts}
    />
  );
}
