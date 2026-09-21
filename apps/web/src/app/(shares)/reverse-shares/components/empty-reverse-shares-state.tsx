import { IconInbox, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function EmptyReverseSharesState({ onCreateReverseShare }: { onCreateReverseShare: () => void }) {
  const t = useTranslations();

  return (
    <div className="card-soft flex flex-col items-center rounded-[calc(var(--radius)+4px)] border border-line bg-surface px-6 py-14 text-center">
      <span className="tile">
        <IconInbox className="size-5" />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold">{t("reverseShares.empty.title")}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-3">{t("reverseShares.empty.description")}</p>
      <Button className="mt-5" onClick={onCreateReverseShare}>
        <IconPlus className="size-4" />
        {t("reverseShares.empty.createButton")}
      </Button>
    </div>
  );
}
