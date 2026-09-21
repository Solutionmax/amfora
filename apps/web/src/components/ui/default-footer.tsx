"use client";

import { BrandCredit } from "@/components/brand/brand-credit";
import { useSecureConfigValue } from "@/hooks/use-secure-configs";
import packageJson from "../../../package.json";

const { version } = packageJson;

export function DefaultFooter() {
  const { value: hideVersion } = useSecureConfigValue("hideVersion");

  const shouldHideVersion = hideVersion === "true";

  return (
    <footer className="w-full flex items-center justify-center px-5 py-6">
      <div className="flex flex-col items-center">
        <BrandCredit className="text-xs text-muted-foreground hover:text-primary sm:text-sm" />
        {!shouldHideVersion && <span className="text-muted-foreground text-[11px] mt-1">v{version}</span>}
      </div>
    </footer>
  );
}
