import { invoke } from "@tauri-apps/api/core";
import type { DuplicateGroup, DuplicateSummary, DuplicateFile, FileEntry } from "@/types";

export interface DuplicateBridgeResult {
  groups: DuplicateGroup[];
  summary: DuplicateSummary;
}

interface RustDuplicateMemberDto {
  file_path: string;
  file_name: string;
  file_size: number;
}

interface RustDuplicateGroupDto {
  group_id: string;
  file_size: number;
  file_count: number;
  total_wasted_bytes: number;
  members: RustDuplicateMemberDto[];
}

interface RustDuplicateResultDto {
  total_groups: number;
  total_duplicate_files: number;
  total_wasted_bytes: number;
  total_unique_size: number;
  largest_group_size: number;
  largest_group_wasted: number;
  groups: RustDuplicateGroupDto[];
  partial_hashed: number;
  full_hashed: number;
  hash_cache_hits: number;
  hash_cache_misses: number;
}

function parseRaw<T>(raw: unknown): T {
  if (typeof raw === "string") return JSON.parse(raw) as T;
  return raw as T;
}

function mapMember(id: string, m: RustDuplicateMemberDto): DuplicateFile {
  return {
    id,
    path: m.file_path,
    name: m.file_name,
    hash: "",
    size: m.file_size,
    file_name: m.file_name,
    file_path: m.file_path,
    file_size: m.file_size,
    modified_at: new Date().toISOString(),
    is_kept: false,
    is_selected: false,
    hash_status: "unknown",
  };
}

function mapGroup(dto: RustDuplicateGroupDto): DuplicateGroup {
  const files = dto.members.map((m, i) =>
    mapMember(`${dto.group_id}-member-${i}`, m),
  );
  const commonParent = files.length > 0
    ? files.reduce((p, f) => {
        const parts = f.path.split(/[/\\]/);
        parts.pop();
        const dir = parts.join("/");
        return p === "" ? dir : (p === dir ? p : commonPrefix(p, dir));
      }, "")
    : "";

  return {
    id: dto.group_id,
    file_size: dto.file_size,
    file_count: dto.file_count,
    total_wasted_bytes: dto.total_wasted_bytes,
    files,
    common_parent: commonParent,
  };
}

function commonPrefix(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.substring(0, i).replace(/[/\\]$/, "");
}

export async function fetchDuplicates(files?: FileEntry[]): Promise<DuplicateBridgeResult> {
  const raw: unknown = await invoke("find_duplicates", { files: files ?? null });
  const dto = parseRaw<RustDuplicateResultDto>(raw);

  if (!dto || !dto.groups || !Array.isArray(dto.groups)) {
    return { groups: [], summary: emptySummary() };
  }

  const groups = dto.groups.map(mapGroup);

  const summary: DuplicateSummary = {
    total_groups: dto.total_groups,
    total_files: dto.total_duplicate_files,
    total_wasted_bytes: dto.total_wasted_bytes,
    potential_savings: dto.total_wasted_bytes,
    scan_session_id: "",
    group_count: dto.total_groups,
    total_duplicate_files: dto.total_duplicate_files,
    total_files_scan: 0,
    scanned_at: new Date().toISOString(),
  };

  return { groups, summary };
}

function emptySummary(): DuplicateSummary {
  return {
    total_groups: 0,
    total_files: 0,
    total_wasted_bytes: 0,
    potential_savings: 0,
    scan_session_id: "",
    group_count: 0,
    total_duplicate_files: 0,
    total_files_scan: 0,
    scanned_at: new Date().toISOString(),
  };
}
