import { type ReactNode } from "react";
import { clsx } from "clsx";

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div
      className={clsx(
        "grid gap-6",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("space-y-4", className)}>
      {(title || description) && (
        <div>
          {title && (
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
