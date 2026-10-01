"use client";

import React, { KeyboardEvent, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface FileTypesTagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  id?: string;
}

const SEPARATORS = ["Enter", " ", ",", "|", "-"];

/** Extensions as small tags; dots are dropped and everything is lower case. */
export function FileTypesTagsInput({
  value = [],
  onChange,
  placeholder = "jpg png pdf docx",
  disabled,
  className,
  ariaLabel,
  id,
}: FileTypesTagsInputProps) {
  const t = useTranslations();
  const [inputValue, setInputValue] = useState("");

  const addTag = () => {
    const newTag = inputValue.trim().toLowerCase();
    if (newTag && !value.includes(newTag)) {
      onChange([...value, newTag]);
    }
    setInputValue("");
  };

  const removeTag = (index: number) => onChange(value.filter((_, i) => i !== index));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (SEPARATORS.includes(e.key)) {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      e.preventDefault();
      removeTag(value.length - 1);
    } else if (e.key === ".") {
      e.preventDefault();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value.replace(/\./g, "").toLowerCase());
  };

  return (
    <div
      className={cn(
        "flex min-h-10 w-full min-w-0 flex-wrap items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-2.5 py-1.5 text-sm transition-[color,box-shadow]",
        "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {value.map((tag, index) => (
        <span
          key={tag}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-line-2 bg-surface-2 pl-2 pr-1 text-xs text-ink-2"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="grid size-4 place-items-center rounded-sm text-ink-icon hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              aria-label={t("reverseShares.calm.removeType", { type: tag })}
            >
              <IconX className="size-3" />
            </button>
          )}
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={() => inputValue.trim() && addTag()}
        placeholder={value.length === 0 ? placeholder : ""}
        disabled={disabled}
        aria-label={ariaLabel}
        className="min-w-[80px] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-ink-3 disabled:cursor-not-allowed"
      />
    </div>
  );
}
