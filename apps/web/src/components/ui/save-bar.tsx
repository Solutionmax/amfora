"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Floating bar that appears only while a form differs from what is stored.
 * Put it once per form; pass the form's dirty state.
 */
export function SaveBar({
  visible,
  saving,
  onDiscard,
  onSave,
  form,
}: {
  visible: boolean;
  saving?: boolean;
  onDiscard: () => void;
  /** Leave out when the save button submits a form (pass `form` instead). */
  onSave?: () => void;
  form?: string;
}) {
  const t = useTranslations();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={cn(
        "fixed bottom-5 left-4 right-4 z-40 mx-auto flex max-w-[708px] items-center gap-2.5 rounded-xl bg-ink py-2.5 pl-[18px] pr-2.5 text-background shadow-[0_18px_40px_-18px_rgba(14,32,54,.5)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(.16,1,.3,1)] lg:left-[232px]",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[140%] opacity-0"
      )}
    >
      <span className="flex-1 font-medium">{t("ui.unsavedChanges")}</span>
      <Button
        type="button"
        variant="ghost"
        className="text-background/70 hover:bg-transparent hover:text-background"
        onClick={onDiscard}
        disabled={saving}
        tabIndex={visible ? 0 : -1}
      >
        {t("ui.discard")}
      </Button>
      <Button
        type={form ? "submit" : "button"}
        form={form}
        onClick={onSave}
        disabled={saving}
        tabIndex={visible ? 0 : -1}
      >
        {saving ? t("common.saving") : t("common.save")}
      </Button>
    </div>
  );
}
