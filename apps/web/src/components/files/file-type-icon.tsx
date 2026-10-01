import { IconFolder } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { getFileIcon } from "@/utils/file-icons";

/** Grey 17px type icon, the same for every surface that lists files. */
export function FileTypeIcon({ name, className, size = 17 }: { name: string; className?: string; size?: number }) {
  const { icon: Icon } = getFileIcon(name);
  return <Icon size={size} stroke={1.8} aria-hidden className={cn("shrink-0 text-ink-icon", className)} />;
}

/** Folders carry the one accent colour so they read as places, not files. */
export function FolderIcon({ className, size = 17 }: { className?: string; size?: number }) {
  return <IconFolder size={size} stroke={1.8} aria-hidden className={cn("shrink-0 text-primary", className)} />;
}
