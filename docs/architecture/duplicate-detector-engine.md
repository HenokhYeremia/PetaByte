# 🔍 PetaByte — Duplicate Detection Engine

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          DUPLICATE DETECTION ENGINE                                      │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                             DuplicateOrchestrator                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐         │   │
│  │  │  Tier 1  │  │  Tier 2  │  │  Tier 3  │  │  Tier 4  │  │  Tier 5    │         │   │
│  │  │  Size    │─>│  Size+   │─>│  Partial │─>│  Full    │─>│  Verify    │         │   │
│  │  │  Grouper │  │  Ext     │  │  Hasher  │  │  Hasher  │  │  & Store   │         │   │
│  │  │          │  │  Grouper │  │          │  │          │  │            │         │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────────┘         │   │
│  └───────────────────────────────────┬──────────────────────────────────────────────┘   │
│                                      │                                                    │
│         ┌────────────────────────────┼────────────────────────────┐                      │
│         │                            │                            │                      │
│         ▼                            ▼                            ▼                      │
│  ┌──────────────┐           ┌──────────────────┐          ┌──────────────┐              │
│  │ QueryPort    │           │   HasherPort     │          │  WritePort   │              │
│  │ (read files  │           │  (hash content)  │          │ (store       │              │
│  │  from SQLite)│           │                  │          │  results)    │              │
│  └──────┬───────┘           └────────┬─────────┘          └──────┬───────┘              │
│         │                            │                            │                      │
│         ▼                            ▼                            ▼                      │
│  ┌──────────┐                ┌──────────────┐             ┌──────────┐                 │
│  │ petabyte │                │ petabyte     │             │ petabyte │                 │
│  │ -database│                │ -hasher      │             │ -database│                 │
│  └──────────┘                └──────────────┘             └──────────┘                 │
│                                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐                  │
│  │  HashCache       │  │  CheckpointMgr   │  │  ProgressTracker     │                  │
│  │  (dedup hash     │  │  (resume state)  │  │  (files/sec, ETA)   │                  │
│  │   computation)   │  │                  │  │                      │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘                  │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘

                               DEPENDENCIES

  petabyte-duplicate-detector (this crate)
       │
       ├── petabyte-shared-models (entities: FileEntry, DuplicateGroup, FileHash)
       │                      (ports: FileQueryPort, HasherPort, FileWritePort, ProgressEmitter)
       │
       ├── petabyte-shared (error types, constants, utilities)
       │
       └── [external] blake3, rayon, serde, thiserror
```

---

## 2. Pipeline Stages — Detail

### 2.1 Five-Tier Pipeline

```
INPUT: scan_entries table (populated by Scanner Engine)
       ~1M–10M rows, scan_session_id = ?

       │
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: SIZE GROUPING                                                         │
│                                                                                │
│  SQL: SELECT file_size, COUNT(*) as cnt                                       │
│       FROM scan_entries                                                       │
│       WHERE scan_session_id = ?                                               │
│         AND is_directory = 0                                                  │
│         AND (hash_id IS NULL OR hash_id NOT IN (                              │
│             SELECT id FROM file_hashes WHERE full_hash IS NOT NULL            │
│         ))                                                                    │
│       GROUP BY file_size                                                      │
│       HAVING cnt > 1                                                          │
│       ORDER BY file_size DESC                                                 │
│                                                                                │
│  RULE: Files with UNIQUE size CANNOT be duplicates (fundamental constraint)   │
│                                                                                │
│  RESULT: [(file_size: u64, file_count: usize), ...]                           │
│  TYPICAL: ~5-20% of total files are in non-unique size groups                 │
│  COMPLEXITY: O(n) via index scan, ~1s for 10M files                          │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: SIZE + EXTENSION GROUPING (OPTIONAL)                                  │
│                                                                                │
│  For each size group from Tier 1:                                             │
│    SELECT extension, COUNT(*) as cnt                                          │
│    FROM scan_entries                                                          │
│    WHERE scan_session_id = ? AND file_size = ?                                │
│    GROUP BY extension                                                         │
│    HAVING cnt > 1                                                             │
│                                                                                │
│  RULE: Files with same size but DIFFERENT extension CAN be duplicates         │
│        (e.g., photo.jpg vs photo.jpeg). This tier is OPTIONAL and OFF by      │
│        default — it's a heuristic that reduces hash work but risks misses.    │
│                                                                                │
│  RESULT: [(file_size, extension, file_count), ...]                            │
│  ELIMINATION: ~30-40% of Tier 1 groups eliminated (but see caveat)           │
│  CAVEAT: Only enable if user confirms "same extension required"               │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: PARTIAL HASH                                                          │
│                                                                                │
│  For each candidate group (size, or size+ext):                                │
│    1. Query all files: SELECT id, file_path, file_size FROM scan_entries     │
│       WHERE scan_session_id = ? AND file_size = ? [AND extension = ?]        │
│       AND (hash_id IS NULL OR hash_id NOT IN (                                │
│           SELECT id FROM file_hashes WHERE full_hash IS NOT NULL              │
│       ))                                                                      │
│                                                                                │
│    2. For each file:                                                          │
│       - Check HashCache: existing partial_hash? → skip hash                  │
│       - Open file, read first 4KB + last 4KB (8KB total)                     │
│       - Compute Blake3 of the 8KB buffer                                      │
│       - If file_size <= 8192: mark as FULL hash (covers entire file)         │
│       - Store in HashCache: (file_size, partial_hash) → hash_id              │
│       - UPDATE scan_entries SET hash_id = ? WHERE id = ?                      │
│                                                                                │
│    3. Group files by (file_size, partial_hash)                                │
│    4. Groups with count == 1 → unique content, no further action             │
│    5. Groups with count > 1 → candidate duplicates → proceed to Tier 4       │
│                                                                                │
│  I/O: 8KB per file (even for multi-GB files)                                  │
│  ELIMINATION: ~95% of Tier 2 candidates are eliminated here                  │
│  COMPLEXITY: O(candidates) I/O, O(candidates) CPU                     │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 4: FULL HASH                                                             │
│                                                                                │
│  For each candidate group from Tier 3 (size + partial_hash):                  │
│                                                                                │
│    1. Check HashCache: existing full_hash for (size, partial_hash)?           │
│       SELECT id FROM file_hashes                                              │
│       WHERE file_size = ? AND partial_hash = ? AND full_hash IS NOT NULL      │
│       LIMIT 1                                                                 │
│       → If found, reuse hash_id for ALL files in this group                  │
│       → Skip full hashing entirely                                            │
│                                                                                │
│    2. For each file (if no cached full_hash):                                 │
│       - Open file, stream whole content in 64KB chunks                       │
│       - Compute full Blake3 hash                                              │
│       - If file was already partial-hashed AND file_size <= 8192:             │
│         partial_hash IS the full_hash, skip this step                         │
│       - Store in HashCache: (size, partial_hash, full_hash) → hash_id        │
│       - UPDATE scan_entries SET hash_id = ? WHERE id = ?                      │
│                                                                                │
│    3. Group files by full_hash                                                │
│    4. Groups with count > 1 = CONFIRMED duplicates                           │
│    5. Groups with count == 1: partial hash matched but full didn't →          │
│       false positive (extremely rare for Blake3, but possible for partial)  │
│                                                                                │
│  I/O: Entire file content (potentially GB per file)                           │
│  TYPICAL: < 0.1% of total files reach this tier                              │
│  COMPLEXITY: O(candidates × file_size) I/O, O(candidates × file_size) CPU    │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 5: VERIFICATION & STORAGE                                                │
│                                                                                │
│  For each confirmed duplicate group:                                          │
│    1. (Optional) Re-hash one random file to verify hash integrity             │
│    2. Calculate metrics:                                                      │
│       - file_count = number of files in group                                 │
│       - wasted_bytes = (file_count - 1) × file_size                          │
│    3. INSERT INTO duplicate_groups:                                           │
│         (scan_session_id, file_size, hash_id, file_count,                     │
│          total_wasted_bytes, is_verified = true)                              │
│    4. INSERT INTO duplicate_group_members:                                    │
│         (group_id, scan_entry_id, file_path, file_size,                       │
│          is_kept=false, is_selected=false)                                    │
│    5. Emit duplicate:found event for each group                              │
│                                                                                │
│  COMPLEXITY: O(groups × members) DB writes                                   │
└──────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
OUTPUT: duplicate_groups + duplicate_group_members tables populated
       scan_entries.hash_id updated
       scan_sessions.duplicates_found updated
       Event: duplicate:complete { groups_found, wasted_bytes, duration }
