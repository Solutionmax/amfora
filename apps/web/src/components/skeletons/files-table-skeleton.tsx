import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FilesTableSkeletonProps {
  rowCount?: number;
  /** Leave out the checkbox column (dashboard). */
  withCheckbox?: boolean;
  className?: string;
}

const NAME_WIDTHS = ["w-48", "w-36", "w-56", "w-40", "w-44", "w-32"];

/** Hairline rows shaped like the file table while it loads. */
export function FilesTableSkeleton({ rowCount = 8, withCheckbox = true, className }: FilesTableSkeletonProps) {
  return (
    <div className={cn("w-full", className)} aria-hidden>
      <div className="flex h-9 items-center gap-3.5 border-b border-line px-3 max-sm:hidden">
        {withCheckbox && <Skeleton className="size-4 rounded-[4px]" />}
        <Skeleton className="h-3 w-12" />
      </div>
      {Array.from({ length: rowCount }).map((_, index) => (
        <div key={index} className="flex h-14 items-center gap-3.5 border-b border-line px-3 max-sm:px-1">
          {withCheckbox && <Skeleton className="size-4 shrink-0 rounded-[4px] max-sm:hidden" />}
          <Skeleton className="size-[17px] shrink-0 rounded-[5px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className={cn("h-3.5 max-w-full", NAME_WIDTHS[index % NAME_WIDTHS.length])} />
            <Skeleton className="h-2.5 w-20 sm:hidden" />
          </div>
          <Skeleton className="h-3 w-14 max-sm:hidden" />
          <Skeleton className="h-3 w-20 max-md:hidden" />
          <Skeleton className="h-3 w-16 max-lg:hidden" />
          <div className="w-[88px] max-sm:hidden" />
        </div>
      ))}
    </div>
  );
}
