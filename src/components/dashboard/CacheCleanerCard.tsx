import { StatCard } from "@/components/dashboard/StatCard";
import { Trash2 } from "lucide-react";
import { formatBytes } from "@/types/format";
import type { MockCacheSummary } from "@/mocks/dashboard";

interface CacheCleanerCardProps {
  data: MockCacheSummary | null;
  loading?: boolean;
}

export function CacheCleanerCard({ data, loading }: CacheCleanerCardProps) {
  if (loading) {
    return <StatCard title="Cache Cleaner" value="" loading />;
  }

  if (!data || data.total_cache_bytes === 0) {
    return (
      <StatCard
        title="Cache Cleaner"
        value="0 B"
        subtitle="No cache found"
        icon={<Trash2 className="h-5 w-5" />}
        empty
        emptyMessage="No cache files detected"
      />
    );
  }

  return (
    <StatCard
      title="Cache Cleaner"
      value={formatBytes(data.total_cache_bytes)}
      subtitle={`${formatBytes(data.safe_to_remove_bytes)} safely removable`}
      icon={<Trash2 className="h-5 w-5" />}
      trend={{ direction: "down", label: `${data.category_count} categories` }}
    />
  );
}
