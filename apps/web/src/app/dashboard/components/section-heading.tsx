import type { ReactNode } from "react";
import Link from "next/link";

/** "Recent files ........ All files" above a block. */
export function SectionHeading({ title, href, linkLabel }: { title: ReactNode; href: string; linkLabel: string }) {
  return (
    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="font-sans text-[14.5px] font-semibold tracking-normal">{title}</h2>
      <Link
        href={href}
        className="rounded-sm text-[13px] font-semibold text-primary outline-none hover:text-[color-mix(in_oklab,var(--primary)_75%,var(--ink))] focus-visible:ring-[3px] focus-visible:ring-primary/35"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
