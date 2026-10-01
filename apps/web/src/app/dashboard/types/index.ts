import { EnhancedFileManagerHook } from "@/hooks/use-enhanced-file-manager";
import { ShareManagerHook } from "@/hooks/use-share-manager";

export interface DiskSpace {
  diskSizeGB: number;
  diskUsedGB: number;
  diskAvailableGB: number;
  uploadAllowed: boolean;
}

export interface DashboardModalsProps {
  modals: {
    isUploadModalOpen: boolean;
    isCreateModalOpen: boolean;
    onCloseUploadModal: () => void;
    onCloseCreateModal: () => void;
  };
  fileManager: EnhancedFileManagerHook;
  shareManager: ShareManagerHook;
  onSuccess: () => Promise<void>;
}
