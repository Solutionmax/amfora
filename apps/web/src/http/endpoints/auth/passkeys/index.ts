import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

import apiInstance from "@/config/api";
import type { LoginUser } from "../types";

export interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const listPasskeys = async (): Promise<Passkey[]> =>
  (await apiInstance.get<{ passkeys: Passkey[] }>("/api/auth/passkeys")).data.passkeys;

export const getPasskeyRegistrationOptions = async (password: string) =>
  (await apiInstance.post<PublicKeyCredentialCreationOptionsJSON>("/api/auth/passkeys/register/options", { password }))
    .data;

export const verifyPasskeyRegistration = async (response: RegistrationResponseJSON, name: string) =>
  (await apiInstance.post<Pick<Passkey, "id" | "name">>("/api/auth/passkeys/register/verify", { response, name })).data;

export const removePasskey = async (id: string, password: string) =>
  apiInstance.post(`/api/auth/passkeys/${encodeURIComponent(id)}/remove`, { password });

export const getPasskeyLoginOptions = async () =>
  (await apiInstance.post<PublicKeyCredentialRequestOptionsJSON>("/api/auth/passkeys/login/options", {})).data;

export const verifyPasskeyLogin = async (response: AuthenticationResponseJSON) =>
  (await apiInstance.post<{ user: LoginUser }>("/api/auth/passkeys/login/verify", { response })).data;
