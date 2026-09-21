import { cn } from "@/lib/utils";

/** Wax seal stamp. Marks a share as closed: password, expiry and download limit in force. */
export function Seal({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-20 w-20 -rotate-6 items-center justify-center rounded-full bg-ink text-background shadow-[0_10px_24px_-12px_rgba(14,32,54,0.7)]",
        className
      )}
    >
      <span className="flex h-[3.9rem] w-[3.9rem] items-center justify-center rounded-full border border-dashed border-seal-foreground/60">
        <svg viewBox="0 0 100 100" className="h-8 w-8" aria-hidden="true" focusable="false">
          <g fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M37 13 H63" />
            <path d="M43 13 V27" />
            <path d="M57 13 V27" />
            <path d="M43 29 C30 29 22 37 26 46" />
            <path d="M57 29 C70 29 78 37 74 46" />
            <path d="M43 27 C28 36 22 54 32 70 C37 78 42 83 46 87" />
            <path d="M57 27 C72 36 78 54 68 70 C63 78 58 83 54 87" />
            <path d="M44 88 H56" />
          </g>
        </svg>
      </span>
    </span>
  );
}
