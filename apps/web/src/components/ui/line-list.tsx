import { Children, cloneElement, Fragment, isValidElement, useId, type ReactElement, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Rows separated by hairlines instead of cards. */
export function LineList({ children, className, top }: { children: ReactNode; className?: string; top?: boolean }) {
  return (
    <div className={cn("flex flex-col [&>*+*]:border-t [&>*+*]:border-line", top && "border-t border-line", className)}>
      {children}
    </div>
  );
}

const CONTROL_TAGS = ["button", "a", "input", "select", "textarea"];

/**
 * A control in the row is described by the line under the title, so a screen reader reads why it is
 * off. Always walked, with or without a line, so the children keep their place when the line comes
 * and goes. Only things that can take focus get the link: components and real controls.
 */
function describe(children: ReactNode, id: string | undefined): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const props = child.props as { "aria-describedby"?: string; children?: ReactNode };
    if (child.type === Fragment)
      return cloneElement(child as ReactElement<{ children?: ReactNode }>, undefined, describe(props.children, id));
    const isControl = typeof child.type !== "string" || CONTROL_TAGS.includes(child.type);
    if (!id || !isControl || props["aria-describedby"]) return child;
    return cloneElement(child as ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": id });
  });
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
  const subId = useId();
  return (
    <div className={cn("flex min-h-[60px] items-center gap-3.5 py-3", className)}>
      {icon && <span className="grid shrink-0 place-items-center text-ink-icon [&_svg]:size-[17px]">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{title}</div>
        {sub && (
          <div id={subId} className="text-[12.5px] text-ink-3">
            {sub}
          </div>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2">{describe(children, sub ? subId : undefined)}</div>
      )}
    </div>
  );
}

/** Small muted heading above a group of lines. */
export function SubHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn("font-sans text-[12.5px] font-semibold tracking-normal text-ink-3", className)}>{children}</h3>
  );
}
