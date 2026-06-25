import { Button } from "@/components/ui/Button";
import { ScanSearch, Eye, Trash2, ArrowRight, Loader2 } from "lucide-react";
import type { CacheStatus } from "@/types";

interface CacheActionsProps {
  status: CacheStatus;
  hasSelection: boolean;
  onAnalyze: () => void;
  onPreview: () => void;
  onClean: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function CacheActions({
  status,
  hasSelection,
  onAnalyze,
  onPreview,
  onClean,
  onCancel,
  loading,
}: CacheActionsProps) {
  const isIdle = status === "idle";
  const isAnalyzing = status === "analyzing";
  const isPreviewing = status === "previewing" || status === "ready";
  const isCleaning = status === "cleaning";
  const isTerminal = status === "completed" || status === "cancelled" || status === "failed";

  if (loading) {
    return (
      <div className="flex gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(isIdle || isTerminal) && (
        <Button variant="primary" size="md" onClick={onAnalyze} disabled={isAnalyzing}>
          <ScanSearch className="h-4 w-4" />
          Analyze
        </Button>
      )}
      {isAnalyzing && (
        <Button variant="secondary" size="md" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing...
        </Button>
      )}
      {isPreviewing && (
        <>
          <Button variant="secondary" size="md" onClick={onPreview} disabled={!hasSelection}>
            <Eye className="h-4 w-4" />
            Preview Cleanup
          </Button>
          <Button variant="primary" size="md" onClick={onClean} disabled={!hasSelection}>
            <Trash2 className="h-4 w-4" />
            Start Cleanup
          </Button>
        </>
      )}
      {isCleaning && (
        <Button variant="danger" size="md" onClick={onCancel}>
          <ArrowRight className="h-4 w-4" />
          Cancel
        </Button>
      )}
    </div>
  );
}
