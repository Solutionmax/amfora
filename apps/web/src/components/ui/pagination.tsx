"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const t = useTranslations();

  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex items-center justify-end gap-2 border-t border-border/60 px-6 py-3"
      aria-label={t("pagination.label")}
    >
      <Button
        variant="ghost"
        size="icon"
        className="cursor-pointer"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={t("pagination.previous")}
      >
        <IconChevronLeft className="size-4" />
      </Button>
      {/* Digits and a slash read the same in every locale, so this needs no translation. */}
      <span className="font-mono text-xs tabular-nums text-muted-foreground" aria-live="polite">
        {page} / {totalPages}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="cursor-pointer"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label={t("pagination.next")}
      >
        <IconChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
