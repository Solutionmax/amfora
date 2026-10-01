import apiInstance from "@/config/api";
import type { ApiKey, CreateApiKeyRequest, CreateApiKeyResponse } from "./types";

export const listApiKeys = async (): Promise<{ apiKeys: ApiKey[] }> => {
  const response = await apiInstance.get("/api/api-keys");
  return response.data;
};

export const createApiKey = async (data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> => {
  const response = await apiInstance.post("/api/api-keys", data);
  return response.data;
};

export const deleteApiKey = async (id: string): Promise<{ success: boolean }> => {
  const response = await apiInstance.delete(`/api/api-keys/${id}`);
  return response.data;
};

export * from "./types";
