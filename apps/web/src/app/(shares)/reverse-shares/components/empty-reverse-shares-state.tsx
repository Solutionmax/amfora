import { IconPlus, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface EmptyReverseSharesStateProps {
  onCreateReverseShare: () => void;
}

export function EmptyReverseSharesState({ onCreateReverseShare }: EmptyReverseSharesStateProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-secondary/20 py-14 text-center">
      <div className="mb-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <IconUpload className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <h3 className="text-lg font-semibold">{t("reverseShares.empty.title")}</h3>
        <p className="text-muted-foreground max-w-md">{t("reverseShares.empty.description")}</p>
      </div>

      <Button onClick={onCreateReverseShare}>
        <IconPlus className="h-4 w-4" />
        {t("reverseShares.empty.createButton")}
      </Button>
    </div>
  );
}
