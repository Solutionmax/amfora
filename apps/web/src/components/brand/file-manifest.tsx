"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { getFileIcon } from "@/utils/file-icons";
import { formatFileSize } from "@/utils/format-file-size";
import { TILE_CLASS, type FileKind } from "./file-kind";

export interface ManifestItem {
  id: string;
  name: string;
  size?: number;
  kind: FileKind;
  subline?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  trailing?: ReactNode;
  progress?: number;
}

/** The file list as a manifest: type tile, name and subline, size in mono, dashed total line. */
export function FileManifest({
  items,
  total,
  compact = false,
  className,
}: {
  items: ManifestItem[];
  total?: { label: ReactNode; size?: number };
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((item) => {
          const Icon = getFileIcon(item.name).icon;
          const row = (
            <>
              <span className={cn("tile", compact && "tile-sm", TILE_CLASS[item.kind])}>
                {item.icon ?? <Icon className={compact ? "size-4" : "size-5"} strokeWidth={1.75} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{item.name}</span>
                {item.subline && <span className="block text-xs text-ink-3">{item.subline}</span>}
              </span>
              {item.trailing ?? (
                <span className="mono text-[13px] text-ink-2">
                  {item.size !== undefined ? formatFileSize(item.size) : ""}
                </span>
              )}
            </>
          );
          return (
            <li
              key={item.id}
              className={cn(
                "grid items-center gap-3.5 border-b border-line last:border-b-0",
                compact ? "grid-cols-[32px_1fr_auto] py-2" : "grid-cols-[40px_1fr_auto] py-[11px]"
              )}
            >
              {item.onClick ? (
                <button type="button" onClick={item.onClick} className="contents text-left">
                  {row}
                </button>
              ) : (
                row
              )}
              {item.progress !== undefined && (
                <span className="col-span-full -mt-1 block h-[3px] overflow-hidden rounded-sm bg-surface-2">
                  <span
                    className="block h-full bg-primary transition-[width]"
                    style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {total && (
        <div className="mt-1 flex items-center justify-between border-t border-dashed border-line-2 pt-3.5 text-[13px] text-ink-3">
          <span>{total.label}</span>
          {total.size !== undefined && (
            <b className="mono text-sm font-medium text-ink">{formatFileSize(total.size)}</b>
          )}
        </div>
      )}
    </div>
  );
}
