import { randomUUID } from "node:crypto";
import sharp from "sharp";

import { escapeHtml } from "../../shared/escape-html";

/** Formats the installation may store. An SVG is left out on purpose: most mail programs draw nothing for it. */
const MAIL_IMAGE = /^data:image\/(?:png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/;
const LOGO_HEIGHT_PX = 32;
const MAX_LOGO_BYTES = 256 * 1024;

export interface MailLogo {
  cid: string;
  width: number;
  height: number;
  attachment: { filename: string; content: Buffer; contentType: string; cid: string; contentDisposition: "inline" };
}

interface Converted {
  png: Buffer;
  width: number;
}

const MAX_LOGO_PIXELS = 4_000_000;

// The last converted logo, so a burst of mails converts it once. The stored value is the key and
// the promise is kept, so a conversion in progress is shared and a failure is remembered too.
let converted: { stored: string; result: Promise<Converted | null> } | null = null;

async function convert(bytes: Buffer): Promise<Converted | null> {
  try {
    const { data, info } = await sharp(bytes, { limitInputPixels: MAX_LOGO_PIXELS, failOn: "error" })
      .resize({ height: LOGO_HEIGHT_PX * 2, withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true });
    return { png: data, width: Math.round((info.width / info.height) * LOGO_HEIGHT_PX) };
  } catch (error) {
    console.error("Could not prepare the logo for email:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Stored images are WebP, which Outlook on Windows does not show; a mail carries PNG. */
function toPng(stored: string, bytes: Buffer): Promise<Converted | null> {
  if (converted?.stored !== stored) converted = { stored, result: convert(bytes) };
  return converted.result;
}

/** The installation logo, as stored (a data address), turned into an inline PNG attachment. Null: keep the name as text. */
export async function mailLogo(stored: string | null | undefined): Promise<MailLogo | null> {
  const match = MAIL_IMAGE.exec(stored ?? "");
  if (!match) return null;
  // Whatever is wrong with the logo, the mail goes out without it.
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length === 0 || bytes.length > MAX_LOGO_BYTES) return null;
  const result = await toPng(stored as string, bytes);
  if (!result) return null;
  const cid = `logo-${randomUUID()}@amfora`;
  return {
    cid,
    width: Math.max(result.width, 1),
    height: LOGO_HEIGHT_PX,
    attachment: {
      filename: "logo.png",
      content: result.png,
      contentType: "image/png",
      cid,
      contentDisposition: "inline",
    },
  };
}

/** The image tag in front of the name in the header; empty without a logo. */
export function logoImg(logo: MailLogo | null, alt: string): string {
  return logo
    ? `<img src="cid:${logo.cid}" alt="${escapeHtml(alt)}" width="${logo.width}" height="${logo.height}" style="display: inline-block; vertical-align: middle; margin: 0 10px 0 0; border: 0;">`
    : "";
}
