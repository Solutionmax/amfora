import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { directoriesConfig } from "../../config/directories.config";

const FILE = "background.webp";
export const BACKGROUND_MAX_BYTES = 3 * 1024 * 1024;

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
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image file");
    }

    const webp = await sharp(buffer)
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
