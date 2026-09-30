import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Quiet empty state: grey icon, one sentence, optional action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-4 py-14 text-center", className)}>
      {icon && <span className="mb-1 text-ink-icon [&_svg]:size-7">{icon}</span>}
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-[42ch] text-[13px] text-ink-3">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
