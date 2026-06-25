import { invoke } from "@tauri-apps/api/core";
import type { HealthFactor, HealthRecommendation, HealthScore, PotentialSavings, HealthTrend } from "@/types";
import type { HealthMetrics } from "@/types";

export interface HealthBridgeResult {
  score: HealthScore;
  factors: HealthFactor[];
  recommendations: HealthRecommendation[];
  savings: PotentialSavings;
  trend: HealthTrend;
}

interface RustHealthFactorDto {
  name: string;
  score: number;
  weight: number;
  description: string;
}

interface RustHealthResultDto {
  overall_score: number;
  factors: RustHealthFactorDto[];
  total_files: number;
  total_size_bytes: number;
  free_space_bytes: number;
  scanned_at: string;
}

function parseRaw<T>(raw: unknown): T {
  if (typeof raw === "string") return JSON.parse(raw) as T;
  return raw as T;
}

function overallToGrade(score: number): "A" | "B" | "C" | "D" | "E" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "E";
}

function mapFactor(f: RustHealthFactorDto): HealthFactor {
  const impactColors: Record<string, string> = {
    storage: "emerald", duplicates: "amber", cache: "blue",
    fragmentation: "purple", temp_files: "rose", system: "zinc", access: "cyan",
  };
  const color = impactColors[f.name.toLowerCase()] ?? "zinc";
  return {
    name: f.name,
    label: f.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    score: f.score,
    weight: f.weight,
    impact: f.score * f.weight,
    color,
    icon: f.name.toLowerCase(),
    description: f.description,
  };
}

export async function fetchHealthScore(): Promise<HealthBridgeResult> {
  const raw: unknown = await invoke("get_health_score");
  const dto = parseRaw<RustHealthResultDto>(raw);

  const factors = dto.factors.map(mapFactor);

  const score: HealthScore = {
    overall_score: dto.overall_score,
    grade: overallToGrade(dto.overall_score),
    factors,
    recommendations: [],
    savings: {
      total: 0,
      duplicates: 0,
      cache: 0,
      large_files: 0,
      duplicate_savings: 0,
      cache_savings: 0,
      large_file_savings: 0,
    },
    trend: {
      one_day: 0,
      seven_days: 0,
      thirty_days: 0,
      ninety_days: 0,
      data_points: [],
      health: [],
      storage: [],
      savings: [],
    },
    status_label: dto.overall_score >= 75 ? "Good" : dto.overall_score >= 40 ? "Fair" : "Poor",
    last_analysis: dto.scanned_at,
  };

  return {
    score,
    factors,
    recommendations: [],
    savings: score.savings,
    trend: score.trend,
  };
}

export async function fetchHealthRecommendations(metrics?: HealthMetrics): Promise<HealthRecommendation[]> {
  const raw: unknown = await invoke("get_health_recommendations", { metrics: metrics ?? null });
  return parseRaw<HealthRecommendation[]>(raw);
}
