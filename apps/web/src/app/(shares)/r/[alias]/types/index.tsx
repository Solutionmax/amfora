import { GetReverseShareForUploadResult } from "@/http/endpoints/reverse-shares/types";
import { FILE_STATUS } from "../constants";

export type ReverseShareInfo = GetReverseShareForUploadResult["data"]["reverseShare"];
export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS];

export interface DefaultLayoutProps {
  reverseShare: ReverseShareInfo | null;
  password: string;
  alias: string;
  isMaxFilesReached: boolean;
  hasUploadedSuccessfully: boolean;
  onUploadSuccess: () => void;
  isLinkInactive: boolean;
  isLinkNotFound: boolean;
  isLinkExpired: boolean;
}

export interface FileUploadSectionProps {
  reverseShare: ReverseShareInfo;
  password: string;
  alias: string;
  onUploadSuccess?: () => void;
}

export interface FileWithProgress {
  file: File;
  progress: number;
  status: FileStatus;
  error?: string;
}

export interface PasswordModalProps {
  isOpen: boolean;
  onSubmit: (password: string) => void;
  onClose: () => void;
}

export interface WeTransferLayoutProps {
  reverseShare: ReverseShareInfo | null;
  password: string;
  alias: string;
  isMaxFilesReached: boolean;
  hasUploadedSuccessfully: boolean;
  onUploadSuccess: () => void;
  isLinkInactive: boolean;
  isLinkNotFound: boolean;
  isLinkExpired: boolean;
}
