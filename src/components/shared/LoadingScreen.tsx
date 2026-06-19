import { Spinner } from "@/components/ui/Spinner";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8">
      <Spinner size="lg" />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-96 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-4 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mb-2 h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
