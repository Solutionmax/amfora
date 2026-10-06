import type { AxiosResponse } from "axios";

import type { ScanStatus } from "@/components/files/scan-status";

export type ShareAlias = {
  id: string;
  alias: string;
  shareId: string;
  createdAt: string;
  updatedAt: string;
} | null;

export interface ShareFile {
  id: string;
  name: string;
  description: string | null;
  extension: string;
  size: string;
  objectName: string;
  userId: string;
  folderId: string | null;
  scanStatus?: ScanStatus | null;
  scanDetail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShareFolder {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  totalSize: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    files: number;
    children: number;
  };
}

export interface ShareRecipient {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShareSecurity {
  maxViews: number | null;
  hasPassword: boolean;
}

export interface Share {
  id: string;
  name: string | null;
  description: string | null;
  expiration: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  security: ShareSecurity;
  files: ShareFile[];
  folders: ShareFolder[];
  recipients: ShareRecipient[];
  alias: ShareAlias;
  /** The group whose members may open the share. Null or absent: anyone with the link. */
  groupId?: string | null;
  group?: { id: string; name: string } | null;
  /** Email the maker on a download. Absent on old data: off. */
  notifyOnDownload?: boolean;
  /** Email the maker before the end date. Absent on old data: off. */
  remindBeforeExpiry?: boolean;
}

export interface SimpleShare {
  id: string;
  name: string;
  description: string | null;
}

export interface CreateShare201 {
  share: Share;
}

export interface UpdateShare200 {
  share: Share;
}

export interface UpdateSharePassword200 {
  share: Share;
}

export interface GetShare200 {
  share: Share;
}

export interface GetShareByAlias200 {
  share: Share;
}

export interface DeleteShare200 {
  share: Share;
}

export interface RemoveRecipients200 {
  share: Share;
}

export interface RemoveFiles200 {
  share: Share;
}

export interface AddRecipients200 {
  share: Share;
}

export interface AddFiles200 {
  share: SimpleShare;
}

export interface ListUserShares200 {
  shares: Share[];
}

export interface CreateShareAlias200 {
  alias: {
    id: string;
    alias: string;
    shareId: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface NotifyRecipients200 {
  message: string;
  notifiedRecipients: string[];
}

export interface CreateShareBody {
  name?: string;
  description?: string;
  expiration?: string;
  files?: string[];
  folders?: string[];
  password?: string;
  maxViews?: number | null;
  recipients?: string[];
  groupId?: string | null;
}

export interface UpdateShareBody {
  id: string;
  name?: string;
  description?: string;
  /** Left out keeps the end date, null clears it. */
  expiration?: string | null;
  password?: string;
  maxViews?: number | null;
  recipients?: string[];
  /** Left out keeps the group, null makes the share open to anyone with the link. */
  groupId?: string | null;
}

export interface UpdateSharePasswordBody {
  password: string | null;
}

export interface AddFilesBody {
  files: string[];
}

export interface RemoveFilesBody {
  files: string[];
}

export interface AddRecipientsBody {
  emails: string[];
}

export interface RemoveRecipientsBody {
  emails: string[];
}

export interface CreateShareAliasBody {
  alias: string;
}

export interface NotifyRecipientsBody {
  shareLink: string;
}

export interface GetShareParams {
  password?: string;
}

export interface GetShareByAliasParams {
  password?: string;
}

export type CreateShareResult = AxiosResponse<CreateShare201>;
export type UpdateShareResult = AxiosResponse<UpdateShare200>;
export type ListUserSharesResult = AxiosResponse<ListUserShares200>;
export type GetShareResult = AxiosResponse<GetShare200>;
export type DeleteShareResult = AxiosResponse<DeleteShare200>;
export type UpdateSharePasswordResult = AxiosResponse<UpdateSharePassword200>;
export type AddFilesResult = AxiosResponse<AddFiles200>;
export type RemoveFilesResult = AxiosResponse<RemoveFiles200>;
export type AddRecipientsResult = AxiosResponse<AddRecipients200>;
export type RemoveRecipientsResult = AxiosResponse<RemoveRecipients200>;
export type CreateShareAliasResult = AxiosResponse<CreateShareAlias200>;
export type GetShareByAliasResult = AxiosResponse<GetShareByAlias200>;
export type NotifyRecipientsResult = AxiosResponse<NotifyRecipients200>;
