import apiInstance from "@/config/api";

export type SecretStatus = "waiting" | "used" | "expired" | "burned";

export interface Secret {
  id: string;
  label: string | null;
  status: SecretStatus;
  hasPassphrase: boolean;
  maxOpens: number;
  opens: number;
  expiresAt: string;
  lastOpenedAt: string | null;
  createdAt: string;
}

export interface SecretLimits {
  maxHours: number;
  maxOpens: number;
  maxLength: number;
}

export interface SecretLimitsResponse {
  anonymousEnabled: boolean;
  anonymous: SecretLimits;
  signedIn: SecretLimits;
}

export interface CreateSecretRequest {
  /** Sealed in the browser; see lib/secret-crypto. */
  ciphertext: string;
  proof: string;
  verifier: string;
  hasPassphrase: boolean;
  label?: string;
  expiresInHours: number;
  maxOpens: number;
}

export const getSecretLimits = async (): Promise<SecretLimitsResponse> =>
  (await apiInstance.get("/api/secrets/limits")).data;

export const listSecrets = async (): Promise<{ secrets: Secret[] }> => (await apiInstance.get("/api/secrets")).data;

export const createSecret = async (data: CreateSecretRequest): Promise<{ id: string; expiresAt: string }> =>
  (await apiInstance.post("/api/secrets", data)).data;

export const createAnonymousSecret = async (data: CreateSecretRequest): Promise<{ id: string; expiresAt: string }> =>
  (await apiInstance.post("/api/secrets/anonymous", data)).data;

export const deleteSecret = async (id: string): Promise<{ success: boolean }> =>
  (await apiInstance.delete(`/api/secrets/${encodeURIComponent(id)}`)).data;

export const getSecretStatus = async (id: string): Promise<{ hasPassphrase: boolean; opensLeft: number }> =>
  (await apiInstance.get(`/api/secrets/${encodeURIComponent(id)}/status`)).data;

export const openSecret = async (
  id: string,
  keys: { proof: string; verifier: string }
): Promise<{ ciphertext: string; opensLeft: number }> =>
  (await apiInstance.post(`/api/secrets/${encodeURIComponent(id)}/open`, keys)).data;

/** Administrators only. A number, because nobody can read or list these secrets. */
export const getSecretStats = async (): Promise<{ anonymousWaiting: number }> =>
  (await apiInstance.get("/api/secrets/stats")).data;
