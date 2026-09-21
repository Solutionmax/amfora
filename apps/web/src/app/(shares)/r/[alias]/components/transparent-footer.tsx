"use client";

import { BrandCredit } from "@/components/brand/brand-credit";
import { useSecureConfigValue } from "@/hooks/use-secure-configs";
import packageJson from "../../../../../../package.json";

const { version } = packageJson;

export function TransparentFooter() {
  const { value: hideVersion } = useSecureConfigValue("hideVersion");

  const shouldHideVersion = hideVersion === "true";

  return (
    <footer className="absolute bottom-0 left-0 right-0 z-50 w-full flex items-center justify-center py-3 h-16 pointer-events-none">
      <div className="flex flex-col items-center pointer-events-auto">
        <BrandCredit className="text-xs text-white/70 transition-colors hover:text-primary sm:text-sm" />
        {!shouldHideVersion && <span className="text-white text-[11px] mt-1">v{version}</span>}
      </div>
    </footer>
  );
}
