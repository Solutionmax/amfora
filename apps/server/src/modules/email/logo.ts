import { randomUUID } from "node:crypto";

/** Formats mail programs show. An SVG is left out on purpose: most of them draw nothing for it. */
const MAIL_IMAGE = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/;
const LOGO_SIZE_PX = 40;

export interface MailLogo {
  cid: string;
  attachment: { filename: string; content: Buffer; contentType: string; cid: string; contentDisposition: "inline" };
}

/** The installation logo, as stored (a data address), turned into an inline attachment. Null: keep the name as text. */
export function mailLogo(stored: string | null | undefined): MailLogo | null {
  const match = MAIL_IMAGE.exec(stored ?? "");
  if (!match) return null;
  const cid = `logo-${randomUUID()}@amfora`;
  const contentType = match[1];
  return {
    cid,
    attachment: {
      filename: `logo.${contentType.slice("image/".length)}`,
      content: Buffer.from(match[2], "base64"),
      contentType,
      cid,
      contentDisposition: "inline",
    },
  };
}

/** The image tag for the top of a mail; empty without a logo. */
export function logoImg(logo: MailLogo | null): string {
  return logo
    ? `<img src="cid:${logo.cid}" alt="" width="${LOGO_SIZE_PX}" height="${LOGO_SIZE_PX}" style="display: block; margin: 0 auto 10px; border: 0;">`
    : "";
}
