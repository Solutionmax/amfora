"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";

/** Read-only value in a mono field with a Copy button. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await copyText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(t("common.unexpectedError"));
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line-2 py-1 pl-3.5 pr-1">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 truncate bg-transparent font-mono text-[12.5px] text-ink-2 outline-none"
      />
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <IconCheck /> : <IconCopy />}
        {copied ? t("common.copied") : t("common.copy")}
      </Button>
    </div>
  );
}
