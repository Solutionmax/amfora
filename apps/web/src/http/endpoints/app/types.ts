import type { AxiosResponse } from "axios";

export interface FileSizeInfo {
  bytes: number;
  kb: number;
  mb: number;
  gb: number;
}

export interface DiskSpaceInfo {
  diskSizeGB: number;
  diskUsedGB: number;
  diskAvailableGB: number;
  uploadAllowed: boolean;
}

export interface CheckHealth200 {
  status: string;
  timestamp: string;
}

export interface CheckUploadAllowed200 extends DiskSpaceInfo {
  fileSizeInfo: FileSizeInfo;
}

export type GetDiskSpace200 = DiskSpaceInfo;

/** The og:image rendition of an uploaded image; `version` changes on every upload. */
export interface LinkPreviewInfo {
  width: number;
  height: number;
  version: string;
}

export interface GetAppInfo200 {
  appName: string;
  appDescription: string;
  appPrimaryColor?: string;
  appFontFamily?: string;
  appRadius?: string;
  appHideCredit?: boolean;
  appBackground?: boolean;
  appCustomCss?: string;
  appShareCover?: LinkPreviewInfo | null;
  appLinkPreview?: LinkPreviewInfo | null;
  appSharePlayback?: boolean;
  brandpack?: { organisation: string; issuedAt: string } | null;
  appLogo: string;
  firstUserAccess: boolean;
}

export interface GetSystemInfo200 {
  storageProvider: "s3";
  s3Enabled: boolean;
}

export interface RemoveLogo200 {
  message: string;
}

export interface UploadLogo200 {
  logo: string;
}

export interface CheckUploadAllowedParams {
  fileSize: string;
}

export interface UploadLogoBody {
  file?: unknown;
}

export type GetAppInfoResult = AxiosResponse<GetAppInfo200>;
export type GetSystemInfoResult = AxiosResponse<GetSystemInfo200>;
export type UploadLogoResult = AxiosResponse<UploadLogo200>;
export type RemoveLogoResult = AxiosResponse<RemoveLogo200>;
export type CheckHealthResult = AxiosResponse<CheckHealth200>;
export type GetDiskSpaceResult = AxiosResponse<GetDiskSpace200>;
export type CheckUploadAllowedResult = AxiosResponse<CheckUploadAllowed200>;
