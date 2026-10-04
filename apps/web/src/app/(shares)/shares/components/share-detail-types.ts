import type { ShareNotifications } from "@/http/endpoints/activity";
import type { Share } from "@/http/endpoints/shares/types";

export interface ShareItemRef {
  kind: "file" | "folder";
  id: string;
  name: string;
}

/** Everything the detail column can ask the page to do for one share. */
export interface ShareDetailActions {
  onCopyLink: (share: Share) => void;
  onShowQr: (share: Share) => void;
  onEdit: (share: Share) => void;
  onManageFiles: (share: Share) => void;
  onManageRecipients: (share: Share) => void;
  onNotify: (share: Share) => void;
  onDownloadAll: (share: Share) => void;
  onDelete: (share: Share) => void;
  onSecurity: (share: Share) => void;
  onRemovePassword: (share: Share) => void;
  onExpiration: (share: Share) => void;
  onViewLimit: (share: Share) => void;
  onLink: (share: Share) => void;
  onRemoveItem: (share: Share, item: ShareItemRef) => void;
  /** Resolves to false when the change could not be saved. */
  onNotifications: (share: Share, changes: Partial<ShareNotifications>) => Promise<boolean>;
}
