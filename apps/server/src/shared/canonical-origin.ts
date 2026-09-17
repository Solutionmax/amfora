const LOCAL_APP_URL = "http://localhost:3000";

export function getCanonicalOrigin(): string {
  const configuredAppUrl = process.env.APP_URL?.trim();

  if (!configuredAppUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_URL must be configured in production before sending password reset emails");
    }

    return LOCAL_APP_URL;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredAppUrl);
  } catch {
    throw new Error("APP_URL must be a valid absolute HTTP(S) URL");
  }

  if (
    (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error("APP_URL must be a canonical HTTP(S) origin without credentials, path, query, or fragment");
  }

  return parsedUrl.origin;
}
