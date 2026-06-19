import { DashboardGrid, DashboardSection } from "@/components/dashboard/DashboardGrid";
import { StorageOverviewCard } from "@/components/dashboard/StorageOverviewCard";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { DuplicateFilesCard } from "@/components/dashboard/DuplicateFilesCard";
import { CacheCleanerCard } from "@/components/dashboard/CacheCleanerCard";
import { LargeFilesCard } from "@/components/dashboard/LargeFilesCard";
import { RecentScanCard } from "@/components/dashboard/RecentScanCard";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { ScanStatusWidget } from "@/components/dashboard/ScanStatusWidget";
import { mockDashboardData } from "@/mocks/dashboard";

export function DashboardPage() {
  const data = mockDashboardData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <ScanStatusWidget data={data.scanStatus} />
      </div>

      <DashboardSection title="Storage Overview">
        <StorageOverviewCard data={data.storage} />
      </DashboardSection>

      <DashboardGrid>
        <HealthScoreCard data={data.health} />
        <DuplicateFilesCard data={data.duplicates} />
        <CacheCleanerCard data={data.cache} />
        <LargeFilesCard data={data.largeFiles} />
      </DashboardGrid>

      <DashboardGrid>
        <RecentScanCard data={data.recentScan} />
        <QuickActionsPanel />
      </DashboardGrid>
    </div>
  );
}
