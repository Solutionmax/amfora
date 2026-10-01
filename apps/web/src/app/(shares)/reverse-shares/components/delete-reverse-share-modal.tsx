import { useTranslations } from "next-intl";

import type { ReverseShare } from "../hooks/use-reverse-shares";
import { ConfirmDialog } from "./confirm-dialog";

interface DeleteReverseShareModalProps {
  reverseShare: ReverseShare | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (reverseShare: ReverseShare) => Promise<unknown>;
}

export function DeleteReverseShareModal({
  reverseShare,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteReverseShareModalProps) {
  const t = useTranslations();
  const name = reverseShare?.name || t("reverseShares.card.untitled");
  const count = reverseShare?.files?.length ?? 0;

  return (
    <ConfirmDialog
      open={!!reverseShare}
      title={t("reverseShares.calm.deleteTitle", { name })}
      description={count > 0 ? t("reverseShares.calm.deleteTextFiles", { count }) : t("reverseShares.calm.deleteText")}
      confirmLabel={t("reverseShares.delete.confirmButton")}
      busyLabel={t("reverseShares.delete.deleting")}
      busy={isDeleting}
      onConfirm={() => reverseShare && onConfirm(reverseShare)}
      onClose={onClose}
    />
  );
}
