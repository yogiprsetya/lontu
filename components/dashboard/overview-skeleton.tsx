import { Skeleton } from '../ui/skeleton';

export const OverviewSkeleton = () => (
  <>
    <header className="mx-auto mb-6 flex w-full max-w-330 items-center justify-between lg:mb-7">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-52" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="hidden h-9 w-36 sm:block" />
        <Skeleton className="hidden size-9 sm:block" />
        <Skeleton className="size-10 rounded-full" />
      </div>
    </header>

    <div className="mx-auto w-full max-w-330">
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl" />
        ))}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>

      <Skeleton className="mt-5 h-64 w-full rounded-xl" />
    </div>
  </>
);