```

### 2.2 Data Shrinkage Across Tiers

```
Total files:                         1,000,000 (100%)
       │
Tier 1 (unique sizes eliminated):     150,000  (15%)
       │
Tier 2 (optional, size+ext):          100,000  (10%)
       │
Tier 3 (partial hash):                  5,000  (0.5%)
       │
Tier 4 (full hash duplicates):           500  (0.05%)
       │
Tier 5 (verified groups):                250 groups, ~3,750 members
```

---

## 3. Sequence Diagram

```
UI / Command              DuplicateOrchestrator     SizeGrouper    PartialHasher    FullHasher     Verifier      SQLite / HashCache
     │                           │                     │               │               │             │                │
     │ invoke("find_duplicates") │                     │               │               │             │                │
     │──────────────────────────>│                     │               │               │             │                │
     │                           │                     │               │               │             │                │
     │                           │── emit("duplicate:starting") ──> UI                                │                │
     │                           │                     │               │               │             │                │
     │                           │─── TIER 1 ───       │               │               │             │                │
     │                           │────────────────────>│               │               │             │                │
     │                           │                     │── SQL ─────────────────────────────────────────────────────>│
     │                           │                     │<── size_groups ──────────────────────────────────────────────│
     │                           │<─── [(size, cnt)] ──│               │               │             │                │
     │                           │                     │               │               │             │                │
     │                           │─── TIER 2 (optional) │               │               │             │                │
     │                           │────────────────────>│               │               │             │                │
     │                           │                     │── SQL ─────────────────────────────────────────────────────>│
     │                           │                     │<── groups ──────────────────────────────────────────────────│
     │                           │<─── [(size, ext)] ──│               │               │             │                │
     │                           │                     │               │               │             │                │
     │                           │─── TIER 3 ───       │               │               │             │                │
     │                           │────────────────────────────────────>│               │             │                │
     │                           │                     │               │               │             │                │
     │                           │                     │  For each group:               │             │                │
     │                           │                     │               │               │             │                │
     │                           │                     │               │── query files ──────────────────────────────>│
     │                           │                     │               │<── candidates ───────────────────────────────│
     │                           │                     │               │               │             │                │
     │                           │                     │               │  Parallel (rayon):              │                │
     │                           │                     │               │  ┌─────────────────────┐       │                │
     │                           │                     │               │  │ For each file:      │       │                │
     │                           │                     │               │  │ 1. Check HashCache  │       │                │
     │                           │                     │               │  │ 2. Read 8KB         │───────│── disk I/O ──>│
     │                           │                     │               │  │ 3. Blake3 hash      │       │                │
     │                           │                     │               │  │ 4. Store in cache   │       │                │
     │                           │                     │               │  │ 5. Return (hash,id) │       │                │
     │                           │                     │               │  └─────────────────────┘       │                │
     │                           │                     │               │               │               │                │
     │                           │                     │               │── sort + group ──────────────────────────────>│
     │                           │                     │               │── UPDATE hash_id ────────────────────────────>│
     │                           │                     │               │── save partial_hash ─────────────────────────>│
     │                           │                     │               │<── done ─────────────────────────────────────│
     │                           │                     │               │               │             │                │
     │                           │<────────────────────────────────────│               │             │                │
     │                           │                     │               │               │             │                │
     │                           │── emit("duplicate:progress") ──> UI (periodic)                   │                │
     │                           │                     │               │               │             │                │
     │                           │─── TIER 4 ───       │               │               │             │                │
     │                           │──────────────────────────────────────────────────>│             │                │
     │                           │                     │               │               │             │                │
     │                           │                     │               │  For each candidate:        │                │
     │                           │                     │               │               │             │                │
     │                           │                     │               │               │── check hash cache ──────────>│
     │                           │                     │               │               │<── hit/miss ─────────────────│
     │                           │                     │               │               │             │                │
     │                           │                     │               │               │  If miss (rayon):            │
     │                           │                     │               │               │  ┌─────────────────────┐     │
     │                           │                     │               │               │  │ For each file:      │     │
     │                           │                     │               │               │  │ 1. Stream 64KB      │─────│─>│
     │                           │                     │               │               │  │ 2. Blake3 full      │     │  │
     │                           │                     │               │               │  │ 3. Return (hash,id) │     │  │
     │                           │                     │               │               │  └─────────────────────┘     │  │
     │                           │                     │               │               │             │                │  │
     │                           │                     │               │               │── save full_hash ────────────>│  │
     │                           │                     │               │               │── UPDATE hash_id ────────────>│  │
     │                           │                     │               │               │<── done ─────────────────────│  │
     │                           │                     │               │               │             │                │  │
     │                           │<───────────────────────────────────────────────────│             │                │  │
     │                           │                     │               │               │             │                │  │
     │                           │─── TIER 5 ───       │               │               │             │                │  │
     │                           │────────────────────────────────────────────────────────────────>│                │  │
     │                           │                     │               │               │             │                │  │
     │                           │                     │               │  For each confirmed group:  │                │  │
     │                           │                     │               │               │             │── INSERT ──────>│  │
     │                           │                     │               │               │             │  duplicate     │  │
     │                           │                     │               │               │             │  _groups       │  │
     │                           │                     │               │               │             │── INSERT ──────>│  │
     │                           │                     │               │               │             │  _members      │  │
     │                           │                     │               │               │             │                │  │
     │                           │                     │               │               │             │  emit          │  │
     │                           │                     │               │               │             │  duplicate:    │  │
     │                           │                     │               │               │             │  found         │  │
     │                           │                     │               │               │             │                │  │
     │                           │<────────────────────────────────────────────────────────────────│                │  │
     │                           │                     │               │               │             │                │  │
     │                           │── emit("duplicate:complete") ──> UI                             │                │
     │<── return summary ────────│                     │               │               │             │                │
