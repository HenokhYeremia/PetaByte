import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FolderOpen, History, Star, MapPin, X } from "lucide-react";
import { clsx } from "clsx";
import type { SuggestedLocation, RecentDestination } from "@/types";

interface DestinationSelectorProps {
  destination: string;
  destinationError: string | null;
  suggestedLocations: SuggestedLocation[];
  recentDestinations: RecentDestination[];
  onDestinationChange: (path: string) => void;
  onBrowse: () => void;
  onClear: () => void;
  loading?: boolean;
}

const typeIcons: Record<string, typeof Star> = {
  frequent: Star,
  recent: History,
  smart: MapPin,
  volume: FolderOpen,
  folder: FolderOpen,
};

const typeLabels: Record<string, string> = {
  frequent: "Frequent",
  recent: "Recent",
  smart: "Smart",
  volume: "Volume",
  folder: "Folder",
};

export function DestinationSelector({
  destination,
  destinationError,
  suggestedLocations,
  recentDestinations,
  onDestinationChange,
  onBrowse,
  onClear,
  loading,
}: DestinationSelectorProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Destination</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-10 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-28 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Destination</CardTitle>
          <MapPin className="h-4 w-4 text-zinc-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FolderOpen className="pointer-events-none absolute inset-y-0 left-0 ml-3 h-4 w-4 self-center text-zinc-400" />
              <input
                type="text"
                value={destination}
                onChange={(e) => onDestinationChange(e.target.value)}
                placeholder="Select destination folder..."
                className={clsx(
                  "w-full rounded-md border py-2 pl-10 pr-8 text-sm focus:outline-none focus:ring-2",
                  destinationError
                    ? "border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500/20 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100"
                    : "border-zinc-300 bg-white text-zinc-900 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
                )}
              />
              {destination && (
                <button
                  type="button"
                  onClick={onClear}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button variant="secondary" size="md" onClick={onBrowse}>
              <FolderOpen className="h-4 w-4" />
              Browse
            </Button>
          </div>
          {destinationError && (
            <p className="mt-1 text-xs text-red-500">{destinationError}</p>
          )}
        </div>

        {suggestedLocations.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Suggested Locations</div>
            <div className="flex flex-wrap gap-2">
              {suggestedLocations.map((loc) => {
                const Icon = typeIcons[loc.type];
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => onDestinationChange(loc.path)}
                    className={clsx(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors",
                      destination === loc.path
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">{loc.label}</span>
                    <span className="ml-1 text-[10px] text-zinc-400">{typeLabels[loc.type]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {recentDestinations.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Recent Destinations</div>
            <div className="space-y-1">
              {recentDestinations.map((rd) => (
                <button
                  key={rd.id}
                  type="button"
                  onClick={() => onDestinationChange(rd.path)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs transition-colors",
                    destination === rd.path
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800",
                  )}
                >
                  <History className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{rd.label}</div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                      <span>{rd.move_count} moves</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {suggestedLocations.length === 0 && recentDestinations.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <MapPin className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">No suggested destinations</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Browse or type a path to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
