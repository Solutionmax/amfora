import { IconLink, IconUserPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { UsersHeaderProps } from "../types";

export function UsersHeader({ onCreateUser, onGenerateInvite }: UsersHeaderProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" className="w-full font-semibold sm:w-auto" onClick={onGenerateInvite}>
        <IconLink size={18} aria-hidden="true" />
        {t("users.invite.button")}
      </Button>
      <Button type="button" className="w-full font-semibold sm:w-auto" onClick={onCreateUser}>
        <IconUserPlus size={18} aria-hidden="true" />
        {t("users.header.addUser")}
      </Button>
    </div>
  );
}
