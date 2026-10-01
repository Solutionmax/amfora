"use client";

import { Fragment } from "react";
import {
  IconArrowsMove,
  IconDotsVertical,
  IconDownload,
  IconEdit,
  IconEye,
  IconFolderOpen,
  IconShare,
  IconTrash,
  type Icon,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MenuEntry {
  key: string;
  label: string;
  icon: Icon;
  onSelect: () => void;
  destructive?: boolean;
  /** Shown in the menu only on small screens, where the row buttons are hidden. */
  mobileOnly?: boolean;
}

interface FileLike {
  id: string;
  name: string;
  objectName: string;
}

export interface FileMenuHandlers<F> {
  onPreview?: (file: F) => void;
  onRename?: (file: F) => void;
  onMoveFile?: (file: F) => void;
  onDownload: (objectName: string, fileName: string) => void;
  onShare?: (file: F) => void;
  onDelete?: (file: F) => void;
}

export interface FolderMenuHandlers<D> {
  onNavigateToFolder?: (folderId: string) => void;
  onRenameFolder?: (folder: D) => void;
  onMoveFolder?: (folder: D) => void;
  onDownloadFolder?: (folderId: string, folderName: string) => Promise<void>;
  onShareFolder?: (folder: D) => void;
  onDeleteFolder?: (folder: D) => void;
}

type Translate = ReturnType<typeof useTranslations>;

const entry = (
  key: string,
  label: string,
  icon: Icon,
  handler: (() => void) | undefined,
  extra: Partial<MenuEntry> = {}
): MenuEntry[] => (handler ? [{ key, label, icon, onSelect: handler, ...extra }] : []);

/** Preview, edit, move, (download, share on mobile), delete. */
export function fileMenuEntries<F extends FileLike>(file: F, h: FileMenuHandlers<F>, t: Translate): MenuEntry[] {
  return [
    ...entry("preview", t("filesTable.actions.preview"), IconEye, h.onPreview && (() => h.onPreview!(file))),
    ...entry("download", t("common.download"), IconDownload, () => h.onDownload(file.objectName, file.name), {
      mobileOnly: true,
    }),
    ...entry("share", t("common.share"), IconShare, h.onShare && (() => h.onShare!(file)), { mobileOnly: true }),
    ...entry("edit", t("files.calm.editDetails"), IconEdit, h.onRename && (() => h.onRename!(file))),
    ...entry("move", t("files.calm.moveToFolder"), IconArrowsMove, h.onMoveFile && (() => h.onMoveFile!(file))),
    ...entry("delete", t("common.delete"), IconTrash, h.onDelete && (() => h.onDelete!(file)), { destructive: true }),
  ];
}

/** Open, edit, move, download, share, delete. */
export function folderMenuEntries<D extends { id: string; name: string }>(
  folder: D,
  h: FolderMenuHandlers<D>,
  t: Translate
): MenuEntry[] {
  return [
    ...entry(
      "open",
      t("files.openFolder"),
      IconFolderOpen,
      h.onNavigateToFolder && (() => h.onNavigateToFolder!(folder.id))
    ),
    ...entry(
      "download",
      t("common.download"),
      IconDownload,
      h.onDownloadFolder && (() => void h.onDownloadFolder!(folder.id, folder.name))
    ),
    ...entry("share", t("common.share"), IconShare, h.onShareFolder && (() => h.onShareFolder!(folder))),
    ...entry("edit", t("files.calm.editDetails"), IconEdit, h.onRenameFolder && (() => h.onRenameFolder!(folder))),
    ...entry("move", t("files.calm.moveToFolder"), IconArrowsMove, h.onMoveFolder && (() => h.onMoveFolder!(folder))),
    ...entry("delete", t("common.delete"), IconTrash, h.onDeleteFolder && (() => h.onDeleteFolder!(folder)), {
      destructive: true,
    }),
  ];
}

/** Menu items with a hairline before the destructive group. */
function Entries({ entries, kind }: { entries: MenuEntry[]; kind: "dropdown" | "context" }) {
  const Item = kind === "dropdown" ? DropdownMenuItem : ContextMenuItem;
  const Separator = kind === "dropdown" ? DropdownMenuSeparator : ContextMenuSeparator;

  return entries.map((e, index) => (
    <Fragment key={e.key}>
      {e.destructive && index > 0 && <Separator className={cn(kind === "dropdown" && "bg-line")} />}
      <Item
        variant={e.destructive ? "destructive" : "default"}
        className={cn(e.mobileOnly && "sm:hidden")}
        onClick={(event) => {
          event.stopPropagation();
          e.onSelect();
        }}
      >
        <e.icon />
        {e.label}
      </Item>
    </Fragment>
  ));
}

/** The ⋯ button with its dropdown. */
export function ItemMenu({ entries, label, className }: { entries: MenuEntry[]; label: string; className?: string }) {
  if (entries.length === 0) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          className={className}
          onClick={(event) => event.stopPropagation()}
        >
          <IconDotsVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]" onClick={(event) => event.stopPropagation()}>
        <Entries entries={entries} kind="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Same entries for right-click. */
export function ItemContextMenuContent({ entries }: { entries: MenuEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <ContextMenuContent className="w-[200px]">
      <Entries entries={entries.map((e) => ({ ...e, mobileOnly: false }))} kind="context" />
    </ContextMenuContent>
  );
}
