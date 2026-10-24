import { Skeleton } from '@/cafe/components/ui';

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="grid items-center gap-6 pt-24 lg:grid-cols-[1fr_auto] lg:pt-0">
        <div className="space-y-3 lg:py-10">
          <Skeleton className="h-11 w-72 rounded-2xl" />
          <Skeleton className="h-4 w-56 rounded-lg" />
        </div>
        <Skeleton className="hidden h-52 w-[30rem] rounded-[2rem] lg:block" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-60 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
