"use client";

import { useAppInfo } from "@/contexts/app-info-context";

export function Favicon() {
  const { appLogo } = useAppInfo();

  return (
    <>
      <link rel="icon" type="image/x-icon" href={appLogo || "/favicon.ico"} />
      <link rel="shortcut icon" type="image/x-icon" href={appLogo || "/favicon.ico"} />
    </>
  );
}
