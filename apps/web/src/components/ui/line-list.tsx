import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Rows separated by hairlines instead of cards. */
export function LineList({ children, className, top }: { children: ReactNode; className?: string; top?: boolean }) {
  return (
    <div className={cn("flex flex-col [&>*+*]:border-t [&>*+*]:border-line", top && "border-t border-line", className)}>
      {children}
    </div>
  );
}

export function LineRow({
  icon,
  title,
  sub,
  children,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  /** Trailing controls: values, links, buttons, a switch. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[60px] items-center gap-3.5 py-3", className)}>
      {icon && <span className="grid shrink-0 place-items-center text-ink-icon [&_svg]:size-[17px]">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{title}</div>
        {sub && <div className="text-[12.5px] text-ink-3">{sub}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/** Small muted heading above a group of lines. */
export function SubHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn("font-sans text-[12.5px] font-semibold tracking-normal text-ink-3", className)}>{children}</h3>
  );
}
