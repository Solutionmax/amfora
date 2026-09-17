import { IconPlus, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function EmptySharesState({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-5 py-12 text-center">
      <IconShare className="h-10 w-10 text-primary/70" />
      <div className="text-center">
        <p className="mb-4 text-muted-foreground">{t("recentShares.noShares")}</p>
        <Button variant="outline" size="sm" onClick={onCreate}>
          <IconPlus className="h-4 w-4" />
          {t("recentShares.createFirst")}
        </Button>
      </div>
    </div>
  );
}
