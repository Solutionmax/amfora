import { useState } from "react";
import axios from "axios";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteGroup, type Group } from "@/http/endpoints";

/** Deleting is refused while shares use the group; the dialog says how many. */
export function GroupDeleteModal({
  group,
  onClose,
  onDeleted,
}: {
  group: Group | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);
  const [inUse, setInUse] = useState<number | null>(null);

  const close = () => {
    setInUse(null);
    onClose();
  };

  const confirm = async () => {
    if (!group) return;
    setBusy(true);
    try {
      await deleteGroup(group.id);
      toast.success(t("groups.messages.deleted"));
      setInUse(null);
      onDeleted();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.code === "GROUP_IN_USE") {
        setInUse(Number(err.response.data.shares) || group.shareCount);
      } else {
        toast.error(t("groups.errors.deleteFailed"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!group} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t("groups.delete.title", { name: group?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t("groups.delete.description")}</DialogDescription>
        </DialogHeader>
        {inUse !== null && (
          <p role="alert" className="text-[13px] text-bad">
            {t("groups.delete.inUse", { count: inUse })}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={busy || inUse !== null}>
            {busy ? t("common.deleting") : t("groups.delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
