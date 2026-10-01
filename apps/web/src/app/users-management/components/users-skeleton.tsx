import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 4;

/** Placeholder rows in the shape of the users table. */
export function UsersSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex gap-5">
          {[28, 44, 70, 88].map((width) => (
            <Skeleton key={width} className="h-4" style={{ width }} />
          ))}
        </div>
        <Skeleton className="hidden h-9 w-[260px] md:block" />
      </div>
      <div className="border-t border-line">
        {Array.from({ length: ROWS }, (_, index) => (
          <div key={index} className="flex h-14 items-center gap-4 border-b border-line px-3">
            <Skeleton className="size-[34px] rounded-full" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="hidden h-3.5 w-44 md:block" />
            <Skeleton className="hidden h-3.5 w-20 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
