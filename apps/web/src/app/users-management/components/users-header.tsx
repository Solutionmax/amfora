import { IconLink, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { UsersHeaderProps } from "../types";

/** Page actions: invite link (secondary) and add user (primary). */
export function UsersHeader({ onCreateUser, onGenerateInvite }: UsersHeaderProps) {
  const t = useTranslations();

  return (
    <>
      <Button type="button" variant="outline" onClick={onGenerateInvite}>
        <IconLink aria-hidden="true" />
        {t("users.calm.inviteLink")}
      </Button>
      <Button type="button" onClick={onCreateUser}>
        <IconPlus aria-hidden="true" />
        {t("users.calm.addUser")}
      </Button>
    </>
  );
}
