import { Button } from "@/components/ui/Button";
import { Eye, EyeOff, Move, FileDown, SearchX } from "lucide-react";

interface DuplicateActionsProps {
  selectedCount: number;
  selectedSavings: number;
  onPreviewMove?: () => void;
  onPreviewDelete?: () => void;
  onSmartMove?: () => void;
  onExportReport?: () => void;
  loading?: boolean;
}

export function DuplicateActions({
  selectedCount,
  selectedSavings,
  onPreviewMove,
  onPreviewDelete,
  onSmartMove,
  onExportReport,
  loading,
}: DuplicateActionsProps) {
  const hasSelection = selectedCount > 0;

  if (loading) {
    return (
      <div className="flex animate-pulse items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-9 w-28 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-28 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-28 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="ml-auto h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasSelection}
          onClick={onPreviewMove}
        >
          <Eye className="h-4 w-4" />
          Preview Move
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasSelection}
          onClick={onPreviewDelete}
        >
          <EyeOff className="h-4 w-4" />
          Preview Delete
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!hasSelection}
          onClick={onSmartMove}
        >
          <Move className="h-4 w-4" />
          Smart Move
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExportReport}
        >
          <FileDown className="h-4 w-4" />
          Export Report
        </Button>
      </div>
      {hasSelection && (
        <div className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedCount}</span> file{selectedCount !== 1 ? "s" : ""} selected ·
          ~{formatSavings(selectedSavings)} reclaimable
        </div>
      )}
      {!hasSelection && (
        <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
          <SearchX className="h-3.5 w-3.5" />
          Select files to take action
        </div>
      )}
    </div>
  );
}

function formatSavings(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}
