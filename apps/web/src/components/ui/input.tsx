import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-line-2 flex h-10 w-full min-w-0 rounded-[var(--radius)] border bg-surface px-3 py-2 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-[color-mix(in_oklab,var(--line-2)_60%,var(--ink-3))] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15",
        "aria-invalid:border-bad aria-invalid:ring-bad/20",
        className
      )}
      {...props}
    />
  );
}

export { Input };
