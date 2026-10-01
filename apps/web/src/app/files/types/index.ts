import { EnhancedFileManagerHook } from "@/hooks/use-enhanced-file-manager";

export interface HeaderProps {
  onUpload: () => void;
  onCreateFolder?: () => void;
}

export interface FilesModalsProps {
  fileManager: EnhancedFileManagerHook;
  modals: {
    isUploadModalOpen: boolean;
    onCloseUploadModal: () => void;
  };
  onSuccess: () => Promise<void>;
}
