import { escapeHtml } from "../../shared/escape-html";
import { CREDIT } from "./credit";
import { logoImg, type MailLogo } from "./logo";

/** A short email: one title, a line of text, a few facts, one button. Every mail the server sends has this shape. */
export interface Notice {
  subject: string;
  title: string;
  /** May carry the name of a link, which the maker typed: it is escaped. */
  text: string;
  rows?: ReadonlyArray<readonly [label: string, value: string]>;
  button?: { label: string; url: string };
  footer: string;
}

export interface MailBrand {
  appName: string;
  color?: string;
  logo?: MailLogo | null;
  /** Show "Powered by Amfora" under the card. */
  credit?: boolean;
}

const DEFAULT_COLOR = "#0079d2";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Only a plain hex colour goes into a style attribute; anything else falls back. */
export function safeColor(color: string | undefined): string {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_COLOR;
}

/** Tables and inline styles on purpose: mail programs ignore most of everything else. */
export function noticeHtml(notice: Notice, brand: MailBrand): string {
  const color = safeColor(brand.color);
  const credit = brand.credit
    ? `
        <p style="margin: 14px 0 0; font-size: 12px; color: #7a8696;">Powered by <a href="${CREDIT.url}" style="color: #7a8696; font-weight: 600; text-decoration: none;">${CREDIT.name}</a></p>`
    : "";
  const rows = (notice.rows ?? [])
    .map(
      ([label, value], index) => `
              <tr>
                <td style="padding: 10px 14px; font-size: 13px; color: #7a8696;${index ? " border-top: 1px solid #eceef1;" : ""}">${escapeHtml(label)}</td>
                <td align="right" style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #0e2036;${index ? " border-top: 1px solid #eceef1;" : ""}">${escapeHtml(value)}</td>
              </tr>`
    )
    .join("");

  const table = rows
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eceef1; border-radius: 12px; margin-bottom: 18px;">${rows}
              </table>`
    : "";
  const button = notice.button
    ? `<a href="${escapeHtml(notice.button.url)}" style="display: inline-block; padding: 11px 16px; border-radius: 9px; background-color: ${color}; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none;">${escapeHtml(notice.button.label)}</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(notice.subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f3ee; font-family: ${FONT}; color: #3a4a5c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f3ee; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 440px; background-color: #ffffff; border: 1px solid #eceef1; border-radius: 16px;">
          <tr>
            <td style="padding: 16px 22px; border-bottom: 1px solid #eceef1; font-size: 15px; font-weight: 700; color: #0e2036;">${logoImg(brand.logo ?? null, brand.appName)}${escapeHtml(brand.appName)}</td>
          </tr>
          <tr>
            <td style="padding: 24px 22px 22px;">
              <h1 style="margin: 0 0 12px; font-size: 21px; line-height: 1.2; color: #0e2036;">${escapeHtml(notice.title)}</h1>
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.55;">${escapeHtml(notice.text)}</p>
              ${table}
              ${button}
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 22px 18px; border-top: 1px solid #eceef1; font-size: 12px; line-height: 1.5; color: #7a8696;">${escapeHtml(notice.footer)}</td>
          </tr>
        </table>${credit}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** The same content as plain text, for programs and readers that show no HTML. */
export function noticeText(notice: Notice, brand: MailBrand): string {
  const lines = [brand.appName, "", notice.title, "", notice.text];
  if (notice.rows?.length) lines.push("", ...notice.rows.map(([label, value]) => `${label}: ${value}`));
  if (notice.button) lines.push("", `${notice.button.label}: ${notice.button.url}`);
  lines.push("", "--", notice.footer);
  if (brand.credit) lines.push("", `Powered by ${CREDIT.name}: ${CREDIT.url}`);
  return lines.join("\n");
}

/** Subject, html, text and attachments of a mail: the logo travels inside the message. */
export function noticeMessage(
  notice: Notice,
  brand: MailBrand
): { subject: string; html: string; text: string; attachments: MailLogo["attachment"][] } {
  return {
    subject: notice.subject,
    html: noticeHtml(notice, brand),
    text: noticeText(notice, brand),
    attachments: brand.logo ? [brand.logo.attachment] : [],
  };
}
