export type FileKind = "video" | "image" | "document" | "archive" | "other";

const KINDS: Record<Exclude<FileKind, "other">, string[]> = {
  video: ["mp4", "mov", "webm", "mkv", "avi", "m4v"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "heic", "bmp", "tif", "tiff"],
  document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "rtf", "csv", "odt", "ods", "odp"],
  archive: ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz", "dmg", "iso"],
};

/** Coarse type used for the coloured tiles and the cover. Everything unknown is "other". */
export function kindFromName(name: string): FileKind {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  for (const [kind, exts] of Object.entries(KINDS) as [FileKind, string[]][]) {
    if (exts.includes(ext)) return kind;
  }
  return "other";
}

export const TILE_CLASS: Record<FileKind, string> = {
  video: "tile-v",
  document: "tile-d",
  archive: "tile-z",
  image: "tile-i",
  other: "",
};
