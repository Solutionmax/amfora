import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Settings block: title and a short explanation on the left, the controls on the right. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-4 border-t border-line py-7 first:border-t-0 first:pt-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10 md:py-8",
        className
      )}
    >
      <header>
        <h2 className="font-sans text-[14.5px] font-semibold tracking-normal">{title}</h2>
        {description && <p className="mt-1 max-w-[30ch] text-[13px] text-ink-3 max-md:max-w-none">{description}</p>}
      </header>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[18px]">{children}</div>
    </section>
  );
}

/** Label, optional hint and one control stacked. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12.5px] text-bad">{error}</p>
      ) : (
        hint && <p className="text-[12.5px] text-ink-3">{hint}</p>
      )}
    </div>
  );
}
