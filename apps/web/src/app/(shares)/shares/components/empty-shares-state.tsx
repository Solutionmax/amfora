import { IconPlus, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface EmptySharesStateProps {
  onCreateShare: () => void;
}

export function EmptySharesState({ onCreateShare }: EmptySharesStateProps) {
  const t = useTranslations();

  return (
    <div className="text-center py-6 flex flex-col items-center gap-2">
      <IconShare className="w-8 h-8 text-gray-500" />
      <p className="text-gray-500">{t("shares.empty.message")}</p>
      <Button variant="default" size="sm" onClick={onCreateShare} className="gap-2">
        <IconPlus className="h-4 w-4" />
        {t("shares.empty.createButton")}
      </Button>
    </div>
  );
}