```

---

## 4. Component Architecture

### 4.1 Crate Structure

```
petabyte-duplicate-detector/
│
├── src/
│   ├── lib.rs                       # DuplicateDetector trait implementation
│   │                                # Facade over orchestrator
│   │
│   ├── orchestrator.rs              # DuplicateOrchestrator
│   │   # - Coordinates 5-tier pipeline
│   │   # - Manages progress, cancel, checkpoint
│   │   # - Single entry point: detect_duplicates(session_id, config)
│   │
│   ├── pipeline/
│   │   ├── mod.rs
│   │   ├── tier1_size_grouper.rs    # SQL GROUP BY file_size
│   │   ├── tier2_ext_grouper.rs     # SQL GROUP BY file_size + extension
│   │   ├── tier3_partial_hasher.rs  # Partial hash computation
│   │   ├── tier4_full_hasher.rs     # Full hash computation
│   │   └── tier5_verifier.rs        # Result storage
│   │
│   ├── grouping/
│   │   ├── mod.rs
│   │   ├── hash_grouper.rs          # Sort + scan grouping algorithm
│   │   └── group_builder.rs         # Construct DuplicateGroup from results
│   │
│   ├── cache/
│   │   ├── mod.rs
│   │   ├── hash_cache.rs            # Before-hash cache lookup
│   │   └── cache_writer.rs          # After-hash cache store
│   │
│   ├── io/
│   │   ├── mod.rs
│   │   ├── partial_reader.rs        # Read first+last 4KB
│   │   ├── full_reader.rs           # Stream whole file (64KB buffer)
│   │   └── file_batcher.rs          # Batch file candidates from DB
│   │
│   ├── state/
│   │   ├── mod.rs
│   │   ├── progress.rs              # Files/sec, ETA, phase tracking
│   │   ├── checkpoint.rs            # Save/load resume state
│   │   └── cancellable.rs           # Cancel token wrapper
│   │
│   ├── config.rs                    # DuplicateConfig (all parameters)
│   └── error.rs                     # DuplicateError, DuplicateResult
```

### 4.2 Key Data Structures

```rust
// ── Config ──
pub struct DuplicateConfig {
    pub scan_session_id: i64,
    pub enable_extension_grouping: bool,  // Tier 2 OFF by default
    pub partial_hash_size: u64,           // default: 4096 bytes per chunk
    pub full_hash_buffer_size: usize,     // default: 65536 (64KB)
    pub batch_size: usize,                // default: 500 files per batch
    pub max_concurrent_hashes: usize,     // default: num_cpus
    pub min_group_size_for_duplicate: usize, // default: 2
    pub verify_hash_on_read: bool,        // default: true
}

// ── Tier 1 Result ──
pub struct SizeGroup {
    pub file_size: u64,
    pub file_count: usize,
}

// ── Tier 2 Result ──
pub struct SizeExtensionGroup {
    pub file_size: u64,
    pub extension: String,
    pub file_count: usize,
}

// ── Candidate file for hashing ──
pub struct HashCandidate {
    pub scan_entry_id: i64,
    pub file_path: PathBuf,
    pub file_size: u64,
}

// ── Hash result from worker ──
pub struct HashResult {
    pub scan_entry_id: i64,
    pub file_size: u64,
    pub hash_string: String,   // hex Blake3
    pub hash_type: HashType,   // Partial | Full
    pub duration_us: u64,
}

pub enum HashType {
    Partial,
    Full,       // Computed as full hash
    FullFromPartial,  // File <= 8KB, partial IS the full hash
}

// ── Group of files with same hash ──
pub struct HashGroup {
    pub file_size: u64,
    pub hash_string: String,
    pub hash_id: Option<i64>,
    pub members: Vec<i64>,  // scan_entry_ids
}

// ── Final result ──
pub struct DuplicateSummary {
    pub session_id: i64,
    pub total_files_analyzed: u64,
    pub size_groups_found: usize,
    pub partial_hash_groups: usize,
    pub confirmed_duplicate_groups: usize,
    pub total_duplicate_files: usize,
    pub total_wasted_bytes: u64,
    pub files_hashed_partial: u64,
    pub files_hashed_full: u64,
    pub hash_cache_hits: u64,
    pub duration_ms: u64,
}

