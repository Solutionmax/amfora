"use client";

import { IconArrowBackUp, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { FileTypeIcon, FolderIcon } from "@/components/files/file-type-icon";
import { useAddedLabel } from "@/components/files/use-added-label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TrashItem } from "@/http/endpoints/trash";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/utils/format-file-size";

/** Days left at which the number turns to the warning colour. */
const FEW_DAYS_LEFT = 3;

const rowKey = (item: TrashItem) => `${item.kind}:${item.id}`;

export function TrashTable({
  items,
  selected,
  onToggle,
  onSelectAll,
  onRestore,
  onDelete,
}: {
  items: TrashItem[];
  selected: ReadonlySet<string>;
  onToggle: (item: TrashItem, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onRestore: (item: TrashItem) => void;
  onDelete: (item: TrashItem) => void;
}) {
  const t = useTranslations("trash");
  const deletedLabel = useAddedLabel();
  const daysLeft = (item: TrashItem) => t("daysLeft", { count: item.daysLeft });

  return (
    <Table aria-label={t("tableLabel")} className="table-fixed">
      <TableHeader className="max-sm:hidden">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10 pl-3 pr-0">
            <Checkbox
              checked={items.length > 0 && selected.size === items.length}
              onCheckedChange={(checked) => onSelectAll(checked === true)}
              aria-label={t("selectAll")}
            />
          </TableHead>
          <TableHead>{t("columns.name")}</TableHead>
          <TableHead className="hidden w-[170px] md:table-cell">{t("columns.place")}</TableHead>
          <TableHead className="hidden w-[130px] md:table-cell">{t("columns.deleted")}</TableHead>
          <TableHead className="w-[96px] max-sm:hidden">{t("columns.timeLeft")}</TableHead>
          <TableHead className="w-[90px] max-sm:hidden">{t("columns.size")}</TableHead>
          <TableHead className="w-[88px]">
            <span className="sr-only">{t("columns.actions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const isSelected = selected.has(rowKey(item));
          const size = formatFileSize(item.size);
          const meta = item.kind === "folder" ? t("folderMeta", { count: item.fileCount }) : null;

          return (
            <TableRow key={rowKey(item)} data-state={isSelected ? "selected" : undefined}>
              <TableCell className="pl-3 pr-0 max-sm:hidden">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onToggle(item, checked === true)}
                  aria-label={t("selectItem", { name: item.name })}
                />
              </TableCell>
              <TableCell className="max-sm:pl-1">
                <div className="flex min-w-0 items-center gap-3.5">
                  {item.kind === "folder" ? <FolderIcon /> : <FileTypeIcon name={item.name} />}
                  <div className="min-w-0">
                    <p className="truncate font-semibold" title={item.name}>
                      {item.name}
                    </p>
                    <p className="truncate text-[12.5px] text-ink-3 max-sm:hidden">{meta ?? size}</p>
                    <p className="truncate text-[12.5px] text-ink-3 sm:hidden">
                      {size} · {daysLeft(item)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden truncate text-[13px] text-ink-2 md:table-cell" title={item.place ?? ""}>
                {item.place ?? t("topLevel")}
              </TableCell>
              <TableCell className="hidden text-[13px] text-ink-3 md:table-cell">
                {deletedLabel(item.deletedAt)}
              </TableCell>
              <TableCell
                className={cn("text-[13px] max-sm:hidden", item.daysLeft <= FEW_DAYS_LEFT ? "text-warn" : "text-ink-2")}
              >
                {daysLeft(item)}
              </TableCell>
              <TableCell className="text-[13px] text-ink-2 max-sm:hidden">{size}</TableCell>
              <TableCell className="w-[88px] pr-2 max-sm:px-0">
                <div className="flex items-center justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("restoreItem", { name: item.name })}
                    onClick={() => onRestore(item)}
                  >
                    <IconArrowBackUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("deleteItem", { name: item.name })}
                    onClick={() => onDelete(item)}
                  >
                    <IconTrash />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
