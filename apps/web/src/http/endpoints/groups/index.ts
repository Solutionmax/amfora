import type { AxiosRequestConfig, AxiosResponse } from "axios";

import apiInstance from "@/config/api";

export interface GroupMember {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  shareCount: number;
  members: GroupMember[];
}

export interface PickableGroup {
  id: string;
  name: string;
}

export interface SharedWithMe {
  id: string;
  name: string | null;
  alias: string;
  expiration: string | null;
  createdAt: string;
  owner: { firstName: string; lastName: string } | null;
  group: { id: string; name: string };
}

export interface GroupBody {
  name?: string;
  description?: string;
}

type Options = AxiosRequestConfig;

export const listGroups = (options?: Options): Promise<AxiosResponse<{ groups: Group[] }>> =>
  apiInstance.get("/api/groups", options);

export const listPickableGroups = (options?: Options): Promise<AxiosResponse<{ groups: PickableGroup[] }>> =>
  apiInstance.get("/api/groups/pickable", options);

export const createGroup = (body: GroupBody, options?: Options): Promise<AxiosResponse<{ group: Group }>> =>
  apiInstance.post("/api/groups", body, options);

export const updateGroup = (id: string, body: GroupBody, options?: Options): Promise<AxiosResponse<{ group: Group }>> =>
  apiInstance.patch(`/api/groups/${encodeURIComponent(id)}`, body, options);

export const deleteGroup = (id: string, options?: Options): Promise<AxiosResponse<{ success: boolean }>> =>
  apiInstance.delete(`/api/groups/${encodeURIComponent(id)}`, options);

export const addGroupMember = (
  id: string,
  userId: string,
  options?: Options
): Promise<AxiosResponse<{ group: Group }>> =>
  apiInstance.post(`/api/groups/${encodeURIComponent(id)}/members`, { userId }, options);

export const removeGroupMember = (
  id: string,
  userId: string,
  options?: Options
): Promise<AxiosResponse<{ group: Group }>> =>
  apiInstance.delete(`/api/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, options);

export const listSharedWithMe = (options?: Options): Promise<AxiosResponse<{ shares: SharedWithMe[] }>> =>
  apiInstance.get("/api/shares/shared-with-me", options);
