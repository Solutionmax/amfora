"use client";

import { useRef, type ReactNode } from "react";
import { IconUpload } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { LineRow } from "@/components/ui/line-list";

/** One admin image as a line: thumbnail or grey icon, title and hint, upload or replace, remove. Saves at once. */
export function ImageUploadField({
  label,
  hint,
  icon,
  src,
  disabled,
  canRemove = true,
  onUpload,
  onRemove,
  labels,
}: {
  label: string;
  hint: string;
  icon: ReactNode;
  src: string | null;
  disabled: boolean;
  canRemove?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  labels: { upload: string; replace: string; remove: string };
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <LineRow
      icon={
        src ? <img alt="" src={src} className="h-[34px] w-[52px] rounded-md border border-line object-cover" /> : icon
      }
      title={label}
      sub={hint}
    >
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        aria-label={label}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      {src && canRemove && (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
          {labels.remove}
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={disabled}>
        <IconUpload aria-hidden="true" />
        {src ? labels.replace : labels.upload}
      </Button>
    </LineRow>
  );
}
