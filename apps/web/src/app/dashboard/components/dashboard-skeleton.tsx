import { FilesTableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Facts, a few file rows and a few share lines, while the dashboard loads. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy="true">
      <div className="grid grid-cols-2 border-y border-line md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2 py-[18px] pr-5 [&:nth-child(n+2)]:pl-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="mb-3 h-4 w-28" />
        <FilesTableSkeleton rowCount={4} withCheckbox={false} />
      </div>
      <div>
        <Skeleton className="mb-3 h-4 w-28" />
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex h-[60px] items-center gap-3.5 border-t border-line">
            <Skeleton className="size-[17px] rounded-[5px]" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <Skeleton className="h-8 w-24 max-sm:hidden" />
          </div>
        ))}
      </div>
    </div>
  );
}
