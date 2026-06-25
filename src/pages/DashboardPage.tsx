import { useEffect, useState } from "react";
import { DashboardGrid, DashboardSection } from "@/components/dashboard/DashboardGrid";
import { StorageOverviewCard } from "@/components/dashboard/StorageOverviewCard";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { DuplicateFilesCard } from "@/components/dashboard/DuplicateFilesCard";
import { CacheCleanerCard } from "@/components/dashboard/CacheCleanerCard";
import { LargeFilesCard } from "@/components/dashboard/LargeFilesCard";
import { RecentScanCard } from "@/components/dashboard/RecentScanCard";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { ScanStatusWidget } from "@/components/dashboard/ScanStatusWidget";
import { fetchHealthScore } from "@/bridge/health";
import { fetchDuplicates } from "@/bridge/duplicates";
import { scanCacheTauri } from "@/bridge/cache";
import type { StorageOverview, HealthScore, DuplicateSummary, CacheSummary, LargeFileSummary, RecentScan, ScanStatusData } from "@/types";

interface DashboardState {
  storage: StorageOverview | null;
  health: HealthScore | null;
  duplicates: DuplicateSummary | null;
  cache: CacheSummary | null;
  largeFiles: LargeFileSummary | null;
  recentScan: RecentScan | null;
  scanStatus: ScanStatusData | null;
}

const EMPTY_STATUS: ScanStatusData = { is_scanning: false, last_scan_at: null, total_scans: 0, total_files_scanned: 0, status: "idle", current_file: "", progress_percent: 0 };
const EMPTY_LARGE: LargeFileSummary = { count: 0, total_size: 0, largest_file: null, threshold_mb: 100, file_count: 0, total_size_bytes: 0 };

export function DashboardPage() {
  const [data, setData] = useState<DashboardState>({
    storage: null, health: null, duplicates: null, cache: null, largeFiles: null, recentScan: null, scanStatus: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [healthResult, dupResult, cacheResult] = await Promise.allSettled([
          fetchHealthScore(),
          fetchDuplicates(),
          scanCacheTauri(),
        ]);

        if (cancelled) return;

        const newData: DashboardState = {
          storage: null, health: null, duplicates: null, cache: null,
          largeFiles: EMPTY_LARGE, recentScan: null, scanStatus: EMPTY_STATUS,
        };

        if (healthResult.status === "fulfilled") {
          const h = healthResult.value;
          newData.health = h.score;
          newData.storage = {
            total_capacity: 0, used_space: 0, free_space: 0,
            file_count: 0, directory_count: 0, volume_name: "",
            total_bytes: 0, used_bytes: 0, free_bytes: 0, usage_percent: 0,
          };
        }

        if (dupResult.status === "fulfilled") {
          newData.duplicates = dupResult.value.summary;
        }

        if (cacheResult.status === "fulfilled") {
          newData.cache = cacheResult.value.summary;
        }

        setData(newData);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load dashboard data: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <ScanStatusWidget data={data.scanStatus ?? EMPTY_STATUS} />
      </div>

      <DashboardSection title="Storage Overview">
        <StorageOverviewCard data={data.storage} loading={loading} />
      </DashboardSection>

      <DashboardGrid>
        <HealthScoreCard data={data.health} loading={loading} />
        <DuplicateFilesCard data={data.duplicates} loading={loading} />
        <CacheCleanerCard data={data.cache} loading={loading} />
        <LargeFilesCard data={data.largeFiles ?? EMPTY_LARGE} loading={loading} />
      </DashboardGrid>

      <DashboardGrid>
        <RecentScanCard data={data.recentScan} loading={loading} />
        <QuickActionsPanel />
      </DashboardGrid>
    </div>
  );
}
