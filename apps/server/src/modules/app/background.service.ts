import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { directoriesConfig } from "../../config/directories.config";

const FILE = "background.webp";
export const BACKGROUND_MAX_BYTES = 3 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

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

/**
 * The public-page background lives as one file under the data directory, not as a
 * data URI in the database: it is measured in megabytes, and it is served to every
 * visitor of every public page.
 */
export class BackgroundService {
  private get file(): string {
    return path.join(directoriesConfig.branding, FILE);
  }

  async save(buffer: Buffer): Promise<void> {
    if (!isRasterImage(buffer)) {
      throw new Error("Only PNG, JPEG, WebP, GIF or AVIF images are allowed");
    }
    const metadata = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image file");
    }

    const webp = await sharp(buffer, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize({ width: 2400, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await fs.mkdir(directoriesConfig.branding, { recursive: true });
    await fs.writeFile(this.file, webp, { mode: 0o600 });
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.file);
      return true;
    } catch {
      return false;
    }
  }

  async read(): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.file);
    } catch {
      return null;
    }
  }

  async remove(): Promise<void> {
    await fs.rm(this.file, { force: true });
  }
}
