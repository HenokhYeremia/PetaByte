import { StatCard } from "@/components/dashboard/StatCard";
import { FileText } from "lucide-react";
import { formatBytes, formatCount } from "@/types/format";
import type { MockLargeFileSummary } from "@/mocks/dashboard";

interface LargeFilesCardProps {
  data: MockLargeFileSummary | null;
  loading?: boolean;
}

export function LargeFilesCard({ data, loading }: LargeFilesCardProps) {
  if (loading) {
    return <StatCard title="Large Files" value="" loading />;
  }

  if (!data || data.file_count === 0) {
    return (
      <StatCard
        title="Large Files"
        value="0"
        subtitle="No large files found"
        icon={<FileText className="h-5 w-5" />}
        empty
        emptyMessage="No large files detected"
      />
    );
  }

  return (
    <StatCard
      title="Large Files"
      value={formatCount(data.file_count)}
      subtitle={`${formatBytes(data.total_size_bytes)} total`}
      icon={<FileText className="h-5 w-5" />}
    />
  );
}
