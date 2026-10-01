import { Skeleton } from "@/components/ui/skeleton";

interface FilesGridSkeletonProps {
  itemCount?: number;
}

/** Thin-bordered cards shaped like the file grid while it loads. */
export function FilesGridSkeleton({ itemCount = 10 }: FilesGridSkeletonProps) {
  return (
    <div aria-hidden>
      <Skeleton className="mb-3 h-4 w-24" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-xl border border-line p-3">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <div className="flex flex-col gap-1.5 px-0.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
