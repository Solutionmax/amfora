import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { directoriesConfig } from "../../config/directories.config";

export const BRANDING_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const DISPLAY_WIDTH = 2400;
const LINK_PREVIEW_WIDTH = 1200;

/** The multipart content type is whatever the client says; the bytes are not. SVG is refused: it is a document, not a picture. */
export function isRasterImage(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 12);
  return (
    head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    head.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
    (head.subarray(0, 4).toString("latin1") === "RIFF" && head.subarray(8, 12).toString("latin1") === "WEBP") ||
    head.subarray(0, 4).toString("latin1") === "GIF8" ||
    (head.subarray(4, 8).toString("latin1") === "ftyp" && /^(avif|avis)/.test(head.subarray(8, 12).toString("latin1")))
  );
}

export interface BrandingImageOptions {
  /** File name without extension, under the branding directory. */
  name: string;
  /** Used in error messages, e.g. "Background image". */
  label: string;
  minWidth: number;
  /** Also keep a 1200 px JPEG for og:image; not every link unfurler reads WebP. */
  withLinkPreview?: boolean;
}

/** Size of the link preview rendition, plus a version that changes on every upload (for cache busting). */
export interface LinkPreviewInfo {
  width: number;
  height: number;
  version: string;
}

/**
 * An admin-uploaded picture that lives as a file under the data directory, not as a data
 * URI in the database: it is measured in megabytes, and it is served to every visitor of
 * every public page. The page gets a WebP; link unfurlers get a JPEG.
 */
export class BrandingImage {
  constructor(readonly options: BrandingImageOptions) {}

  private file(extension: "webp" | "jpg"): string {
    return path.join(directoriesConfig.branding, `${this.options.name}.${extension}`);
  }

  async save(buffer: Buffer): Promise<void> {
    const { label, minWidth, withLinkPreview } = this.options;
    if (!isRasterImage(buffer)) {
      throw new Error("Only PNG, JPEG, WebP, GIF or AVIF images are allowed");
    }
    const metadata = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image file");
    }
    if (metadata.width < minWidth) {
      throw new Error(`${label} too small. Use at least ${minWidth} pixels wide.`);
    }

    const source = () => sharp(buffer, { limitInputPixels: MAX_PIXELS }).rotate();
    const webp = await source()
      .resize({ width: DISPLAY_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const jpeg = withLinkPreview
      ? await source()
          .resize({ width: LINK_PREVIEW_WIDTH, withoutEnlargement: true })
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer()
      : null;

    await fs.mkdir(directoriesConfig.branding, { recursive: true });
    if (jpeg) {
      await fs.writeFile(this.file("jpg"), jpeg, { mode: 0o600 });
    }
    await fs.writeFile(this.file("webp"), webp, { mode: 0o600 });
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.file("webp"));
      return true;
    } catch {
      return false;
    }
  }

  async read(): Promise<Buffer | null> {
    return fs.readFile(this.file("webp")).catch(() => null);
  }

  async readLinkPreview(): Promise<Buffer | null> {
    if (!this.options.withLinkPreview) return null;
    return fs.readFile(this.file("jpg")).catch(() => null);
  }

  async linkPreviewInfo(): Promise<LinkPreviewInfo | null> {
    if (!this.options.withLinkPreview) return null;
    try {
      const file = this.file("jpg");
      const [stat, metadata] = await Promise.all([fs.stat(file), sharp(file).metadata()]);
      if (!metadata.width || !metadata.height) return null;
      return { width: metadata.width, height: metadata.height, version: Math.floor(stat.mtimeMs).toString(36) };
    } catch {
      return null;
    }
  }

  async remove(): Promise<void> {
    await fs.rm(this.file("webp"), { force: true });
    await fs.rm(this.file("jpg"), { force: true });
  }
}

/** Behind the public pages; paid, needs a brandpack to show. */
export const backgroundImage = new BrandingImage({ name: "background", label: "Background image", minWidth: 1200 });

/** Head of every download page and the first choice for og:image; free. */
export const shareCoverImage = new BrandingImage({
  name: "share-cover",
  label: "Cover image",
  minWidth: 600,
  withLinkPreview: true,
});

/** og:image when no cover is set; free. */
export const linkPreviewImage = new BrandingImage({
  name: "link-preview",
  label: "Link preview image",
  minWidth: 600,
  withLinkPreview: true,
});
