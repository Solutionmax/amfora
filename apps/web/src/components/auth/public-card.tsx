import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** The working card on a public page: a short title, one muted line, then the form. */
export function PublicCard({
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
    <div className={cn("flex flex-col gap-6 px-6 py-7 md:px-7", className)}>
      <div>
        <h2 className="font-display text-xl [overflow-wrap:anywhere] font-semibold tracking-[-0.02em]">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-5 text-ink-3">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/** Inline message for a failed submit, above the form fields. */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-[var(--radius)] bg-bad-soft px-3 py-2.5 text-[13px] text-bad">
      {children}
    </p>
  );
}

/** Centered secondary link under a public form ("Back to sign in", "Forgot password?"). */
export function PublicCardFoot({ children }: { children: ReactNode }) {
  return <div className="flex justify-center text-[13px]">{children}</div>;
}

/** Placeholder with the shape of a public form while its settings load. */
export function PublicFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="grid gap-4" aria-hidden="true">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="grid gap-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="mt-2 h-10 w-full" />
    </div>
  );
}
