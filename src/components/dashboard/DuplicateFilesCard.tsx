import { StatCard } from "@/components/dashboard/StatCard";
import { Copy } from "lucide-react";
import { formatBytes, formatCount } from "@/types/format";
import type { MockDuplicateSummary } from "@/mocks/dashboard";

interface DuplicateFilesCardProps {
  data: MockDuplicateSummary | null;
  loading?: boolean;
}

export function DuplicateFilesCard({ data, loading }: DuplicateFilesCardProps) {
  if (loading) {
    return <StatCard title="Duplicate Files" value="" loading />;
  }

  if (!data || data.group_count === 0) {
    return (
      <StatCard
        title="Duplicate Files"
        value="0"
        subtitle="No duplicates found"
        icon={<Copy className="h-5 w-5" />}
        empty
        emptyMessage="No duplicate files detected"
      />
    );
  }

  return (
    <StatCard
      title="Duplicate Files"
      value={formatCount(data.group_count)}
      subtitle={`${formatBytes(data.total_wasted_bytes)} potentially wasted`}
      icon={<Copy className="h-5 w-5" />}
      trend={{ direction: "down", label: `${formatCount(data.group_count)} groups` }}
    />
  );
}
