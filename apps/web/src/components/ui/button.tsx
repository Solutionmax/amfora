import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-[7px] whitespace-nowrap rounded-[var(--radius)] text-[13px] font-semibold transition-[background-color,border-color,color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/35 aria-invalid:border-bad",
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-primary text-primary-foreground hover:border-[color-mix(in_oklab,var(--primary)_82%,#000)] hover:bg-[color-mix(in_oklab,var(--primary)_82%,#000)]",
        destructive:
          "border border-line-2 bg-surface text-bad hover:border-[color-mix(in_oklab,var(--bad)_30%,var(--line-2))] hover:bg-[color-mix(in_oklab,var(--bad)_7%,transparent)]",
        outline: "border border-line-2 bg-surface text-ink hover:bg-surface-2 [&_svg]:text-ink-icon",
        secondary: "border border-transparent bg-primary-soft text-primary hover:brightness-[0.98]",
        ghost:
          "border border-transparent text-ink-3 hover:bg-surface-2 hover:text-ink [&_svg]:text-ink-icon hover:[&_svg]:text-ink",
        link: "text-primary hover:text-[color-mix(in_oklab,var(--primary)_75%,#000)] dark:hover:text-[color-mix(in_oklab,var(--primary)_75%,#fff)]",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 gap-1.5 px-3 text-[12.5px] has-[>svg]:px-2.5",
        lg: "h-10 px-4 text-sm",
        icon: "size-8 rounded-[calc(var(--radius)-1px)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
