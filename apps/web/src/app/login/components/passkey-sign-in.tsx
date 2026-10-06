import { IconFingerprint } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/** Under the password form: the same sign in with a passkey, no user name needed. */
export function PasskeySignIn({ onSignIn, isBusy }: { onSignIn: () => void; isBusy: boolean }) {
  const t = useTranslations();

  return (
    <Button type="button" variant="outline" size="lg" className="w-full" onClick={onSignIn} disabled={isBusy}>
      <IconFingerprint aria-hidden="true" />
      {t("passkeys.signIn")}
    </Button>
  );
}
