"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { removeFiles, removeFolders, updateShare, updateSharePassword } from "@/http/endpoints";
import { updateShareNotifications, type ShareNotifications } from "@/http/endpoints/activity";
import type { Share } from "@/http/endpoints/shares/types";
import type { ShareItemRef } from "../components/share-detail-types";
import { folderWithContents } from "../lib/share-list";

/** Actions the detail column adds on top of the shared share manager. */
export function useShareDetailActions(reload: () => Promise<void>) {
  const t = useTranslations();
  const [shareForViewLimit, setShareForViewLimit] = useState<Share | null>(null);
  const [shareForGroup, setShareForGroup] = useState<Share | null>(null);
  const [itemToRemove, setItemToRemove] = useState<{ share: Share; item: ShareItemRef } | null>(null);

  const removePassword = async (share: Share) => {
    try {
      await updateSharePassword(share.id, { password: null });
      toast.success(t("shares.calm.passwordRemoved"));
      await reload();
    } catch (error) {
      console.error("Failed to remove share password:", error);
      toast.error(t("shares.calm.passwordError"));
    }
  };

  const saveViewLimit = async (share: Share, maxViews: number | null) => {
    try {
      await updateShare({ id: share.id, maxViews });
      toast.success(t("shares.calm.viewLimitSaved"));
      await reload();
      return true;
    } catch (error) {
      console.error("Failed to save view limit:", error);
      toast.error(t("shares.calm.viewLimitError"));
      return false;
    }
  };

  const saveGroup = async (share: Share, groupId: string | null) => {
    try {
      await updateShare({ id: share.id, groupId });
      toast.success(t("groups.access.saved"));
      await reload();
      return true;
    } catch (error) {
      console.error("Failed to save share group:", error);
      toast.error(t("groups.access.error"));
      return false;
    }
  };

  /** The emails the maker asked for on this share. */
  const saveNotifications = async (share: Share, changes: Partial<ShareNotifications>) => {
    try {
      await updateShareNotifications(share.id, changes);
      await reload();
      return true;
    } catch (error) {
      console.error("Failed to save share notifications:", error);
      toast.error(t("shares.calm.notify.error"));
      return false;
    }
  };

  const confirmRemoveItem = async () => {
    if (!itemToRemove) return;
    const { share, item } = itemToRemove;
    try {
      if (item.kind === "file") {
        await removeFiles(share.id, { files: [item.id] });
      } else {
        const nested = folderWithContents({ folders: share.folders ?? [], files: share.files ?? [] }, item.id);
        if (nested.files.length > 0) await removeFiles(share.id, { files: nested.files });
        await removeFolders(share.id, { folders: nested.folders });
      }
      toast.success(t("shares.calm.removed"));
      setItemToRemove(null);
      await reload();
    } catch (error) {
      console.error("Failed to remove item from share:", error);
      toast.error(t("shares.calm.removeError"));
    }
  };

  return {
    shareForViewLimit,
    setShareForViewLimit,
    shareForGroup,
    setShareForGroup,
    saveGroup,
    itemToRemove,
    setItemToRemove,
    removePassword,
    saveViewLimit,
    saveNotifications,
    confirmRemoveItem,
  };
}
