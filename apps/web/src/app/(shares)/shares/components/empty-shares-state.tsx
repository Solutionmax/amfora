import { IconPlus, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface EmptySharesStateProps {
  onCreateShare: () => void;
}

export function EmptySharesState({ onCreateShare }: EmptySharesStateProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-secondary/20 py-14 text-center">
      <IconShare className="h-10 w-10 text-primary/70" />
      <p className="text-muted-foreground">{t("shares.empty.message")}</p>
      <Button variant="default" size="sm" onClick={onCreateShare} className="gap-2">
        <IconPlus className="h-4 w-4" />
        {t("shares.empty.createButton")}
      </Button>
    </div>
  );
}
