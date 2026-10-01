import type { ComponentProps } from "react";

import { FormSection } from "@/components/ui/form-section";
import { cn } from "@/lib/utils";

/** FormSection with the narrower label column of the two-column customization page. */
export function FormBlock({ className, ...props }: ComponentProps<typeof FormSection>) {
  return <FormSection className={cn("lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-7", className)} {...props} />;
}
