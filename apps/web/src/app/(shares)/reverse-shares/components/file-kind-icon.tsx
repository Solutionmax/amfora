import { IconFile, IconFileText, IconFileZip, IconMovie, IconPhoto } from "@tabler/icons-react";

import { kindFromName, type FileKind } from "@/components/brand/file-kind";

const ICONS: Record<FileKind, typeof IconFile> = {
  video: IconMovie,
  image: IconPhoto,
  document: IconFileText,
  archive: IconFileZip,
  other: IconFile,
};

/** Grey outline icon for a file name; no coloured tiles. */
export function FileKindIcon({ name }: { name: string }) {
  const Icon = ICONS[kindFromName(name)];
  return <Icon className="size-[17px] text-ink-icon" stroke={1.8} aria-hidden="true" />;
}
