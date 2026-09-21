/**
 * Custom CSS is admin-only and pack-gated, but a stolen admin session must not turn it
 * into a loader for outside resources or a way out of the <style> element it lands in.
 */
export const CUSTOM_CSS_MAX_LENGTH = 20480;

/** Browsers decode `\75rl(` as `url(`; the filter has to see what the browser sees. */
function decodeCssEscapes(css: string): string {
  return css
    .replace(/\\([0-9a-fA-F]{1,6})[ \t\n]?/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/\\/g, "");
}

export function sanitizeCss(css: string): string {
  return decodeCssEscapes(css)
    .replace(/<!--|-->/g, "")
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/(behavior|-moz-binding)\s*:[^;}]*/gi, "")
    .replace(/url\(\s*(['"]?)(?!\/(?!\/)|data:image\/)[^)]*\1\s*\)/gi, "none")
    .replace(/</g, "\\3c ")
    .slice(0, CUSTOM_CSS_MAX_LENGTH);
}
