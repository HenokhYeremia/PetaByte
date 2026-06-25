import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FilterX, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { clsx } from "clsx";
import type { IgnoreRule } from "@/types";

interface IgnoreRulesPreviewProps {
  rules: IgnoreRule[];
  onToggle: (id: string) => void;
  onAddRule?: () => void;
  loading?: boolean;
}

export function IgnoreRulesPreview({ rules, onToggle, onAddRule, loading }: IgnoreRulesPreviewProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ignore Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 flex-1 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ignore Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FilterX className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-400">No ignore rules configured</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ignore Rules</CardTitle>
        <span className="text-xs text-zinc-400">{enabledCount} of {rules.length} active</span>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <button
                type="button"
                onClick={() => onToggle(rule.id)}
                className={clsx(
                  "shrink-0 transition-colors",
                  rule.enabled ? "text-emerald-500" : "text-zinc-300 dark:text-zinc-600",
                )}
                title={rule.enabled ? "Disable rule" : "Enable rule"}
              >
                {rule.enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              </button>
              <span
                className={clsx(
                  "flex-1 truncate font-mono text-xs",
                  rule.enabled
                    ? "text-zinc-700 dark:text-zinc-300"
                    : "text-zinc-400 line-through dark:text-zinc-600",
                )}
              >
                {rule.pattern || <span className="italic text-zinc-400">(empty)</span>}
              </span>
              <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-600">{rule.description}</span>
              {rule.builtin && (
                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                  built-in
                </span>
              )}
            </div>
          ))}
        </div>
        {onAddRule && (
          <button
            type="button"
            onClick={onAddRule}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Add custom rule
          </button>
        )}
      </CardContent>
    </Card>
  );
}
