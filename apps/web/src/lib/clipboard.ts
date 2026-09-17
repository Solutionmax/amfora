/**
 * Copy text from both secure and plain HTTP contexts.
 *
 * Clipboard API access is commonly unavailable on an IP address served over
 * HTTP. The selection fallback still works when called from a user gesture.
 */
export async function copyText(text: string): Promise<void> {
  if (typeof navigator === "undefined" || typeof document === "undefined") {
    throw new Error("Clipboard is unavailable outside a browser");
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the selection-based copy for blocked permissions and HTTP contexts.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";

  if (!document.body) {
    throw new Error("Clipboard fallback is unavailable");
  }

  const previousActiveElement = document.activeElement as HTMLElement | null;
  const focusScope = previousActiveElement?.closest('[role="dialog"], [role="menu"]');
  const target = focusScope || document.body;

  target.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    target.removeChild(textarea);
    previousActiveElement?.focus({ preventScroll: true });
  }

  if (!copied) {
    throw new Error("Could not copy text");
  }
}