// ── Checkpoint ──
pub struct DuplicateCheckpoint {
    pub session_id: i64,
    pub tier: u8,           // 1-5
    pub files_hashed: u64,
    pub groups_found: usize,
    pub processed_groups: Vec<(u64, String)>,  // (file_size, extension_or_hash)
    pub saved_at: Instant,
}
```

---

## 5. Hashing Strategy

### 5.1 Partial Hash (Tier 3)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PARTIAL HASH ALGORITHM                                │
│                                                                              │
│  File size: 1.5 MB                                                          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ [4KB content][4KB content][  ...  ][  ...  ][4KB content][4KB content]│   │
│  │  ^^^^^^^^^^^^                                  ^^^^^^^^^^^^           │   │
│  │  First 4KB                                    Last 4KB                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│          │                                            │                      │
│          └──────────────────┬─────────────────────────┘                      │
│                             ▼                                                │
│                    ┌─────────────────┐                                      │
│                    │  8KB Buffer     │                                      │
│                    └────────┬────────┘                                      │
│                             ▼                                                │
│                    ┌─────────────────┐                                      │
│                    │  blake3::hash() │                                      │
│                    └────────┬────────┘                                      │
│                             ▼                                                │
│                    ┌─────────────────┐                                      │
│                    │  64 hex chars   │  ← partial_hash                      │
│                    └─────────────────┘                                      │
│                                                                              │
│  Edge cases:                                                                 │
│  - File size < 8KB: read entire file, partial_hash == full_hash            │
│  - File size = 0 (empty): partial_hash = blake3("") → special marker      │
│  - File size = 4KB exactly: first 4KB = last 4KB = entire file            │
│  - File size = 4097 bytes: first 4KB + last 4093 bytes (no overlap)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why first+last 4KB?**

| Chunk selection | Accuracy | I/O cost | False positives |
|----------------|----------|----------|-----------------|
| First 4KB only | 60% | 4KB | High (same header) |
| First+last 4KB | 95% | 8KB | Low |
| First 64KB+last 64KB | 98% | 128KB | Very low |
| Full file | 100% | Full file | Zero |

First+last 4KB is the optimal tradeoff: 8KB I/O per file, 95% elimination rate, even for multi-GB files.

### 5.2 Full Hash (Tier 4)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FULL HASH ALGORITHM                                   │
│                                                                              │
│  Streaming read (memory constant: 64KB buffer):                             │
│                                                                              │
│  File: ┌──────┐┌──────┐┌──────┐     ┌──────┐                               │
│        │64KB  ││64KB  ││64KB  │ ... │<64KB │                               │
│        └──┬───┘└──┬───┘└──┬───┘     └──┬───┘                               │
│           │       │       │            │                                     │
│           ▼       ▼       ▼            ▼                                     │
│        ┌───────────────────────────────────┐                                │
│        │       blake3::Hasher              │                                │
│        │       .update(chunk)             │                                │
│        │       .update(chunk)             │                                │
│        │       ...                         │                                │
│        │       .finalize()                 │                                │
│        └───────────────┬───────────────────┘                                │
│                        ▼                                                     │
│                ┌─────────────────┐                                           │
│                │  64 hex chars   │  ← full_hash                             │
│                └─────────────────┘                                           │
│                                                                              │
│  Performance: ~2 GB/s throughput on modern CPU (single core)                │
│               + disk I/O speed (typically the bottleneck)                    │
│                                                                              │
│  Optimization: Only hash files that matched on partial hash                │
│                → typically < 0.5% of total files                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Hash Cache Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HASH CACHE LOOKUP                                    │
│                                                                              │
│  Before computing ANY hash (partial or full):                               │
│                                                                              │
│  1. Check scan_entries:                                                     │
│     SELECT hash_id FROM scan_entries                                        │
│     WHERE id = ? AND hash_id IS NOT NULL                                    │
│                                                                              │
│     → HIT: file already has hash, skip entirely                            │
│     → MISS: continue                                                        │
│                                                                              │
│  2. (Before full hash) Check file_hashes for cache:                         │
│     SELECT id FROM file_hashes                                              │
│     WHERE file_size = ? AND partial_hash = ? AND full_hash IS NOT NULL      │
│     LIMIT 1                                                                 │
│                                                                              │
│     → HIT: reuse hash_id for ALL files in this group                       │
│            UPDATE scan_entries SET hash_id = ? WHERE id IN (these files)    │
│            → Skip full hashing entirely for this group                      │
│     → MISS: compute full hash for each file                                │
│                                                                              │
│  3. (After full hash) Store in file_hashes:                                 │
│     INSERT INTO file_hashes (file_size, partial_hash, full_hash)            │
│     VALUES (?, ?, ?)                                                        │
│     ON CONFLICT(full_hash) DO NOTHING  ← idempotent                         │
│                                                                              │
│     UPDATE scan_entries SET hash_id = ? WHERE id IN (these files)           │
│                                                                              │
│  Cache hit rate (estimated):                                                │
│  - First scan:  0%                                                          │
│  - Re-scan:     ~40-60% (files with unchanged content)                     │
│  - Resume:      ~70-80% (already-processed files)                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Grouping Strategy

### 6.1 Sort-Then-Scan Algorithm

After hashing a batch of files, we need to group by hash to find duplicates.

```
INPUT: Vec<(hash: String, scan_entry_id: i64, file_size: u64)>
       Typical size: 5,000 – 50,000 entries

STEP 1: SORT by hash
    ┌─────────────────────────────────┐
    │ Sort by (hash, scan_entry_id)   │
    │ Complexity: O(n log n)          │
    └────────────┬────────────────────┘
                 │
                 ▼
STEP 2: SCAN for adjacent duplicates
    ┌─────────────────────────────────┐
    │ i = 0                           │
    │ while i < results.len():        │
    │   hash = results[i].hash        │
    │   group = [results[i].id]       │
    │   i += 1                        │
    │   while i < results.len()       │
    │     AND results[i].hash == hash:│
    │       group.push(results[i].id) │
    │       i += 1                    │
    │   if group.len() > 1:           │
    │     emit duplicate group        │
    │   if group.len() == 1:          │
    │     unique content, discard     │
    └─────────────────────────────────┘
                 │
                 ▼
