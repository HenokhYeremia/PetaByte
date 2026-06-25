import { invoke } from "@tauri-apps/api/core";
import type { CacheCategory, CacheSummary, CleanupPreview } from "@/types";

interface RustCacheEntry {
  path: string;
  category: string | { Other: string };
  size_bytes: number;
  file_count: number;
  last_accessed: string | null;
}

export interface CacheBridgeResult {
  categories: CacheCategory[];
  summary: CacheSummary;
}

function parseRaw<T>(raw: unknown): T {
  if (typeof raw === "string") return JSON.parse(raw) as T;
  return raw as T;
}

function categoryToDisplayName(cat: string): string {
  const map: Record<string, string> = {
    Npm: "npm", Pip: "pip", Cargo: "Cargo", Maven: "Maven",
    Gradle: "Gradle", NuGet: "NuGet", Mix: "Mix", Go: "Go Modules",
    Docker: "Docker", Browser: "Browser Cache", System: "System Cache",
  };
  return map[cat] ?? cat;
}

function categoryToIcon(cat: string): string {
  const map: Record<string, string> = {
    Npm: "npm", Pip: "pip", Cargo: "rust", Maven: "maven",
    Gradle: "gradle", NuGet: "nuget", Mix: "elixir", Go: "go",
    Docker: "docker", Browser: "globe", System: "hard-drive",
  };
  return map[cat] ?? "folder";
}

function categoryToRiskLevel(cat: string): "safe" | "moderate" | "risky" {
  if (cat === "System" || cat === "Browser") return "risky";
  if (cat === "Docker") return "moderate";
  return "safe";
}

function parseCategory(raw: string | { Other: string }): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "Other" in raw) return raw.Other;
  return String(raw);
}

export async function scanCacheTauri(): Promise<CacheBridgeResult> {
  const raw: unknown = await invoke("scan_cache");
  const entries: RustCacheEntry[] = parseRaw<RustCacheEntry[]>(raw);
  return transformCacheEntries(entries);
}

function transformCacheEntries(entries: RustCacheEntry[]): CacheBridgeResult {
  const categoriesMap = new Map<string, CacheCategory>();
  let totalCacheSize = 0;
  let totalEntries = 0;

  for (const entry of entries) {
    const catName = parseCategory(entry.category);
    totalCacheSize += entry.size_bytes;
    totalEntries += entry.file_count;

    if (!categoriesMap.has(catName)) {
      categoriesMap.set(catName, {
        id: `cat-${catName.toLowerCase()}`,
        name: catName,
        display_name: categoryToDisplayName(catName),
        icon: categoryToIcon(catName),
        risk_level: categoryToRiskLevel(catName),
        total_size: 0,
        file_count: 0,
        entries: [],
      });
    }

    const cat = categoriesMap.get(catName)!;
    cat.total_size += entry.size_bytes;
    cat.file_count += entry.file_count;
    cat.entries.push({
      id: `entry-${catName}-${entry.path.replace(/[\\/:*?"<>|]/g, "_")}`,
      path: entry.path,
      name: entry.path.split(/[/\\]/).pop() ?? entry.path,
      size: entry.size_bytes,
      matched_rule: catName,
      category_id: cat.id,
      safety_status: cat.risk_level === "risky" ? "warning" : "safe",
      selected: cat.risk_level !== "risky",
    });
  }

  const categories = Array.from(categoriesMap.values());

  const safeToRemove = categories
    .filter((c) => c.risk_level !== "risky")
    .reduce((sum, c) => sum + c.total_size, 0);

  const summary: CacheSummary = {
    total_cache_size: totalCacheSize,
    potential_savings: safeToRemove,
    category_count: categories.length,
    total_entries: totalEntries,
    last_analysis: new Date().toISOString(),
    total_cache_bytes: totalCacheSize,
    safe_to_remove_bytes: safeToRemove,
  };

  return { categories, summary };
}

export async function cleanCacheTauri(): Promise<void> {
  await invoke("clean_cache");
}

export async function cacheTotalSizeTauri(): Promise<number> {
  const raw: unknown = await invoke("cache_total_size");
  return Number(raw);
}

export function computePreview(categories: CacheCategory[]): CleanupPreview {
  let files_to_remove = 0;
  let estimated_savings = 0;
  const items: CleanupPreview["items"] = [];
  let has_risky = false;
  for (const cat of categories) {
    for (const entry of cat.entries) {
      if (entry.selected) {
        files_to_remove++;
        estimated_savings += entry.size;
        items.push({ path: entry.path, size: entry.size, category: cat.name, safe: cat.risk_level !== "risky" });
        if (cat.risk_level === "risky") has_risky = true;
      }
    }
  }
  const risk_level: "low" | "medium" | "high" = has_risky ? "high" : estimated_savings > 1_000_000_000 ? "medium" : "low";
  return { files_to_remove, estimated_savings, risk_level, items };
}
