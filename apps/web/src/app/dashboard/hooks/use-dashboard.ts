"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useEnhancedFileManager } from "@/hooks/use-enhanced-file-manager";
import { useShareManager } from "@/hooks/use-share-manager";
import { getDiskSpace, listFiles, listUserShares } from "@/http/endpoints";
import { getStorageUsage, type StorageUsage } from "@/http/endpoints/activity";
import { listFolders } from "@/http/endpoints/folders";
import { listUserReverseShares } from "@/http/endpoints/reverse-shares";
import type { ReverseShareWithAlias } from "@/http/endpoints/reverse-shares/types";
import { Share } from "@/http/endpoints/shares/types";
import { copyText } from "@/lib/clipboard";
import type { DiskSpace } from "../types";

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/** `withOwnStorage`: also load the user's own use, for people who do not see the whole disk. */
export function useDashboard({ withOwnStorage = false }: { withOwnStorage?: boolean } = {}) {
  const t = useTranslations();
  const [diskSpace, setDiskSpace] = useState<DiskSpace | null>(null);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [folderCount, setFolderCount] = useState(0);
  const [recentShares, setRecentShares] = useState<Share[]>([]);
  const [receiveLinks, setReceiveLinks] = useState<ReverseShareWithAlias[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    const loadDiskSpace = async () => {
      try {
        const res = await getDiskSpace();
        setDiskSpace(res.data);
      } catch (error) {
        console.warn("Failed to load disk space:", error);
        setDiskSpace(null);
      }
    };

    const loadFilesAndShares = async () => {
      try {
        const [filesRes, foldersRes, sharesRes] = await Promise.all([listFiles(), listFolders(), listUserShares()]);
        setRecentFiles([...(filesRes.data.files || [])].sort(byNewest));
        setFolderCount((foldersRes.data.folders || []).length);
        setRecentShares([...(sharesRes.data.shares || [])].sort(byNewest));
        setLoadError(null);
      } catch (error) {
        console.error("Dashboard load failed:", error);
        setLoadError(t("dashboard.loadError"));
      }
    };

    const loadReceiveLinks = async () => {
      try {
        const res = await listUserReverseShares();
        setReceiveLinks(res.data.reverseShares || []);
      } catch (error) {
        console.warn("Failed to load receive links:", error);
        setReceiveLinks(null);
      }
    };

    const loadStorageUsage = async () => {
      if (!withOwnStorage) return;
      try {
        setStorageUsage(await getStorageUsage());
      } catch (error) {
        // The plain storage figure stays in its place when this fails.
        console.warn("Failed to load storage usage:", error);
        setStorageUsage(null);
      }
    };

    await Promise.all([loadDiskSpace(), loadFilesAndShares(), loadReceiveLinks(), loadStorageUsage()]);
    setIsLoading(false);
  }, [t, withOwnStorage]);

  const fileManager = useEnhancedFileManager(loadDashboardData);
  const shareManager = useShareManager(loadDashboardData);

  const handleCopyLink = async (share: Share) => {
    if (!share.alias?.alias) return;
    const link = `${window.location.origin}/s/${share.alias.alias}`;

    try {
      await copyText(link);
      toast.success(t("dashboard.linkCopied"));
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return {
    isLoading,
    loadError,
    diskSpace,
    storageUsage,
    recentFiles,
    folderCount,
    recentShares,
    receiveLinks,
    modals: {
      isUploadModalOpen,
      isCreateModalOpen,
      onOpenUploadModal: () => setIsUploadModalOpen(true),
      onCloseUploadModal: () => setIsUploadModalOpen(false),
      onOpenCreateModal: () => setIsCreateModalOpen(true),
      onCloseCreateModal: () => setIsCreateModalOpen(false),
    },
    fileManager,
    shareManager,
    handleCopyLink,
    loadDashboardData,
  };
}
