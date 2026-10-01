"use client";

import { IconArrowsMove, IconDownload, IconShare, IconTrash, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BAR_BUTTON = "text-background/80 hover:bg-background/10 hover:text-background [&_svg]:text-current";

/** Floating bar with bulk actions; only shown while something is selected. */
export function SelectionBar({
  count,
  onShare,
  onDownload,
  onMove,
  onDelete,
  onClear,
}: {
  count: number;
  onShare?: () => void;
  onDownload?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onClear: () => void;
}) {
  const t = useTranslations();
  const visible = count > 0;
  const tab = visible ? 0 : -1;

  const actions = [
    { key: "share", icon: IconShare, label: t("common.share"), onClick: onShare },
    { key: "download", icon: IconDownload, label: t("files.calm.downloadZip"), onClick: onDownload },
    { key: "move", icon: IconArrowsMove, label: t("common.move"), onClick: onMove },
    { key: "delete", icon: IconTrash, label: t("common.delete"), onClick: onDelete },
  ].filter((a) => a.onClick);

  return (
    <div
      role="region"
      aria-label={t("files.calm.selectionActions")}
      aria-hidden={!visible}
      className={cn(
        "fixed bottom-5 left-4 right-4 z-40 mx-auto flex max-w-[708px] items-center gap-1 rounded-xl bg-ink py-2 pl-[18px] pr-2 text-background shadow-[0_18px_40px_-18px_rgba(14,32,54,.5)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(.16,1,.3,1)] lg:left-[232px]",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[140%] opacity-0"
      )}
    >
      <span className="mr-auto whitespace-nowrap font-medium" aria-live="polite">
        {t("files.calm.selected", { count })}
      </span>
      {actions.map(({ key, icon: Icon, label, onClick }) => (
        <Button
          key={key}
          variant="ghost"
          size="sm"
          className={BAR_BUTTON}
          onClick={onClick}
          tabIndex={tab}
          aria-label={label}
        >
          <Icon />
          <span className="hidden md:inline">{label}</span>
        </Button>
      ))}
      <Button
        variant="ghost"
        size="icon"
        className={BAR_BUTTON}
        onClick={onClear}
        tabIndex={tab}
        aria-label={t("files.calm.clearSelection")}
      >
        <IconX />
      </Button>
    </div>
  );
}
