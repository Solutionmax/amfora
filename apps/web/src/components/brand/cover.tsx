"use client";

import { IconPlayerPlayFilled } from "@tabler/icons-react";

import { getFileIcon } from "@/utils/file-icons";
import type { CoverFile } from "./cover-pick";
import { pickCover } from "./cover-pick";

/**
 * Head of the download panel: the admin's cover image, or the accent gradient with the
 * first file's type icon. The play button only appears over a cover, and only when the
 * caller allows playing (`showPlay`); the gradient never gets one.
 */
export function Cover({
  files,
  caption,
  onOpen,
  coverSrc,
  showPlay = false,
  compact = false,
}: {
  files: CoverFile[];
  caption?: string;
  onOpen?: () => void;
  coverSrc?: string | null;
  showPlay?: boolean;
  compact?: boolean;
}) {
  const cover = pickCover(files, coverSrc);
  if (!cover) return null;

  const others = files.slice(1, 3);
  const Body = onOpen ? "button" : "div";
  const TypeIcon = getFileIcon(cover.file.name).icon;

  return (
    <Body
      type={onOpen ? "button" : undefined}
      onClick={onOpen}
      className={`relative block w-full overflow-hidden text-left text-white ${compact ? "aspect-[16/6]" : "aspect-[16/8]"} ${onOpen ? "cursor-pointer" : ""}`}
      style={{
        background:
          cover.kind === "image"
            ? undefined
            : "linear-gradient(135deg, var(--primary) 0%, color-mix(in oklab, var(--primary) 45%, #0c1626) 100%)",
      }}
      aria-label={caption}
    >
      {cover.kind === "image" && <img alt="" src={cover.src} className="absolute inset-0 size-full object-cover" />}
      <span
        className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"
        aria-hidden="true"
      />
      {cover.kind === "gradient" && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <TypeIcon className={`opacity-90 ${compact ? "size-8" : "size-16"}`} strokeWidth={1.25} />
        </span>
      )}
      {cover.kind === "image" && showPlay && onOpen && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span
            className={`flex items-center justify-center rounded-full border border-white/40 bg-white/20 backdrop-blur-md ${compact ? "size-8" : "size-14"}`}
          >
            <IconPlayerPlayFilled className={compact ? "size-3" : "size-5"} />
          </span>
        </span>
      )}
      {others.length > 0 && !compact && (
        <span className="absolute right-4 top-4 flex gap-1.5" aria-hidden="true">
          {others.map((file) => {
            const Icon = getFileIcon(file.name).icon;
            return (
              <span
                key={file.name}
                className="flex size-9 items-center justify-center rounded-lg border border-white/35 bg-white/20 backdrop-blur-sm"
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
            );
          })}
        </span>
      )}
      {caption && (
        <span
          className={`absolute bottom-0 left-0 right-0 flex items-center gap-2.5 truncate ${compact ? "p-2.5 text-[10px]" : "p-4 text-xs"}`}
        >
          <b className="truncate font-semibold">{cover.file.name}</b>
          <span className="opacity-85">{caption}</span>
        </span>
      )}
    </Body>
  );
}
