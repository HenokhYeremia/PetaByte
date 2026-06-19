export type MockHealthStatus = "idle" | "analyzing" | "ready" | "error";

export interface MockHealthScore {
  overall_score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  status_label: string;
  last_analysis: string | null;
}

export interface MockHealthFactor {
  name: string;
  label: string;
  score: number;
  weight: number;
  impact: "positive" | "negative" | "neutral";
  color: string;
  icon: string;
  description: string;
}

export interface MockHealthRecommendation {
  id: string;
  message: string;
  priority: "high" | "medium" | "low";
  impact_estimate: string;
  action_label: string;
}

export interface MockPotentialSavings {
  duplicate_savings: number;
  cache_savings: number;
  large_file_savings: number;
}

export interface MockTrendDataPoint {
  date: string;
  value: number;
}

export interface MockHealthTrend {
  health: MockTrendDataPoint[];
  storage: MockTrendDataPoint[];
  savings: MockTrendDataPoint[];
}

const now = new Date();
const day = (n: number) => {
  const d = new Date(now.getTime() - n * 86400000);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
};

export const mockHealthScore: MockHealthScore = {
  overall_score: 72,
  grade: "C",
  status_label: "Fair",
  last_analysis: "15 Jun, 17:30",
};

export const mockHealthFactors: MockHealthFactor[] = [
  {
    name: "free_space",
    label: "Free Space",
    score: 45,
    weight: 30,
    impact: "negative",
    color: "#f97316",
    icon: "HardDrive",
    description: "35% free — below recommended 50% threshold",
  },
  {
    name: "duplicate",
    label: "Duplicate Files",
    score: 68,
    weight: 15,
    impact: "negative",
    color: "#eab308",
    icon: "Copy",
    description: "12.5 GB wasted across 1,542 duplicate groups",
  },
  {
    name: "cache",
    label: "Temp & Cache",
    score: 72,
    weight: 15,
    impact: "negative",
    color: "#eab308",
    icon: "Trash2",
    description: "6.8 GB of cache safe to remove",
  },
  {
    name: "large_files",
    label: "Large Files",
    score: 82,
    weight: 10,
    impact: "neutral",
    color: "#22c55e",
    icon: "File",
    description: "87 files over 100 MB consuming 45.3 GB",
  },
  {
    name: "fragmentation",
    label: "Fragmentation",
    score: 90,
    weight: 15,
    impact: "positive",
    color: "#22c55e",
    icon: "Zap",
    description: "File density and distribution within healthy range",
  },
  {
    name: "file_age",
    label: "File Age",
    score: 78,
    weight: 10,
    impact: "neutral",
    color: "#22c55e",
    icon: "Clock",
    description: "Most files are recent — old file ratio is low",
  },
  {
    name: "disk_health",
    label: "Disk Health",
    score: 95,
    weight: 5,
    impact: "positive",
    color: "#22c55e",
    icon: "Activity",
    description: "No SMART issues detected",
  },
];

export const mockHealthRecommendations: MockHealthRecommendation[] = [
  {
    id: "R01",
    message: "Free up space — drive critically full at 65% usage",
    priority: "high",
    impact_estimate: "Free ~150 GB",
    action_label: "Start Scan",
  },
  {
    id: "R07",
    message: "Run duplicate detector to reclaim 12.5 GB of wasted space",
    priority: "high",
    impact_estimate: "Reclaim ~12.5 GB",
    action_label: "Find Duplicates",
  },
  {
    id: "R08",
    message: "Run cache cleaner to remove 6.8 GB of safe-to-delete cache",
    priority: "high",
    impact_estimate: "Reclaim ~6.8 GB",
    action_label: "Clean Cache",
  },
  {
    id: "R05",
    message: "Review 87 large files over 100 MB (45.3 GB total)",
    priority: "medium",
    impact_estimate: "Free ~20 GB",
    action_label: "View Files",
  },
  {
    id: "R04",
    message: "Clear temporary files and application cache",
    priority: "medium",
    impact_estimate: "Reclaim ~2.4 GB",
    action_label: "Clean Cache",
  },
  {
    id: "R09",
    message: "Consolidate small files across directories with high density",
    priority: "low",
    impact_estimate: "Optimize ~500 MB",
    action_label: "Analyze",
  },
];

export const mockPotentialSavings: MockPotentialSavings = {
  duplicate_savings: 12_500_000_000,
  cache_savings: 6_800_000_000,
  large_file_savings: 20_000_000_000,
};

export const mockHealthTrend: MockHealthTrend = {
  health: [
    { date: day(29), value: 68 },
    { date: day(27), value: 65 },
    { date: day(25), value: 70 },
    { date: day(23), value: 72 },
    { date: day(21), value: 69 },
    { date: day(19), value: 71 },
    { date: day(17), value: 66 },
    { date: day(15), value: 68 },
    { date: day(13), value: 73 },
    { date: day(11), value: 70 },
    { date: day(9), value: 74 },
    { date: day(7), value: 71 },
    { date: day(5), value: 69 },
    { date: day(3), value: 72 },
    { date: day(1), value: 70 },
    { date: day(0), value: 72 },
  ],
  storage: [
    { date: day(29), value: 60 },
    { date: day(27), value: 61 },
    { date: day(25), value: 62 },
    { date: day(23), value: 62 },
    { date: day(21), value: 63 },
    { date: day(19), value: 63 },
    { date: day(17), value: 64 },
    { date: day(15), value: 64 },
    { date: day(13), value: 65 },
    { date: day(11), value: 65 },
    { date: day(9), value: 65 },
    { date: day(7), value: 65 },
    { date: day(5), value: 65 },
    { date: day(3), value: 65 },
    { date: day(1), value: 65 },
    { date: day(0), value: 65 },
  ],
  savings: [
    { date: day(29), value: 35 },
    { date: day(27), value: 34 },
    { date: day(25), value: 36 },
    { date: day(23), value: 35 },
    { date: day(21), value: 37 },
    { date: day(19), value: 36 },
    { date: day(17), value: 38 },
    { date: day(15), value: 37 },
    { date: day(13), value: 39 },
    { date: day(11), value: 38 },
    { date: day(9), value: 39 },
    { date: day(7), value: 38 },
    { date: day(5), value: 39 },
    { date: day(3), value: 39 },
    { date: day(1), value: 39 },
    { date: day(0), value: 39.3 },
  ],
};
