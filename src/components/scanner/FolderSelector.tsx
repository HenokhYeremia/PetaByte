import { FolderOpen, Home, FileText, Folder, X } from "lucide-react";
import { clsx } from "clsx";

interface QuickPath {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface FolderSelectorProps {
  path: string;
  onPathChange: (path: string) => void;
  onBrowse?: () => void;
  error?: string | null;
  loading?: boolean;
}

const quickPaths: QuickPath[] = [
  { label: "Home", path: "C:\\Users\\Lenovo", icon: <Home className="h-3.5 w-3.5" /> },
  { label: "Desktop", path: "C:\\Users\\Lenovo\\Desktop", icon: <FileText className="h-3.5 w-3.5" /> },
  { label: "Documents", path: "C:\\Users\\Lenovo\\Documents", icon: <Folder className="h-3.5 w-3.5" /> },
  { label: "Downloads", path: "C:\\Users\\Lenovo\\Downloads", icon: <FolderOpen className="h-3.5 w-3.5" /> },
];

export function FolderSelector({ path, onPathChange, onBrowse, error, loading }: FolderSelectorProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-20 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Target Folder</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <FolderOpen className="h-4 w-4 text-zinc-400" />
          </div>
          <input
            type="text"
            value={path}
            onChange={(e) => onPathChange(e.target.value)}
            placeholder="Select a folder or type a path..."
            className={clsx(
              "w-full rounded-lg border bg-white py-2 pl-10 pr-8 text-sm text-zinc-900 placeholder-zinc-400 transition-colors dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500",
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700"
                : "border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-zinc-700",
              "focus:outline-none focus:ring-2",
            )}
          />
          {path && (
            <button
              type="button"
              onClick={() => onPathChange("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onBrowse}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Folder className="h-4 w-4" />
          Browse
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {quickPaths.map((qp) => (
          <button
            key={qp.path}
            type="button"
            onClick={() => onPathChange(qp.path)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              path === qp.path
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
            )}
          >
            {qp.icon}
            {qp.label}
          </button>
        ))}
      </div>
    </div>
  );
}
