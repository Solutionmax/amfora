import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent h-5 px-[7px] text-[11.5px] leading-none font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-[11px] gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "[--tc:var(--info)] tag-tint",
        ok: "[--tc:var(--ok)] tag-tint",
        warn: "[--tc:var(--warn)] tag-tint",
        bad: "[--tc:var(--bad)] tag-tint",
        info: "[--tc:var(--info)] tag-tint",
        muted: "[--tc:var(--ink-3)] tag-tint",
        secondary: "[--tc:var(--ink-2)] tag-tint",
        destructive: "[--tc:var(--bad)] tag-tint",
        outline: "border-line-2 text-ink-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
