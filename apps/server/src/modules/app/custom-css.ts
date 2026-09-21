/** Custom CSS is admin-only and pack-gated, but a stolen admin session must not turn it into a loader for outside resources. */
export const CUSTOM_CSS_MAX_LENGTH = 20480;

export function sanitizeCss(css: string): string {
  return css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/behavior\s*:[^;}]*/gi, "")
    .replace(/url\(\s*(['"]?)(?!\/(?!\/)|data:image\/)[^)]*\1\s*\)/gi, "none")
    .slice(0, CUSTOM_CSS_MAX_LENGTH);
}
