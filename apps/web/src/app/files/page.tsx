"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlobalDropZone } from "@/components/general/global-drop-zone";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { MoveItemsModal } from "@/components/modals/move-items-modal";
import { moveFile } from "@/http/endpoints/files";
import { listFolders, moveFolder } from "@/http/endpoints/folders";
import { getCachedDownloadUrl } from "@/lib/download-url-cache";
import { formatFileSize } from "@/utils/format-file-size";
import { FilesViewManager } from "./components/files-view-manager";
import { FolderCrumbs, type DroppedItem } from "./components/folder-crumbs";
import { Header } from "./components/header";
import { useFileBrowser } from "./hooks/use-file-browser";
import { FilesModals } from "./modals/files-modals";

interface File {
  id: string;
  name: string;
  description?: string;
  extension: string;
  size: number;
  objectName: string;
  downloads?: number;
  userId: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  description?: string;
  objectName: string;
  parentId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  totalSize?: string;
  _count?: {
    files: number;
    children: number;
  };
}

export default function FilesPage() {
  const t = useTranslations();
  const [itemsToMove, setItemsToMove] = useState<{ files: File[]; folders: Folder[] } | null>(null);

  const {
    isLoading,
    hasLoaded,
    loadError,
    searchQuery,
    currentPath,
    fileManager,
    filteredFiles,
    filteredFolders,
    navigateToFolder,
    navigateToRoot,
    handleSearch,
    loadFiles,
    handleImmediateUpdate,
    modals,
    allFiles,
    allFolders,
  } = useFileBrowser();

  const handleMoveFile = (file: any) => {
    setItemsToMove({ files: [file], folders: [] });
  };

  const handleMoveFolder = (folder: any) => {
    setItemsToMove({ files: [], folders: [folder] });
  };

  const handleBulkMove = (files: File[], folders: Folder[]) => {
    setItemsToMove({ files, folders });
  };

  const handleMove = async (targetFolderId: string | null) => {
    if (!itemsToMove) return;

    try {
      if (itemsToMove.files.length > 0) {
        // One at a time: the server keeps a single database connection.
        for (const file of itemsToMove.files) await moveFile(file.id, { folderId: targetFolderId });
      }

      if (itemsToMove.folders.length > 0) {
        for (const folder of itemsToMove.folders) await moveFolder(folder.id, { parentId: targetFolderId });
      }

      const itemCount = itemsToMove.files.length + itemsToMove.folders.length;
      toast.success(t("moveItems.success", { count: itemCount }));

      await loadFiles();
      setItemsToMove(null);
    } catch (error) {
      console.error("Error moving items:", error);
      toast.error(t("files.errors.moveItemsFailed"));
      // Some of the items may have moved before the failure.
      await loadFiles();
    }
  };

  const handleUploadSuccess = async () => {
    await loadFiles();
    // Toast is already shown by the upload modal
  };

  const handleFolderDownload = async (folderId: string, folderName: string) => {
    try {
      // Get all files in this folder and subfolders recursively with their paths
      const getFolderFilesWithPath = (
        targetFolderId: string,
        currentPath: string = ""
      ): Array<{ file: File; path: string }> => {
        const filesWithPath: Array<{ file: File; path: string }> = [];

        // Get direct files in this folder
        const directFiles = allFiles.filter((f) => f.folderId === targetFolderId);
        directFiles.forEach((file) => {
          filesWithPath.push({ file, path: currentPath });
        });

        // Get subfolders and process them recursively
        const subfolders = allFolders.filter((f) => f.parentId === targetFolderId);
        for (const subfolder of subfolders) {
          const subfolderPath = currentPath ? `${currentPath}/${subfolder.name}` : subfolder.name;
          filesWithPath.push(...getFolderFilesWithPath(subfolder.id, subfolderPath));
        }

        return filesWithPath;
      };

      const folderFilesWithPath = getFolderFilesWithPath(folderId);

      if (folderFilesWithPath.length === 0) {
        toast.error(t("shareManager.noFilesToDownload"));
        return;
      }

      const loadingToast = toast.loading(t("shareManager.creatingZip"));

      try {
        // Get presigned URLs for all files with their relative paths
        const downloadItems = await Promise.all(
          folderFilesWithPath.map(async ({ file, path }) => {
            const url = await getCachedDownloadUrl(file.objectName);
            return {
              url,
              name: path ? `${path}/${file.name}` : file.name,
            };
          })
        );

        // Create ZIP with all files
        const { downloadFilesAsZip } = await import("@/utils/zip-download");
        const zipName = `${folderName}.zip`;
        await downloadFilesAsZip(downloadItems, zipName);

        toast.dismiss(loadingToast);
        toast.success(t("shareManager.zipDownloadSuccess"));
      } catch (error) {
        toast.dismiss(loadingToast);
        toast.error(t("shareManager.zipDownloadError"));
        throw error;
      }
    } catch (error) {
      console.error("Error downloading folder:", error);
      toast.error(t("share.errors.downloadFailed"));
    }
  };

  const currentFolder = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
  const currentFolderId = currentFolder?.id ?? null;

  const handleDroppedItems = async (items: DroppedItem[], target: { id: string; name: string } | null) => {
    const targetId = target?.id ?? null;
    const validItems = items.filter((item) => item.id !== targetId);
    if (validItems.length === 0) {
      toast.error(t("files.errors.cannotMoveHere"));
      return;
    }

    validItems.forEach((item) => handleImmediateUpdate(item.id, item.type, targetId));

    try {
      for (const item of validItems) {
        await (item.type === "file"
          ? moveFile(item.id, { folderId: targetId })
          : moveFolder(item.id, { parentId: targetId }));
      }
      toast.success(t("moveItems.success", { count: validItems.length }));
    } catch (error) {
      console.error("Error moving items:", error);
      toast.error(t("files.errors.moveItemsFailed"));
      await loadFiles();
    }
  };

  const totalSize = allFiles.reduce((sum: number, file: { size?: number | string }) => sum + Number(file.size || 0), 0);

  return (
    <ProtectedRoute>
      <GlobalDropZone onSuccess={loadFiles} currentFolderId={currentFolderId}>
        <FileManagerLayout
          title={t("files.pageTitle")}
          subline={
            hasLoaded
              ? t("files.calm.subline", {
                  files: allFiles.length,
                  folders: allFolders.length,
                  size: formatFileSize(totalSize),
                })
              : undefined
          }
          actions={
            <Header
              onUpload={modals.onOpenUploadModal}
              onCreateFolder={() => fileManager.setCreateFolderModalOpen(true)}
            />
          }
        >
          <FilesViewManager
            files={filteredFiles}
            folders={filteredFolders}
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onDownload={fileManager.handleDownload}
            isLoading={isLoading && !hasLoaded}
            loadError={loadError}
            onRetry={loadFiles}
            isInFolder={!!currentFolder}
            onCreateFolder={() => fileManager.setCreateFolderModalOpen(true)}
            onUpload={modals.onOpenUploadModal}
            breadcrumbs={
              <FolderCrumbs
                path={currentPath}
                onNavigate={(folderId) => (folderId ? navigateToFolder(folderId) : navigateToRoot())}
                onDropItems={handleDroppedItems}
              />
            }
            onNavigateToFolder={navigateToFolder}
            onDeleteFolder={(folder) => fileManager.setFolderToDelete({ id: folder.id, name: folder.name })}
            onRenameFolder={(folder) =>
              fileManager.setFolderToRename({
                id: folder.id,
                name: folder.name,
                description: folder.description || undefined,
              })
            }
            onMoveFolder={handleMoveFolder}
            onMoveFile={handleMoveFile}
            onRefresh={loadFiles}
            onImmediateUpdate={handleImmediateUpdate}
            onShareFolder={fileManager.setFolderToShare}
            onDownloadFolder={handleFolderDownload}
            onPreview={fileManager.setPreviewFile}
            onRename={fileManager.setFileToRename}
            onShare={fileManager.setFileToShare}
            onDelete={fileManager.setFileToDelete}
            onBulkDelete={fileManager.handleBulkDelete}
            onBulkShare={fileManager.handleBulkShare}
            onBulkDownload={fileManager.handleBulkDownload}
            onBulkMove={handleBulkMove}
            setClearSelectionCallback={fileManager.setClearSelectionCallback}
          />

          <FilesModals
            fileManager={fileManager}
            modals={modals}
            onSuccess={handleUploadSuccess}
            currentFolderId={currentFolderId}
            currentFolderName={currentFolder?.name}
          />

          <MoveItemsModal
            isOpen={!!itemsToMove}
            onClose={() => setItemsToMove(null)}
            onMove={handleMove}
            itemsToMove={itemsToMove}
            getAllFolders={async () => {
              const response = await listFolders();
              return response.data.folders || [];
            }}
            currentFolderId={currentFolderId}
          />
        </FileManagerLayout>
      </GlobalDropZone>
    </ProtectedRoute>
  );
}
