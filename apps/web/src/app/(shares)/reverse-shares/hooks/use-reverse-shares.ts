"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  createReverseShare,
  createReverseShareAlias,
  deleteReverseShare,
  listUserReverseShares,
  updateReverseShare,
  updateReverseSharePassword,
} from "@/http/endpoints";
import { updateReverseShareNotifications } from "@/http/endpoints/activity";
import { copyReverseShareFileToUserFiles } from "@/http/endpoints/reverse-shares";
import type {
  CreateReverseShareBody,
  ListUserReverseSharesResult,
  UpdateReverseShareBody,
} from "@/http/endpoints/reverse-shares/types";
import { copyText } from "@/lib/clipboard";
import { copyErrorMessage } from "../lib/received-file-actions";

export type ReverseShare = ListUserReverseSharesResult["data"]["reverseShares"][0];
export type ReverseShareChanges = Omit<UpdateReverseShareBody, "id">;
export type PasswordChange = { hasPassword: boolean; password?: string };

const newestFirst = (list: ReverseShare[]) =>
  [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export function reverseShareUrl(reverseShare: Pick<ReverseShare, "alias">): string | null {
  const alias = reverseShare.alias?.alias;
  if (!alias || typeof window === "undefined") return null;
  return `${window.location.origin}/r/${alias}`;
}

export function useReverseShares() {
  const t = useTranslations();
  const [reverseShares, setReverseShares] = useState<ReverseShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reverseShareToGenerateLink, setReverseShareToGenerateLink] = useState<ReverseShare | null>(null);
  const [reverseShareToDelete, setReverseShareToDelete] = useState<ReverseShare | null>(null);
  const [reverseShareToEdit, setReverseShareToEdit] = useState<ReverseShare | null>(null);
  const [reverseShareToViewFiles, setReverseShareToViewFiles] = useState<ReverseShare | null>(null);
  const [reverseShareToViewQrCode, setReverseShareToViewQrCode] = useState<ReverseShare | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  /** Merge a server copy into the list without dropping the alias and files the list already has. */
  const mergeOne = useCallback((id: string, patch: Partial<ReverseShare>) => {
    setReverseShares((prev) => prev.map((rs) => (rs.id === id ? ({ ...rs, ...patch } as ReverseShare) : rs)));
  }, []);

  const loadReverseShares = useCallback(async () => {
    try {
      const response = await listUserReverseShares();
      setReverseShares(newestFirst(response.data.reverseShares || []));
      setLoadError(null);
    } catch (error) {
      console.error("Failed to load receive links:", error);
      setLoadError(t("reverseShares.errors.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const retryLoad = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    await loadReverseShares();
  }, [loadReverseShares]);

  /** Reload after a change to received files; the files modal follows via the effect below. */
  const refreshReverseShare = useCallback(async () => {
    try {
      const response = await listUserReverseShares();
      setReverseShares(newestFirst(response.data.reverseShares || []));
    } catch {
      toast.error(t("reverseShares.errors.loadFailed"));
    }
  }, [t]);

  const handleCreateReverseShare = async (data: CreateReverseShareBody) => {
    setIsCreating(true);
    try {
      const response = await createReverseShare(data);
      const created = { ...response.data.reverseShare, alias: null } as ReverseShare;
      setReverseShares((prev) => [created, ...prev]);
      toast.success(t("reverseShares.messages.createSuccess"));
      setIsCreateModalOpen(false);
      setReverseShareToGenerateLink(created);
      return created;
    } catch {
      toast.error(t("reverseShares.errors.createFailed"));
    } finally {
      setIsCreating(false);
    }
  };

  /** Returns false when the alias could not be saved (taken, invalid, offline). */
  const handleCreateAlias = async (reverseShareId: string, alias: string): Promise<boolean> => {
    try {
      await createReverseShareAlias(reverseShareId, { alias });
      const now = new Date().toISOString();
      mergeOne(reverseShareId, { alias: { id: "", alias, reverseShareId, createdAt: now, updatedAt: now } });
      toast.success(t("reverseShares.messages.aliasCreated"));
      return true;
    } catch {
      toast.error(t("reverseShares.errors.aliasCreateFailed"));
      return false;
    }
  };

  /** Returns true when the link is gone. */
  const handleDeleteReverseShare = async (reverseShare: ReverseShare) => {
    setIsDeleting(true);
    try {
      await deleteReverseShare(reverseShare.id);
      setReverseShares((prev) => prev.filter((rs) => rs.id !== reverseShare.id));
      toast.success(t("reverseShares.messages.deleteSuccess"));
      setReverseShareToDelete(null);
      return true;
    } catch {
      toast.error(t("reverseShares.errors.deleteFailed"));
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateReverseShare = async (data: UpdateReverseShareBody) => {
    setIsUpdating(true);
    try {
      const response = await updateReverseShare(data);
      mergeOne(data.id, response.data.reverseShare as Partial<ReverseShare>);
      toast.success(t("reverseShares.messages.updateSuccess"));
      setReverseShareToEdit(null);
      return response.data.reverseShare;
    } catch {
      toast.error(t("reverseShares.errors.updateFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  /** Throws on failure so the caller decides how to tell the user. */
  const handleUpdatePassword = async (id: string, data: PasswordChange) => {
    const payload = { password: data.hasPassword ? (data.password ?? "") : null };
    const response = await updateReverseSharePassword(id, payload);
    mergeOne(id, response.data.reverseShare as Partial<ReverseShare>);
    return response.data.reverseShare;
  };

  /** One setting changed from the detail view. Returns false when saving failed. */
  const handleUpdateReverseShareData = async (id: string, data: ReverseShareChanges) => {
    try {
      const response = await updateReverseShare({ id, ...data });
      mergeOne(id, response.data.reverseShare as Partial<ReverseShare>);
      toast.success(t("reverseShares.messages.updateSuccess"));
      return true;
    } catch {
      toast.error(t("reverseShares.errors.updateFailed"));
      return false;
    }
  };

  /** Shown at once; put back when the server refuses. */
  const handleRemindBeforeExpiry = async (id: string, remindBeforeExpiry: boolean) => {
    mergeOne(id, { remindBeforeExpiry });
    try {
      await updateReverseShareNotifications(id, { remindBeforeExpiry });
      return true;
    } catch (error) {
      console.error("Failed to save the reminder:", error);
      mergeOne(id, { remindBeforeExpiry: !remindBeforeExpiry });
      toast.error(t("reverseShares.calm.notify.error"));
      return false;
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await updateReverseShare({ id, isActive });
      mergeOne(id, response.data.reverseShare as Partial<ReverseShare>);
      toast.success(
        isActive ? t("reverseShares.messages.activateSuccess") : t("reverseShares.messages.deactivateSuccess")
      );
      return response.data.reverseShare;
    } catch {
      toast.error(t("reverseShares.errors.updateFailed"));
    }
  };

  const handleCopyAllToMyFiles = (reverseShare: ReverseShare) => {
    const files = reverseShare.files ?? [];
    if (!files.length) return;
    const count = files.length;
    toast.promise(Promise.all(files.map((file) => copyReverseShareFileToUserFiles(file.id))), {
      loading: t("reverseShares.modals.receivedFiles.bulkCopyProgress", { count }),
      success: t("reverseShares.modals.receivedFiles.bulkCopySuccess", { count }),
      error: (error: unknown) => copyErrorMessage(error, t),
    });
  };

  const handleCopyLink = async (reverseShare: ReverseShare) => {
    const link = reverseShareUrl(reverseShare);
    if (!link) return;
    try {
      await copyText(link);
      toast.success(t("reverseShares.messages.linkCopied"));
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  };

  useEffect(() => {
    loadReverseShares();
  }, [loadReverseShares]);

  // Keep the received files modal pointing at the latest copy of its link.
  useEffect(() => {
    setReverseShareToViewFiles((current) =>
      current ? (reverseShares.find((rs) => rs.id === current.id) ?? current) : current
    );
  }, [reverseShares]);

  return {
    reverseShares,
    isLoading,
    loadError,
    reverseShareToGenerateLink,
    reverseShareToDelete,
    reverseShareToEdit,
    reverseShareToViewFiles,
    reverseShareToViewQrCode,
    isDeleting,
    isCreateModalOpen,
    isCreating,
    isUpdating,
    setReverseShareToGenerateLink,
    setReverseShareToDelete,
    setReverseShareToEdit,
    setReverseShareToViewFiles,
    setReverseShareToViewQrCode,
    setIsCreateModalOpen,
    handleCopyLink,
    handleCopyAllToMyFiles,
    handleDeleteReverseShare,
    handleCreateReverseShare,
    handleUpdateReverseShare,
    handleCreateAlias,
    handleUpdatePassword,
    handleUpdateReverseShareData,
    handleToggleActive,
    handleRemindBeforeExpiry,
    retryLoad,
    refreshReverseShare,
  };
}
