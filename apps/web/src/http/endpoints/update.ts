import type { AxiosResponse } from "axios";

import apiInstance from "@/config/api";

export interface UpdateStatus {
  currentVersion: string | null;
  latestVersion: string | null;
  notes: string;
  releasedAt: string;
  updateAvailable: boolean;
  checkedAt: string | null;
  checkError: string | null;
  canApply: boolean;
  applying: boolean;
  checkEnabled: boolean;
}

export const getUpdateStatus = (refresh = false): Promise<AxiosResponse<UpdateStatus>> =>
  apiInstance.get(`/api/update/status${refresh ? "?refresh=true" : ""}`);

export const applyUpdate = (): Promise<AxiosResponse<{ message: string }>> => apiInstance.post("/api/update/apply");
