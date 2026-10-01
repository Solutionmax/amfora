"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { SubHeading } from "@/components/ui/line-list";
import { cn } from "@/lib/utils";
import { CopyField } from "./copy-field";

interface EmbedCodeDisplayProps {
  imageUrl: string;
  fileName: string;
  fileId: string;
}

type Kind = "direct" | "html" | "bbcode";

export function EmbedCodeDisplay({ imageUrl, fileName, fileId }: EmbedCodeDisplayProps) {
  const t = useTranslations();
  const [kind, setKind] = useState<Kind>("direct");
  const [fullUrl, setFullUrl] = useState("");

  useEffect(() => {
    setFullUrl(`${window.location.origin}/e/${fileId}`);
  }, [fileId]);

  const directLink = fullUrl || imageUrl;
  const options: Record<Kind, { label: string; value: string; hint: string }> = {
    direct: { label: t("embedCode.tabs.directLink"), value: directLink, hint: t("embedCode.directLinkDescription") },
    html: {
      label: t("embedCode.tabs.html"),
      value: `<img src="${directLink}" alt="${fileName}" />`,
      hint: t("embedCode.htmlDescription"),
    },
    bbcode: {
      label: t("embedCode.tabs.bbcode"),
      value: `[img]${directLink}[/img]`,
      hint: t("embedCode.bbcodeDescription"),
    },
  };
  const current = options[kind];

  return (
    <section className="mt-5 grid gap-2.5 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <SubHeading>{t("embedCode.title")}</SubHeading>
        <div role="tablist" aria-label={t("embedCode.title")} className="flex gap-4 text-[13px]">
          {(Object.keys(options) as Kind[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={kind === key}
              onClick={() => setKind(key)}
              className={cn(
                "cursor-pointer border-b-2 border-transparent pb-0.5 font-medium text-ink-3 outline-none transition-colors hover:text-ink focus-visible:text-ink",
                kind === key && "border-ink font-semibold text-ink"
              )}
            >
              {options[key].label}
            </button>
          ))}
        </div>
      </div>
      <CopyField value={current.value} label={current.label} />
      <p className="text-[12.5px] text-ink-3">{current.hint}</p>
    </section>
  );
}
