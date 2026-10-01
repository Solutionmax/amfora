import { IconInbox, IconLock, IconShare } from "@tabler/icons-react";

/** The three reasons shown beside the sign-in card; texts live under public.login.trust.<key>. */
export const LOGIN_TRUST = [
  { key: "server", icon: IconLock },
  { key: "expire", icon: IconShare },
  { key: "receive", icon: IconInbox },
] as const;
