const IMAGE_TYPE = /^image\/[a-z0-9.+-]+$/i;

/** Decodes a `data:` URI. Only image types are accepted; anything else returns null. */
export function parseDataUri(value: string): { contentType: string; bytes: Buffer } | null {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(value);
  if (!match) {
    return null;
  }

  const [, contentType, isBase64, payload] = match;
  if (!IMAGE_TYPE.test(contentType)) {
    return null;
  }

  try {
    const bytes = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
    return bytes.length > 0 ? { contentType, bytes } : null;
  } catch {
    return null;
  }
}
