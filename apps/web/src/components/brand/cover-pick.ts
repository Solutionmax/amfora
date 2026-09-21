import type { FileKind } from "./file-kind";

export interface CoverFile {
  name: string;
  kind: FileKind;
  previewUrl?: string;
}

/**
 * The panel opens with the first file. An image is its own cover; anything else gets
 * the accent gradient, because the app never sees video bytes and cannot make a frame.
 */
export function pickCover(files: CoverFile[]): { kind: "image" | "gradient"; file: CoverFile } | null {
  const [first] = files;
  if (!first) return null;
  return { kind: first.kind === "image" && first.previewUrl ? "image" : "gradient", file: first };
}
