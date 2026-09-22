"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** One admin image on the customization page: thumbnail, upload or replace, remove. */
export function ImageUploadField({
  label,
  hint,
  src,
  disabled,
  canRemove = true,
  onUpload,
  onRemove,
  labels,
}: {
  label: string;
  hint: string;
  src: string | null;
  disabled: boolean;
  canRemove?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  labels: { upload: string; replace: string; remove: string };
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <p className="text-xs text-ink-3">{hint}</p>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-2">
        {src && <img alt="" src={src} className="h-14 w-24 rounded-md border border-line object-cover" />}
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={disabled}>
          {src ? labels.replace : labels.upload}
        </Button>
        {src && canRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
            {labels.remove}
          </Button>
        )}
      </div>
    </div>
  );
}
