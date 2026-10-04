import { escapeHtml } from "../../shared/escape-html";

/** A short email about something that happened to a link: one title, a few facts, one button. */
export interface Notice {
  subject: string;
  title: string;
  /** May carry the name of a link, which the maker typed: it is escaped. */
  text: string;
  rows: ReadonlyArray<readonly [label: string, value: string]>;
  button: { label: string; url: string };
  footer: string;
}

const DEFAULT_COLOR = "#0079d2";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Only a plain hex colour goes into a style attribute; anything else falls back. */
export function safeColor(color: string | undefined): string {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_COLOR;
}

/** Tables and inline styles on purpose: mail programs ignore most of everything else. */
export function noticeHtml(notice: Notice, brand: { appName: string; color?: string }): string {
  const color = safeColor(brand.color);
  const rows = notice.rows
    .map(
      ([label, value], index) => `
              <tr>
                <td style="padding: 10px 14px; font-size: 13px; color: #7a8696;${index ? " border-top: 1px solid #eceef1;" : ""}">${escapeHtml(label)}</td>
                <td align="right" style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #0e2036;${index ? " border-top: 1px solid #eceef1;" : ""}">${escapeHtml(value)}</td>
              </tr>`
    )
    .join("");

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
            <td style="padding: 16px 22px; border-bottom: 1px solid #eceef1; font-size: 15px; font-weight: 700; color: #0e2036;">${escapeHtml(brand.appName)}</td>
          </tr>
          <tr>
            <td style="padding: 24px 22px 22px;">
              <h1 style="margin: 0 0 12px; font-size: 21px; line-height: 1.2; color: #0e2036;">${escapeHtml(notice.title)}</h1>
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.55;">${escapeHtml(notice.text)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eceef1; border-radius: 12px; margin-bottom: 18px;">${rows}
              </table>
              <a href="${escapeHtml(notice.button.url)}" style="display: inline-block; padding: 11px 16px; border-radius: 9px; background-color: ${color}; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none;">${escapeHtml(notice.button.label)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 22px 18px; border-top: 1px solid #eceef1; font-size: 12px; line-height: 1.5; color: #7a8696;">${escapeHtml(notice.footer)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
