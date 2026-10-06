"use client";

import { useTranslations } from "next-intl";

import { usePublicPreview } from "@/components/brand/public-preview";
import type { PublicStory } from "@/components/brand/public-shell";
import type { StageFact } from "@/components/brand/stage-shell";
import { useAppInfo } from "@/contexts/app-info-context";
import { formatFileSize } from "@/utils/format-file-size";
import type { ReverseShareInfo } from "../types";

/** What a receive link says: who is asking, what for, and the limits. */
export function useReceiveStory(reverseShare: ReverseShareInfo | null): PublicStory {
  const t = useTranslations();
  const { appName: storedName } = useAppInfo();
  // The preview under Customization shows the name that is being typed, not the saved one.
  const appName = usePublicPreview()?.name ?? storedName;

  const facts: StageFact[] = reverseShare
    ? [
        ...(reverseShare.maxFileSize
          ? [{ label: t("public.stage.maxSize"), value: formatFileSize(reverseShare.maxFileSize) }]
          : []),
        ...(reverseShare.maxFiles ? [{ label: t("public.stage.perUpload"), value: reverseShare.maxFiles }] : []),
        { label: t("public.stage.transfer"), value: t("public.stage.encrypted") },
      ]
    : [];

  const headline = `${t("public.receive.title")} ${t("public.receive.accent", { name: appName })}`;
  return {
    // The link's own name is a title; the files go to the organisation.
    eyebrow: reverseShare?.name || t("public.receive.eyebrow"),
    headline,
    title: headline,
    text: reverseShare?.description,
    facts,
  };
}
