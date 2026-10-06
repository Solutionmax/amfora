"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { GroupAccessField } from "@/components/general/group-access-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Share } from "@/http/endpoints/shares/types";

/** Changes who can open one share: anyone with the link, or the members of a group. */
export function ShareGroupModal({
  share,
  onClose,
  onSave,
}: {
  share: Share | null;
  onClose: () => void;
  onSave: (share: Share, groupId: string | null) => Promise<boolean>;
}) {
  const t = useTranslations();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (share) setGroupId(share.groupId ?? null);
  }, [share]);

  const handleSave = async () => {
    if (!share) return;
    setIsSaving(true);
    const saved = await onSave(share, groupId);
    setIsSaving(false);
    if (saved) onClose();
  };

  return (
    <Dialog open={!!share} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t("groups.access.title")}</DialogTitle>
          <DialogDescription>{t("groups.access.description")}</DialogDescription>
        </DialogHeader>
        <GroupAccessField
          id="share-group-select"
          value={groupId}
          onChange={setGroupId}
          enabled={!!share}
          currentGroup={share?.group}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
