import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800",
        className,
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
      <Skeleton className="mb-4 h-4 w-3/4" />
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={clsx("h-10 w-full", i === 0 && "mb-6 h-8 w-1/4")} />
      ))}
    </div>
  );
}
