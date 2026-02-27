import { IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";

export function ShareNotFound() {
  const t = useTranslations();

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
            <IconLock className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-semibold text-destructive">{t("share.notFound.title")}</h2>
        </div>
        <div className="text-center pb-8">
          <p className="text-lg text-muted-foreground">{t("share.notFound.description")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
