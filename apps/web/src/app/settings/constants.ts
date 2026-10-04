import { createTranslator } from "next-intl";

type Translator = ReturnType<typeof createTranslator>;

/** A settings row: one field full width, or two fields side by side. */
export type SettingsRow = string | readonly [string, string];

export interface SettingsBlock {
  /** Key under `settings.calm.blocks.<id>` for its title and description. */
  id: string;
  rows: readonly SettingsRow[];
}

/**
 * How each group is laid out in blocks. Keys that are not listed (and not hidden)
 * still show up, in a closing "More" block, so a new server setting is never lost.
 */
export const GROUP_LAYOUT: Record<string, readonly SettingsBlock[]> = {
  general: [
    { id: "brand", rows: ["appLogo", "appName", "appDescription"] },
    { id: "publicPages", rows: ["appPublicTheme", "appSharePlayback"] },
    { id: "behaviour", rows: ["showHomePage", "firstUserAccess", "hideVersion"] },
  ],
  security: [
    { id: "signingIn", rows: ["passwordAuthEnabled", ["passwordMinLength", "passwordResetTokenExpiration"]] },
    { id: "bruteForce", rows: [["maxLoginAttempts", "loginBlockDuration"]] },
    {
      id: "anonymousSecrets",
      rows: [
        "secretsAnonymousEnabled",
        ["secretsAnonymousMaxDays", "secretsAnonymousMaxOpens"],
        ["secretsAnonymousMaxLength", "secretsAnonymousPerHour"],
      ],
    },
    { id: "secrets", rows: [["secretsMaxDays", "secretsMaxOpens"]] },
  ],
  storage: [{ id: "limits", rows: ["maxFileSize", "maxTotalStoragePerUser"] }],
  email: [
    {
      id: "outgoing",
      rows: [
        "smtpEnabled",
        ["smtpHost", "smtpPort"],
        "smtpSecure",
        ["smtpUser", "smtpPass"],
        ["smtpFromName", "smtpFromEmail"],
        "smtpNoAuth",
        "smtpTrustSelfSigned",
      ],
    },
  ],
};

/** Order of the text tabs. Unknown groups go last. */
export const GROUP_ORDER: readonly string[] = ["general", "security", "storage", "email", "auth-providers"];

/** Fields that only make sense while sending email is on. */
export const SMTP_FIELDS: readonly string[] = [
  "smtpHost",
  "smtpPort",
  "smtpUser",
  "smtpPass",
  "smtpSecure",
  "smtpNoAuth",
  "smtpTrustSelfSigned",
  "smtpFromName",
  "smtpFromEmail",
];

/** Values stored in seconds, shown with a unit next to the input. */
/** Fields that only make sense while secrets without an account are allowed. */
export const ANONYMOUS_SECRET_FIELDS: readonly string[] = [
  "secretsAnonymousMaxDays",
  "secretsAnonymousMaxOpens",
  "secretsAnonymousMaxLength",
  "secretsAnonymousPerHour",
];
export const SECONDS_FIELDS: readonly string[] = ["loginBlockDuration", "passwordResetTokenExpiration"];

/** Keys that have no title in the shared messages; their text lives under `settings.calm.fields`. */
const CALM_FIELDS = ["appPublicTheme", "appSharePlayback", "appBrandpack", "authProvidersEnabled"];

function lookup(t: Translator, key: string, part: "title" | "description"): string | null {
  const calm = `settings.calm.fields.${key}.${part}`;
  const shared = `settings.fields.${key}.${part}`;

  if (CALM_FIELDS.includes(key) || t.has(calm)) return t(calm);
  if (t.has(shared)) return t(shared);

  return null;
}

/** Title of a setting, never a raw key: falls back to a readable version of the key itself. */
export function fieldTitle(t: Translator, key: string): string {
  return lookup(t, key, "title") ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

export function fieldDescription(t: Translator, key: string, fallback?: string): string | undefined {
  return lookup(t, key, "description") ?? fallback;
}

export function groupTitle(t: Translator, group: string): string {
  if (group === "auth-providers") return t("authProviders.title");
  if (t.has(`settings.groups.${group}.title`)) return t(`settings.groups.${group}.title`);

  return group;
}

/** Split a group's keys into the blocks above, plus a "more" block for anything unplaced. */
export function blocksFor(group: string, keys: readonly string[]): SettingsBlock[] {
  const layout = GROUP_LAYOUT[group] ?? [];
  const present = new Set(keys);
  const placed = new Set<string>();

  const blocks = layout
    .map((block) => {
      const rows = block.rows
        .map((row): SettingsRow | null => {
          if (typeof row === "string") return present.has(row) ? row : null;
          const [a, b] = row.filter((key) => present.has(key));
          if (a && b) return [a, b] as const;

          return a ?? null;
        })
        .filter((row): row is SettingsRow => row !== null);

      rows.forEach((row) => (typeof row === "string" ? [row] : row).forEach((key) => placed.add(key)));

      return { id: block.id, rows };
    })
    .filter((block) => block.rows.length > 0);

  const rest = keys.filter((key) => !placed.has(key));

  return rest.length > 0 ? [...blocks, { id: "more", rows: rest }] : blocks;
}