OUTPUT: Vec<HashGroup>  (only groups with count > 1)
```

**Why sort instead of HashMap?**

| Approach | Memory | Time | Cache locality |
|----------|--------|------|----------------|
| `HashMap<String, Vec<Id>>` | High (overhead per entry) | O(n) average | Poor (random access) |
| `Sort + scan` | Low (in-place sort) | O(n log n) | Excellent (sequential) |

For 50,000 entries: sort takes ~1ms, HashMap takes ~3ms with 5x memory. Sort wins.

**Memory for 50K entries:**
```
50,000 × (64 bytes hash + 8 bytes id + 8 bytes size) = 50,000 × 80 = 4 MB
Sort in-place on Vec: 4 MB total
```

### 6.2 Incremental Group Building

For very large size groups (e.g., 50,000 files of the same size):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LARGE GROUP BATCHING                                                        │
│                                                                              │
│  Size group: 1,024 bytes, 50,000 files                                      │
│                                                                              │
│  Batch 1 (5,000 files):                                                     │
│    Hash → Sort → Group                                                       │
│    Result: 4,900 unique, 100 duplicates (in 12 groups)                      │
│    Store duplicates immediately                                              │
│    Keep: Map<hash, id> of unique files for cross-batch matching              │
│                                                                              │
│  Batch 2 (5,000 files):                                                     │
│    Hash → Sort → Group within batch                                          │
│    Also check against unique_hashes from Batch 1                             │
│    Result: 4,895 unique, 105 duplicates (5 cross-batch matches)             │
│    Merge cross-batch duplicates                                              │
│    Store new duplicates                                                      │
│    Update unique_hashes                                                      │
│                                                                              │
│  ... (10 batches total)                                                     │
│                                                                              │
│  Final: 4,950 groups (4,850 unique × 1, 100 groups × 500 total dupes)      │
│                                                                              │
│  Memory: unique_hashes Map holds ~200K entries at peak (acceptable)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Multi-Threading Model

### 7.1 Thread Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DUPLICATE DETECTION THREAD MODEL                         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │              MAIN / ORCHESTRATOR THREAD  (Sequential)                    ││
│  │                                                                          ││
│  │  Tasks:                                                                  ││
│  │  1. Execute Tier 1 SQL → get size groups                                ││
│  │  2. Execute Tier 2 SQL (optional) → get size+ext groups                 ││
│  │  3. For each group: dispatch to rayon pool                              ││
│  │  4. Collect results, group, store                                       ││
│  │  5. Emit progress events                                                ││
│  │  6. Save checkpoints                                                    ││
│  └─────────────────────┬───────────────────────────────────────────────────┘│
│                        │                                                    │
│                        │ dispatch_batch(candidates, tier)                   │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    RAYON THREAD POOL (Work-stealing)                    ││
│  │                                                                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ ││
│  │  │  Worker 1    │  │  Worker 2    │  │  Worker 3    │  │  Worker N    │ ││
│  │  │              │  │              │  │              │  │              │ ││
│  │  │ hash_file()  │  │ hash_file()  │  │ hash_file()  │  │ hash_file()  │ ││
│  │  │ hash_file()  │  │ hash_file()  │  │ hash_file()  │  │ hash_file()  │ ││
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ ││
│  │         │                 │                 │                 │          ││
│  │         ▼                 ▼                 ▼                 ▼          ││
│  │  ┌─────────────────────────────────────────────────────────────────┐    ││
│  │  │                    RESULTS COLLECTOR                             │    ││
│  │  │  Vec<HashResult> collected from all workers                     │    ││
│  │  └──────────────────────────┬──────────────────────────────────────┘    ││
│  └─────────────────────────────┼───────────────────────────────────────────┘│
│                                │                                             │
│                                ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │              SINGLE WRITER THREAD (via channel)                         ││
│  │                                                                          ││
│  │  - Receives HashResult batches from orchstrator                        ││
│  │  - Serially writes to SQLite:                                          ││
│  │      INSERT OR IGNORE INTO file_hashes (...)                            ││
│  │      UPDATE scan_entries SET hash_id = ? WHERE id = ?                  ││
│  │  - Solves SQLite write contention                                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │              PROGRESS & EVENT THREAD (Tokio task)                       ││
│  │                                                                          ││
│  │  - Reads atomic counters every 500ms                                   ││
│  │  - Calculates FPS, ETA, phase                                           ││
│  │  - Emits duplicate:progress to UI                                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Parallelism Strategy

| Tier | Parallelism | Why |
|------|-------------|-----|
| Tier 1 | Single thread | SQL query, cannot parallelize |
| Tier 2 | Single thread | SQL query, cannot parallelize |
| Tier 3 | **Parallel per group** | Groups are independent. Dispatch multiple size groups to rayon pool simultaneously. |
| Tier 4 | **Parallel per file** | Files within a group are independent. Dispatch all files in a candidate group to rayon pool. |
| Tier 5 | Single thread | DB writes must be serialized to avoid contention |

**Tier 3 parallelism detail:**
```
┌──────────────────────────────────────────────────────────────┐
│  Orchestrator iterates size groups:                          │
│                                                              │
│  Group 1: size=1024, 50 files  ─┐                            │
│  Group 2: size=2048, 30 files  ─┤                            │
│  Group 3: size=4096, 10 files  ─┤  rayon::scope             │
│  Group 4: size=8192, 100 files ─┤                            │
│  ...                            ─┤                            │
│                                                              │
│  All groups hashed in parallel                               │
│  Workers steal work from each other                          │
│  (rayon work-stealing)                                       │
└──────────────────────────────────────────────────────────────┘
```

**Constraint: SQLite writes are single-threaded**
- All `UPDATE scan_entries SET hash_id` goes through one channel
- Prevents `SQLITE_BUSY` errors from concurrent write attempts
- Writes are batched within each group for efficiency

---

## 8. Resume Strategy

### 8.1 Checkpoint Data

```sql
CREATE TABLE IF NOT EXISTS duplicate_progress (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_session_id   INTEGER NOT NULL REFERENCES scan_sessions(id),
    current_tier      INTEGER NOT NULL,         -- 1-5
    state_json        TEXT    NOT NULL,           -- JSON encoded progress state
    files_hashed      INTEGER NOT NULL DEFAULT 0,
    groups_discovered INTEGER NOT NULL DEFAULT 0,
    updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dup_progress_session
    ON duplicate_progress(scan_session_id);
```

### 8.2 Checkpoint JSON Schema

```json
{
    "tier": 3,
    "processed_groups": [
        {"size": 1024, "extension": null, "status": "done"},
        {"size": 2048, "extension": null, "status": "done"},
        {"size": 4096, "extension": "jpg", "status": "done"}
    ],
    "current_group": {"size": 8192, "extension": null},
    "files_hashed_in_group": 42,
    "total_files_in_group": 100,
    "hash_cache_populated": true
}
```

### 8.3 Resume Flow

```
Start duplicate detection
       │
       ▼
Check duplicate_progress for session_id
       │
       ├── No checkpoint found
       │   → Start from Tier 1
       │
       └── Checkpoint found
           │
           ▼
       Restore state from checkpoint.state_json
       │
       ▼
       ┌─────────────────────────────────────────────────────┐
       │  Resume decision per tier:                           │
       │                                                      │
       │  Tier 1 (complete):                                  │
       │    Skip, use cached size groups                     │
       │                                                      │
       │  Tier 2 (complete or skipped):                      │
       │    Skip, use cached groups                           │
       │                                                      │
       │  Tier 3 (partial):                                  │
       │    Remove "done" groups from query                  │
       │    SELECT ... WHERE file_size NOT IN (done_groups)  │
       │    For current_group:                               │
       │      SELECT ... WHERE file_size = current_size     │
       │        AND hash_id IS NULL                          │
       │        (skip already-hashed files)                  │
       │    Resume hashing from there                        │
       │                                                      │
       │  Tier 4 (partial):                                  │
       │    Re-query candidate groups from Tier 3 results    │
       │    Filter out groups where all files have full_hash │
       │    Resume full hashing                              │
       │                                                      │
       │  Tier 5 (partial):                                  │
       │    Re-query confirmed groups from previous          │
       │    full_hash comparison                             │
       │    Resume storing remaining groups                  │
       └─────────────────────────────────────────────────────┘
```

### 8.4 Idempotency Guarantee

```
INSERT OR IGNORE INTO file_hashes (file_size, partial_hash, full_hash)
    VALUES (?, ?, ?);
-- If hash already exists (from previous partial run), silently skip

UPDATE scan_entries SET hash_id = ?
    WHERE id = ? AND hash_id IS NULL;
-- Only update if not already set (idempotent)
```

---

## 9. Batching Strategy

### 9.1 Batch Sizes

| Operation | Batch Size | Rationale |
|-----------|-----------|-----------|
| Query files from DB | 1,000 files | Reduce round-trips, manageable memory |
| Dispatch to rayon | 500 files | Balance parallelism vs overhead |
| SQLite UPDATE hash_id | 500 files | Balance transaction size vs write throughput |
| SQLite INSERT file_hashes | 100 rows | `ON CONFLICT` checking is cheaper per row in smaller batches |
| Checkpoint save | Every 10 groups | Low overhead, fine-grained resume |
| Progress emit | Every 500ms | Throttle UI updates |

### 9.2 Work Unit Dispatch

```
Tier 3 work unit = one size group (all files with that size)
  - Typically 2-50 files per group
  - For large groups (>500 files), split into sub-batches of 500
  - Each sub-batch dispatched to rayon as independent unit

Tier 4 work unit = one file
  - Can be any size (from bytes to GB)
  - Large files hashed individually in rayon
  - Emit progress for each large file (>100MB) individually

Work stealing:
  rayon::scope(|scope| {
      for group in size_groups {
          let group = group.clone();
          scope.spawn(|_| {
              process_size_group(group);
          });
      }
  });
```

---

## 10. Progress Tracking

### 10.1 Progress Data

```rust
pub struct DuplicateProgress {
    pub session_id: i64,
    pub phase: DuplicatePhase,
    pub tier: u8,

    // Tier 1
    pub total_size_groups: Option<usize>,

    // Tiers 3-4
    pub files_to_hash: u64,
    pub files_hashed: u64,

    // Performance
    pub files_per_second: f64,
    pub bytes_hashed: u64,

    // Results
    pub groups_discovered: usize,
    pub wasted_bytes: u64,

    // Timing
    pub elapsed: Duration,
    pub eta: Option<Duration>,
}

pub enum DuplicatePhase {
    SizeGrouping,        // Tier 1
    ExtensionGrouping,   // Tier 2 (optional)
    PartialHashing,      // Tier 3
    FullHashing,         // Tier 4
    Verification,        // Tier 5
    Complete,
}
```

### 10.2 ETA Calculation

```
Total work is unknown until Tier 1 completes.
Once Tier 1 gives us size groups, we know total files to hash.

Total files to hash = SUM(size_groups.file_count)
                     - hash_cache_hits
                     - files_with_existing_hash_id

EMA_FPS calculation (same as Scanner Engine):
  fps = α × instant_fps + (1 - α) × fps_prev
  α = 0.3 (adaptive)

ETA = remaining_files / EMA_FPS
```

### 10.3 Event Emission

| Event | When | Payload |
|-------|------|---------|
| `duplicate:starting` | Start | `{ session_id, config }` |
| `duplicate:tier` | Each tier start | `{ session_id, tier, phase, total_groups }` |
| `duplicate:progress` | Every 500ms | `{ files_hashed, files_total, fps, eta, phase }` |
| `duplicate:group_found` | Each confirmed group | `{ file_size, file_count, wasted_bytes }` |
| `duplicate:complete` | End | `{ groups, wasted_bytes, duration, cache_hits }` |
| `duplicate:cancelled` | On cancel | `{ session_id, partial_summary }` |

---

## 11. SQLite Storage Strategy

### 11.1 Tables Used

| Table | Access Pattern | Rows |
|-------|---------------|------|
| `scan_entries` | READ (query candidates), WRITE (update hash_id) | 1M-10M |
| `file_hashes` | READ (cache check), WRITE (INSERT new) | Same as unique content |
| `duplicate_groups` | WRITE (INSERT) | 100s-1000s |
| `duplicate_group_members` | WRITE (INSERT) | 1000s-10,000s |
| `duplicate_progress` | READ/WRITE (checkpoint) | 1 per session |

### 11.2 Write Pattern

```sql
-- All writes use prepared statements:

-- 1. Check hash cache
SELECT id FROM file_hashes
WHERE file_size = ? AND partial_hash = ? AND full_hash IS NOT NULL
LIMIT 1;

-- 2. Insert new hash (if not cached)
INSERT INTO file_hashes (file_size, partial_hash, full_hash, hash_version)
VALUES (?, ?, ?, 1)
ON CONFLICT(full_hash) DO NOTHING;

-- 3. Batch update scan_entries
BEGIN TRANSACTION;
UPDATE scan_entries SET hash_id = ? WHERE id = ?;
UPDATE scan_entries SET hash_id = ? WHERE id = ?;
-- ... x500
COMMIT;

-- 4. Insert duplicate group
INSERT INTO duplicate_groups
    (scan_session_id, file_size, hash_id, file_count, total_wasted_bytes, is_verified)
VALUES (?, ?, ?, ?, ?, 1);

-- 5. Insert group members
INSERT INTO duplicate_group_members
    (group_id, scan_entry_id, file_path, file_size)
VALUES (?, ?, ?, ?);
```

### 11.3 SQLite Configuration

```sql
PRAGMA journal_mode = WAL;          -- Concurrent read/write
PRAGMA synchronous = NORMAL;        -- Safe with WAL, fast
PRAGMA cache_size = -32000;         -- 32MB (smaller than scanner, less needed)
PRAGMA temp_store = MEMORY;         -- Temp tables in RAM
PRAGMA busy_timeout = 5000;         -- 5s wait before SQLITE_BUSY
```

---

## 12. Memory Optimization

### 12.1 Memory Budget

```
┌──────────────────────────────────────┐
│ Peak Memory During Duplicate Detect  │
├──────────────────────────────────────┤
│ Size groups metadata       ~1 MB     │
│ Candidate file list        ~2 MB     │
│ (25,000 entries × 80 bytes)         │
│                                      │
│ Hash results buffer        ~4 MB     │
│ (50,000 × 80 bytes)                 │
│                                      │
│ Partial hash I/O buffer    ~64 KB    │
│ (8KB per file)                      │
│                                      │
│ Full hash I/O buffer       ~64 KB    │
│ (per worker) × 8 workers = 512KB   │
│                                      │
│ In-flight file data        ~2 MB     │
│ (for large file hashing)             │
│                                      │
│ SQLite page cache          ~32 MB    │
│                                      │
├──────────────────────────────────────┤
│ Total peak               ~41 MB     │
└──────────────────────────────────────┘
```

### 12.2 Optimization Techniques

| Technique | Impact |
|-----------|--------|
| **Streaming I/O**: 64KB fixed buffer for file reads | No OOM regardless of file size |
| **Sort grouping** over HashMap | 5x less memory for hash grouping |
| **Process one size group at a time** | Only hold current group in memory |
| **Sub-batching large groups** | Split 50K-file group into 100 × 500 batches |
| **Reuse allocations**: `Vec::clear()` instead of `Vec::new()` | Reduce allocator churn |
| **Arc<str> for hash strings** | Share identical hashes across results |
| **SQLite cache_size = 32MB** | Smaller than scanner (64MB) — less needed |
| **No file content caching** | Read content once, compute hash, discard |

### 12.3 Zero-Copy Path Reading

```rust
// Instead of:
let path = entry.file_path.clone();  // Clone full string

// Use:
let path = entry.file_path.as_str();  // Borrow from Arc<String>
```

---

## 13. Complexity Analysis

### 13.1 Time Complexity

```
TIER 1 — Size Grouping:
    SQL: INDEX SCAN(scan_entries, idx_size_group)
    Time: O(n)  where n = total files
    10M files: ~1-2 seconds

TIER 2 — Extension Grouping (optional):
    SQL: INDEX RANGE SCAN per size group
    Time: O(m × log k) where m = size groups, k = files per group
    10K groups: ~0.5 seconds

TIER 3 — Partial Hashing:
    Time: O(c × 8KB_I/O + c × CPU_hash)
    where c = candidate files after Tier 1/2
    150K candidates: ~3-15 seconds (I/O bound)

TIER 4 — Full Hashing:
    Time: O(p × file_I/O + p × file_CPU_hash)
    where p = post-partial-hash candidates
    5K candidates: ~2-60 seconds (highly variable, file size dependent)

TIER 5 — Verification & Storage:
    Time: O(g × m) where g = groups, m = members per group
    250 groups × 4 members: ~0.2 seconds

TOTAL: ~5-80 seconds for 1M files (dominated by Tier 3/4)
```

### 13.2 Memory Complexity

```
TIER 1:     O(1) — SQL engine handles everything
TIER 2:     O(g) — size_groups metadata
TIER 3:     O(c) — candidate file list + hash results
            where c = ~15% of total files
            150K entries × 80 bytes = 12 MB
TIER 4:     O(p) — post-partial candidates
            where p = ~0.5% of total files
            5K entries × 80 bytes = 400 KB
TIER 5:     O(1) — streaming inserts

OVERALL:    O(total_file_metadata × 0.15) ≈ 12 MB for 1M files
            + SQLite page cache: 32 MB
            ≈ 44 MB peak
```

### 13.3 Bottleneck Analysis

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          BOTTLENECK HEAT MAP                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIER 1: ██████████░░░░░░░░░░░░░░░░░░  30% CPU (SQL)                       │
│          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% I/O                              │
│                                                                             │
│  TIER 2: ██████░░░░░░░░░░░░░░░░░░░░░░  20% CPU (SQL)                       │
│          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% I/O                              │
│                                                                             │
│  TIER 3: ██████████████████████░░░░░░  80% I/O (8KB reads from disk)       │
│          ██████████░░░░░░░░░░░░░░░░░░  30% CPU (Blake3 of 8KB)             │
│          ⚠ Bottleneck: Random 8KB reads across many files                  │
│          → SSD: ~12K files/sec | HDD: ~200 files/sec                       │
│                                                                             │
│  TIER 4: ████████████████████████████  100% I/O (full file reads)         │
│          ██████████████████░░░░░░░░░░   60% CPU (Blake3)                    │
│          ⚠ Bottleneck: Full file I/O + Blake3 CPU for large files          │
│          → Typically only 0.1% of files reach this tier → acceptable       │
│                                                                             │
│  TIER 5: ██████░░░░░░░░░░░░░░░░░░░░░░  20% CPU (SQLite writes)            │
│          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% I/O                              │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 13.4 I/O Pattern Analysis

```
Tier 3 I/O pattern:
  - 8KB random reads from thousands of files
  - Sequential thread: ~5ms per seek + 0.1ms read = 5.1ms per file
  - 8 parallel threads: ~5.1ms per file ÷ 8 = 0.64ms effective per file
  - Throughput: ~1,500 files/sec per thread × 8 = ~12,000 files/sec
  - For 150K candidates: ~12.5 seconds on SSD
  - For HDD: 12.5 × (10ms seek / 5ms seek) × (1 - contention) ≈ 30-60 seconds

Tier 4 I/O pattern:
  - Full file streaming reads from very few files
  - Throughput bound by sequential read speed
  - 1GB file on SSD: ~3 seconds (350MB/s)
  - 1GB file on HDD: ~20 seconds (50MB/s)
  - Total: highly variable, but typically only 1-5 large files at this tier
```

---

## 14. Risk Analysis

| Risk | Probability | Impact | Severity | Mitigation |
|------|------------|--------|----------|------------|
| **One size group dominates** (50K empty files) | Medium | Medium | **MEDIUM** | Sub-batch large groups (500 files/batch). Cross-batch duplicate matching via unique_hashes Map. |
| **File modified during hashing** | Low | Low | **LOW** | Detect via size change between start and end of read. Skip file, report warning. |
| **Same content, different names** (false negative via ext grouping) | Medium | Low | **LOW** | Extension grouping OFF by default. User must opt-in. |
| **Hash collision** (Blake3) | Negligible | Critical | **LOW** | Blake3 collision resistance: 2^256. Not a real concern. |
| **Out of memory for large groups** | Low | High | **HIGH** | Fixed buffer sizes, streaming I/O, bounded work queues. Tested against 100K-file group. |
| **SQLite write contention** | Medium | Medium | **MEDIUM** | Single writer thread, batched updates, WAL mode. |
| **False positive from partial hash** | Medium | Low | **LOW** | Tier 4 (full hash) catches all false positives. Final result is always 100% accurate. |
| **Scan session deleted mid-analysis** | Low | High | **HIGH** | Check session exists before each tier. Graceful abort if missing. |
| **Disk full during hash storage** | Low | Medium | **MEDIUM** | Check free space before analysis. Abort early with warning. |
| **Resume incompatible after schema change** | Low | Medium | **MEDIUM** | Include schema version in checkpoint. Clear on version mismatch. |

---

## 15. Integration with Scanner & Other Engines

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PIPELINE INTEGRATION                                 │
│                                                                              │
│  SCANNER COMPLETES                                                           │
│       │                                                                      │
│       │ scan:complete event                                                  │
│       │ { session_id, total_files: 1M }                                     │
│       ▼                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  POST-SCAN PIPELINE (sequential, in background)                       │  │
│  │                                                                         │  │
│  │  1. Compute directory_summaries (for tree view)                       │  │
│  │     ← depends on: scan_entries table                                   │  │
│  │                                                                         │  │
│  │  2. Compute scan_statistics (for dashboard)                           │  │
│  │     ← depends on: scan_entries table                                   │  │
│  │                                                                         │  │
│  │  3. Run DUPLICATE DETECTION (this engine)                             │  │
│  │     ← depends on: scan_entries table (populated)                      │  │
│  │     ← depends on: file_hashes table (populated by prior runs)         │  │
│  │     → populates: duplicate_groups, duplicate_group_members            │  │
│  │     → updates: scan_entries.hash_id                                    │  │
│  │                                                                         │  │
│  │  4. Run CACHE CLEANER detection                                       │  │
│  │     ← depends on: scan_entries table                                   │  │
│  │     → populates: cache_entries                                         │  │
│  │                                                                         │  │
│  │  5. Calculate HEALTH SCORE                                            │  │
│  │     ← depends on: scan_statistics, scan_entries, duplicate_groups     │  │
│  │     → populates: health_snapshots                                      │  │
│  │                                                                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  TOTAL POST-SCAN TIME: ~15-45 seconds for 1M files                          │
│  (Duplicate detection is the heaviest step)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 16. Summary (30 seconds)

| Aspek | Keputusan |
|-------|-----------|
| **Pipeline** | 5-tier: Size → (Ext) → Partial Hash → Full Hash → Verify |
| **Elimination rate** | Tier 1: ~85% eliminated. Tier 3: ~95% of remaining. Tier 4: 100% definitive. |
| **Hash algorithm** | Blake3. Partial: first+last 4KB. Full: streaming 64KB buffer. |
| **Grouping** | Sort-then-scan (not HashMap) — O(n log n), sequential memory access, 5x less memory |
| **Parallelism** | Tier 3: parallel per size group. Tier 4: parallel per file. All via rayon. |
| **DB writes** | Single writer thread via channel. Batched UPDATE × 500. Prevents SQLite contention. |
| **Resume** | Checkpoint per tier. Idempotent writes via `ON CONFLICT DO NOTHING`. |
| **Memory peak** | ~44 MB (includes 32 MB SQLite cache) |
| **Throughput (SSD)** | ~12K files/sec (tier 3 bound). 1M files → ~80s for tier 3 + tier 4. Total: ~90s. |
| **Accuracy** | 100% (Tier 4 full hash eliminates all false positives from partial hash) |
| **Risk #1** | Single huge size group → sub-batch + cross-batch matching |
| **Risk #2** | HDD performance → user notification: 10x slower than SSD |
