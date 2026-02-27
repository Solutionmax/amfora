import { IconEdit, IconTrash } from "@tabler/icons-react";
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
import { Input } from "@/components/ui/input";

interface FileActionsModalsProps {
  fileToRename: { id: string; name: string; description?: string } | null;
  fileToDelete: { id: string; name: string } | null;
  onRename: (fileId: string, newName: string, description?: string) => Promise<void>;
  onDelete: (fileId: string) => Promise<void>;
  onCloseRename: () => void;
  onCloseDelete: () => void;
}

export function FileActionsModals({
  fileToRename,
  fileToDelete,
  onRename,
  onDelete,
  onCloseRename,
  onCloseDelete,
}: FileActionsModalsProps) {
  const t = useTranslations();

  const splitFileName = (fullName: string) => {
    const lastDotIndex = fullName.lastIndexOf(".");

    return lastDotIndex === -1
      ? { name: fullName, extension: "" }
      : {
          name: fullName.substring(0, lastDotIndex),
          extension: fullName.substring(lastDotIndex),
        };
  };

  return (
    <>
      <Dialog open={!!fileToRename} onOpenChange={() => onCloseRename()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconEdit size={20} />
              {t("fileActions.editFile")}
            </DialogTitle>
          </DialogHeader>
          {fileToRename && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Input
                  defaultValue={splitFileName(fileToRename.name).name}
                  placeholder={t("fileActions.namePlaceholder")}
                  onKeyUp={(e) => {
                    if (e.key === "Enter" && fileToRename) {
                      const newName = e.currentTarget.value + splitFileName(fileToRename.name).extension;
                      onRename(fileToRename.id, newName);
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  {t("fileActions.extension")}: {splitFileName(fileToRename.name).extension}
                </p>
              </div>
              <Input
                defaultValue={fileToRename.description || ""}
                placeholder={t("fileActions.descriptionPlaceholder")}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={onCloseRename}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                const nameInput = document.querySelector(
                  `input[placeholder="${t("fileActions.namePlaceholder")}"]`
                ) as HTMLInputElement;
                const descInput = document.querySelector(
                  `input[placeholder="${t("fileActions.descriptionPlaceholder")}"]`
                ) as HTMLInputElement;

                if (fileToRename && nameInput && descInput) {
                  const newName = nameInput.value + splitFileName(fileToRename.name).extension;
                  onRename(fileToRename.id, newName, descInput.value);
                }
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fileToDelete} onOpenChange={() => onCloseDelete()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconTrash size={20} />
              {t("fileActions.deleteFile")}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <p className="text-base font-semibold mb-2 text-foreground">{t("fileActions.deleteConfirmation")}</p>
            <p>
              {(fileToDelete?.name &&
                (fileToDelete.name.length > 50 ? fileToDelete.name.substring(0, 50) + "..." : fileToDelete.name)) ||
                ""}
            </p>
            <p className="text-sm  mt-2 text-amber-500">{t("fileActions.deleteWarning")}</p>
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseDelete}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => fileToDelete && onDelete(fileToDelete.id)}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
