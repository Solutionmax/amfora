"use client";

import { Fragment, useState } from "react";
import { IconArrowLeft, IconChevronRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DroppedItem {
  id: string;
  type: "file" | "folder";
  name: string;
}

interface Crumb {
  id: string;
  name: string;
}

/** "My Files / Clients / Acme" with a back button; every crumb except the current one accepts dropped items. */
export function FolderCrumbs({
  path,
  onNavigate,
  onDropItems,
}: {
  path: Crumb[];
  onNavigate: (folderId?: string) => void;
  onDropItems: (items: DroppedItem[], target: Crumb | null) => void;
}) {
  const t = useTranslations();
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const crumbs: (Crumb & { isRoot?: boolean })[] = [{ id: "root", name: t("files.pageTitle"), isRoot: true }, ...path];
  const parent = path.length > 1 ? path[path.length - 2] : undefined;

  const dropHandlers = (crumb: Crumb & { isRoot?: boolean }) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDropTarget(crumb.id);
    },
    onDragLeave: () => setDropTarget(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTarget(null);
      try {
        const items = JSON.parse(e.dataTransfer.getData("text/plain")) as DroppedItem[];
        if (Array.isArray(items) && items.length > 0) onDropItems(items, crumb.isRoot ? null : crumb);
      } catch {
        // Not something dragged from the file list.
      }
    },
  });

  return (
    <nav aria-label={t("files.calm.location")} className="flex min-w-0 items-center gap-1.5">
      {path.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
          aria-label={t("files.calm.upOneLevel")}
          onClick={() => onNavigate(parent?.id)}
        >
          <IconArrowLeft />
        </Button>
      )}
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-ink-3">
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.id}>
              {index > 0 && <IconChevronRight size={14} aria-hidden className="shrink-0 text-ink-icon" />}
              <li className="min-w-0">
                {isCurrent ? (
                  <span aria-current="page" className="block max-w-[16rem] truncate font-semibold text-ink">
                    {crumb.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "block max-w-[12rem] cursor-pointer truncate rounded-md px-1 -mx-1 outline-none transition-colors hover:text-ink focus-visible:ring-[3px] focus-visible:ring-primary/35",
                      dropTarget === crumb.id && "bg-primary-soft text-primary"
                    )}
                    onClick={() => onNavigate(crumb.isRoot ? undefined : crumb.id)}
                    {...dropHandlers(crumb)}
                  >
                    {crumb.name}
                  </button>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
