"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { SubHeading } from "@/components/ui/line-list";
import { CopyField } from "./copy-field";

interface MediaEmbedLinkProps {
  fileId: string;
}

export function MediaEmbedLink({ fileId }: MediaEmbedLinkProps) {
  const t = useTranslations();
  const [embedUrl, setEmbedUrl] = useState("");

  useEffect(() => {
    setEmbedUrl(`${window.location.origin}/e/${fileId}`);
  }, [fileId]);

  return (
    <section className="mt-5 grid gap-2 border-t border-line pt-4">
      <SubHeading>{t("embedCode.title")}</SubHeading>
      <CopyField value={embedUrl} label={t("embedCode.tabs.directLink")} />
      <p className="text-[12.5px] text-ink-3">{t("embedCode.directLinkDescription")}</p>
    </section>
  );
}
