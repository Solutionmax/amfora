import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuthProviderDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: { id: string; name: string; displayName: string } | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function AuthProviderDeleteModal({
  isOpen,
  onClose,
  provider,
  onConfirm,
  isDeleting,
}: AuthProviderDeleteModalProps) {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={() => !isDeleting && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t("authProviders.calm.deleteTitle", { name: provider?.displayName ?? "" })}</DialogTitle>
          <DialogDescription>
            {t("authProviders.calm.deleteDescription")}{" "}
            {provider && t("authProviders.deleteModal.providerId", { name: provider.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            {t("authProviders.deleteModal.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? t("authProviders.deleteModal.deleting") : t("authProviders.deleteModal.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
