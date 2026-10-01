export type ApiKeyScope = "read" | "full";

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scope: ApiKeyScope;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scope: ApiKeyScope;
  /** Left out for a key that never expires. */
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  /** The key itself. The server returns it only here. */
  token: string;
}
