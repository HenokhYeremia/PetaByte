# 🏗️ PetaByte — Arsitektur Sistem & Desain

## 1. Analisis Kritis Visi Produk

### Keunggulan Kompetitif
PetaByte masuk ke pasar *disk space analyzer* yang sudah ramai (WinDirStat, WizTree, DaisyDisk, SpaceSniffer, Baobab). Diferensiasi sejati ada pada tiga fitur yang tidak dimiliki kompetitor secara terintegrasi:

- **Developer Cache Cleaner** — menyasar *niche* pengembang (node_modules, target, .cache, build artifacts)
- **Smart Move File** — operasi file aman dengan dry-run, undo, dan transaction log
- **Storage Health Score** — metrik agregat yang memberi *actionable insight*, bukan sekadar visualisasi

### Risiko Paling Kritis
| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| **Over-scoping MVP** | Fitur terlalu banyak → *none done well* | Prioritaskan Scanner + Duplicate + Large File; tunda Cleaner/Health ke v1.1 |
| **Performa scan** | 1M+ files = pengalaman buruk | *Parallel traversal* (jwalk), *streaming pipeline*, *deferred analysis* |
| **Keamanan operasi file** | Data loss = kehilangan kepercayaan | *Trash-first* (bukan delete permanen), *journaled operations*, *dry-run mandatory* |

---

## 2. Tantangan Teknis Terbesar

### 🔴 Kritis
1. **Filesystem Traversal pada 10M+ file** — naive `walkdir` di satu thread bisa 20+ menit. Solusi: `jwalk` (parallel walk) + *early filtering* + *checkpointing* agar bisa resume.
2. **Duplicate Detection Scalable** — O(n²) per grup ukuran = bencana. Solusi: *tiered hashing* (size → first 4KB → blake3 full), *streaming* tidak perlu holding semua file di memory.
3. **SQLite Performance pada Jutaan Baris** — INSERT per file = bottleneck. Solusi: *batch inserts* (ribuan per transaksi), *WAL mode*, *prepared statements*, *indexing strategis*.

### 🟡 Signifikan
4. **Cross-platform Path & Permission** — `C:\` vs `/`, symlink, junction, *permission denied* yang partial. Solusi: *OS abstraction layer* + *graceful degradation*.
5. **Real-time UI selama Scan** — Tauri command blocking = UI freeze. Solusi: *async commands* + *event streaming* via `app_handle.emit()`.
6. **Cancellation & Resume** — Scan 30 menit tiba-tiba dibatalkan. Solusi: *Atomic checkpoint* di SQLite setiap N files, *cancellation token*.

### 🟢 Manageable
7. **File Hashing CPU-bound** — multitier + rayon parallel.
8. **Cache Cleaner Akurat** — butuh *curated ruleset* per dev ecosystem.

---

## 3. High Level Architecture — Clean Architecture (Layered)

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │                         PRESENTATION LAYER                          │
 │  ┌───────────────────────────────────────────────────────────────┐  │
 │  │                    React / TypeScript UI                       │  │
 │  │  Dashboard │ Scanner │ Duplicates │ Cleaner │ Health │ Move    │  │
 │  └──────────────────────────┬────────────────────────────────────┘  │
 │                              │ Tauri IPC                             │
 │                              ▼                                       │
 │  ┌───────────────────────────────────────────────────────────────┐  │
 │  │                 INTERFACE / CONTROLLERS                        │  │
 │  │  Commands (tauri::command) │ Events │ DTOs │ Validation       │  │
 │  └──────────────────────────┬────────────────────────────────────┘  │
 ├─────────────────────────────┼───────────────────────────────────────┤
 │                      APPLICATION LAYER                              │
 │  ┌──────────────────────────┴────────────────────────────────────┐  │
 │  │                      USE CASES                                │  │
 │  │  ScanDriveUseCase │ FindLargeUseCase │ FindDuplicateUseCase   │  │
 │  │  CleanCacheUseCase│ SmartMoveUseCase │ HealthScoreUseCase     │  │
 │  └──────────────────────────┬────────────────────────────────────┘  │
 │  ┌──────────────────────────┴────────────────────────────────────┐  │
 │  │                    PORTS (Interfaces)                          │  │
 │  │  In:  ScanPort │ AnalysisPort │ FileOpPort                     │  │
 │  │  Out: FileSystemRepo │ ScanRepo │ HealthRepo                  │  │
 │  └───────────────────────────────────────────────────────────────┘  │
 ├─────────────────────────────┼───────────────────────────────────────┤
 │                       DOMAIN LAYER                                  │
 │  ┌──────────────────────────┴────────────────────────────────────┐  │
 │  │              ENTITIES & VALUE OBJECTS                          │  │
 │  │  FileEntry │ Volume │ ScanResult │ DuplicateGroup │ FileHash   │  │
 │  │  CacheEntry│ HealthScore │ FilePath │ FileSize │ FileCategory  │  │
 │  └───────────────────────────────────────────────────────────────┘  │
 ├─────────────────────────────┼───────────────────────────────────────┤
 │                    INFRASTRUCTURE LAYER                             │
 │  ┌──────────────────────────┴────────────────────────────────────┐  │
 │  │                     ADAPTERS / REPOSITORIES                     │  │
 │  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │  │
 │  │  │SQLite   │  │Filesystem│  │OS Specific│  │Platform       │  │  │
 │  │  │Repo     │  │Scanner   │  │Adapter   │  │Trash/FsOps    │  │  │
 │  │  └─────────┘  └──────────┘  └──────────┘  └───────────────┘  │  │
 │  └───────────────────────────────────────────────────────────────┘  │
 └─────────────────────────────────────────────────────────────────────┘
```

### Dependency Rule
```
Interface → Application → Domain ← Infrastructure
(setiap layer hanya tahu layer di dalamnya)
```

Tidak ada ketergantungan ke luar. Infrastructure mengimplementasikan `Port` yang didefinisikan di Application layer.

---

## 4. Module Utama

### 4.1 Domain Layer (Tidak Bergantung pada Apa Pun)

| Module | Tanggung Jawab | Key Types |
|--------|---------------|-----------|
| `domain::entities` | Objek bisnis inti | `FileEntry`, `Volume`, `Directory`, `DuplicateGroup` |
| `domain::value_objects` | Tipe nilai *immutable* | `FilePath`, `FileSize`, `FileHash`, `FileCategory`, `HealthScore` |
| `domain::ports` | Interface untuk *inversion of control* | `ScanPort`, `AnalysisPort`, `FileOpPort`, `HealthPort` |

### 4.2 Application Layer (Hanya Tahu Domain)

| Module | Tanggung Jawab |
|--------|---------------|
| `application::use_cases` | Orchestrator bisnis — menerima input dari controller, memanggil port, mengembalikan hasil |
| `application::services` | *Domain services* murni — logika yang tidak cocok di entity (contoh: scoring algorithm) |
| `application::dto` | Data Transfer Objects — memisahkan model internal dari API |
| `application::ports::in` | Input port interface — kontrak yang diimplementasikan use case |
| `application::ports::out` | Output port interface — kontrak yang diimplementasikan infrastructure adapter |

### 4.3 Infrastructure Layer (Implementasi Nyata)

| Module | Tanggung Jawab | Key Dependency |
|--------|---------------|----------------|
| `infrastructure::scanner` | Traversal filesystem (paralel) | `jwalk`, `ignore` |
| `infrastructure::persistence` | SQLite — migrasi, insert, query | `rusqlite` / `sqlx` |
| `infrastructure::hasher` | Multi-tier file hashing | `blake3`, `sha2` |
| `infrastructure::ops` | Operasi file aman (move, trash) | `trash` crate |
| `infrastructure::platform` | OS-specific logic | `cfg!(target_os)` |
| `infrastructure::cleaner` | Rule-based cache detection | Custom YAML/TOML rules |

### 4.4 Interface Layer (Tauri Bridge)

| Module | Tanggung Jawab |
|--------|---------------|
| `interface::commands` | `#[tauri::command]` — entry point IPC |
| `interface::events` | Emit progress/report events ke frontend |
| `interface::dto` | Serialization types (serde) untuk API |
| `interface::state` | `AppState` — managed Tauri state |

---

## 5. Dependency Antar Module

```
interface::commands
    → application::use_cases
        → domain::ports::in          (trait, use case interface)
        → domain::ports::out         (trait, repository interface)
        → domain::entities
        → domain::value_objects
        → application::dto
            → domain::entities/value_objects

infrastructure::persistence
    → domain::ports::out             (implementasi trait)
    → domain::entities               (konversi dari/ke DB row)
    → rusqlite

infrastructure::scanner
    → domain::ports::out             (implementasi trait)
    → domain::entities
    → jwalk / walkdir

infrastructure::hasher
    → domain::value_objects          (menghasilkan FileHash)
    → blake3

interface::events
    → tauri::AppHandle
    → domain::entities               (event payload)
```

### Dependency Graph Ringkas

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ Commands ├────>│  Use Cases   ├────>│   Domain     │<────┐
└──────────┘     └──────┬───────┘     └──────────────┘     │
                        │                                   │
                        ▼                                   │
                 ┌──────────────┐     ┌──────────────┐      │
                 │    Ports     │<────│Infrastructure │──────┘
                 └──────────────┘     └──────────────┘
```

**Aturan ketat:** `interface` → `application` → `domain` ← `infrastructure`. Tidak ada *circular dependency*.

---

## 6. Alur Data: Scan hingga Hasil Ditampilkan

### Flow Lengkap

```
[User klik "Scan Drive"]
        │
        ▼
┌────────────────────────────────────────────────────────────┐
│ 1. React → invoke("start_scan", { path: "C:\\", config }) │
└──────────────────────────┬─────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 2. interface::commands::start_scan                         │
│    - Validasi input (path exists, permission)              │
│    - Dapatkan AppState dari Tauri managed state            │
│    - Buat CancellationToken                               │
│    - Spawn async task                                     │
│    - Return scan_id (user dapat track progress)           │
└──────────────────────────┬─────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 3. application::use_cases::ScanDriveUseCase::execute()     │
│    - Orchestrate pipeline:                                 │
│      a. Buat ScanSession di DB (status: running)           │
│      b. Panggil FileSystemRepo::walk(path, config)         │
│      c. Stream hasil traversal via mpsc channel            │
└──────────────────────────┬─────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 4. infrastructure::scanner::ParallelWalker::walk()         │
│    - jwalk parallel traversal                              │
│    - Filter: exclude patterns, max depth, hidden           │
│    - Untuk setiap file:                                    │
│      a. Map ke domain::FileEntry                          │
│      b. Send ke channel                                   │
│      c. Update progress counter (atomic)                  │
│      d. Check cancellation token                          │
└──────────────────────────┬─────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 5. Streaming Pipeline (concurrent)                         │
│                                                             │
│    ┌──────────┐    channel    ┌───────────┐    channel     │
│    │ Scanner  │───┬──────────>│ Persister │───┬──────────> │
│    │ (walker) │   │           │ (batch DB)│   │            │
│    └──────────┘   │           └───────────┘   │            │
│                   │                            │            │
│                   │  Event stream              │  Event     │
│                   │  (progress)                │  (new file)│
│                   ▼                            ▼            │
│            ┌──────────────┐            ┌──────────────┐    │
│            │ interface::  │            │ interface::  │    │
│            │ events       │            │ events       │    │
│            │ (emit to UI) │            │ (emit to UI) │    │
│            └──────────────┘            └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 6. Persister: Batch insert ke SQLite                      │
│    - Akumulasi 500-1000 FileEntry per transaksi           │
│    - INSERT OR IGNORE (handle re-scan)                    │
│    - Update progress di session table                     │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 7. Setelah traversal selesai:                              │
│    a. Update ScanSession status → completed               │
│    b. Trigger analysis pipeline (large files, dupes)      │
│    c. Emit scan_complete event dengan summary             │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 8. Frontend: receive scan_complete event                  │
│    - Update store                                         │
│    - Dashboard menampilkan summary: total files, size,    │
│      largest files, top dirs                              │
│    - User bisa navigasi ke tab lain (duplicates, dll)     │
└─────────────────────────────────────────────────────────────┘
```

### Multi-threading Model

```
┌─────────────────────────────────────────────────────┐
│                    MAIN THREAD (UI)                   │
│  Tauri event loop + React rendering                  │
│  Receive events, update state                         │
└──────────────────────┬──────────────────────────────┘
                       │ async
┌──────────────────────▼──────────────────────────────┐
│                  TOKIO RUNTIME                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Command      │  │ Event        │  │ Use Cases │  │
│  │ Handlers     │  │ Emitters     │  │           │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ spawn_blocking / rayon
┌──────────────────────▼──────────────────────────────┐
│               WORKER THREAD POOL                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ jwalk        │  │ file hasher  │  │ duplicates│  │
│  │ (parallel    │  │ (rayon)      │  │ analyzer  │  │
│  │  traversal)  │  │              │  │           │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 7. Struktur Folder Project

```
petabyte/
│
├── src-tauri/                          # ── Rust Backend ──
│   ├── src/
│   │   ├── main.rs                     # Tauri bootstrap, plugin registration
│   │   ├── lib.rs                      # Re-export semua modul publik
│   │   ├── state.rs                    # AppState managed state
│   │   │
│   │   ├── domain/                     # ── Domain Layer ──
│   │   │   ├── mod.rs
│   │   │   ├── entities/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── file_entry.rs
│   │   │   │   ├── volume.rs
│   │   │   │   ├── scan_session.rs
│   │   │   │   ├── duplicate_group.rs
│   │   │   │   └── cache_entry.rs
│   │   │   ├── value_objects/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── file_path.rs
│   │   │   │   ├── file_size.rs
│   │   │   │   ├── file_hash.rs
│   │   │   │   ├── file_category.rs
│   │   │   │   └── health_score.rs
│   │   │   └── ports/
│   │   │       ├── mod.rs
│   │   │       └── traits.rs
│   │   │
│   │   ├── application/                # ── Application Layer ──
│   │   │   ├── mod.rs
│   │   │   ├── use_cases/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── scan_drive.rs
│   │   │   │   ├── find_large_files.rs
│   │   │   │   ├── find_duplicates.rs
│   │   │   │   ├── clean_cache.rs
│   │   │   │   ├── smart_move.rs
│   │   │   │   └── health_score.rs
│   │   │   ├── services/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── health_calculator.rs
│   │   │   │   └── cache_identifier.rs
│   │   │   └── dto/
│   │   │       ├── mod.rs
│   │   │       ├── scan_config.rs
│   │   │       ├── scan_result.rs
│   │   │       └── move_request.rs
│   │   │
│   │   ├── infrastructure/             # ── Infrastructure Layer ──
│   │   │   ├── mod.rs
│   │   │   ├── persistence/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── connection.rs       # Pool/koneksi SQLite
│   │   │   │   ├── migrations/         # Migrasi database
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── file_repo.rs
│   │   │   │   │   ├── scan_repo.rs
│   │   │   │   │   └── health_repo.rs
│   │   │   │   └── models/             # Row types (DB → Entity mapper)
│   │   │   │       ├── mod.rs
│   │   │   │       ├── file_row.rs
│   │   │   │       └── scan_row.rs
│   │   │   ├── scanner/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── parallel_walker.rs
│   │   │   │   └── filter_rules.rs
│   │   │   ├── hasher/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── tiered_hasher.rs
│   │   │   │   └── hash_cache.rs
│   │   │   ├── ops/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── safe_mover.rs
│   │   │   │   ├── trash_handler.rs
│   │   │   │   └── journal.rs
│   │   │   ├── cleaner/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── rule_engine.rs
│   │   │   │   └── rules/             # Cache detection rule sets
│   │   │   │       ├── rust.yaml
│   │   │   │       ├── node.yaml
│   │   │   │       └── general.yaml
│   │   │   └── platform/
│   │   │       ├── mod.rs
│   │   │       ├── paths.rs
│   │   │       ├── volume_info.rs
│   │   │       └── permissions.rs
│   │   │
│   │   └── interface/                  # ── Interface Layer ──
│   │       ├── mod.rs
│   │       ├── commands/
│   │       │   ├── mod.rs
│   │       │   ├── scan_commands.rs
│   │       │   ├── file_commands.rs
│   │       │   ├── clean_commands.rs
│   │       │   ├── move_commands.rs
│   │       │   └── health_commands.rs
│   │       ├── events/
│   │       │   ├── mod.rs
│   │       │   ├── scan_events.rs
│   │       │   └── progress_emitter.rs
│   │       └── dto/
│   │           ├── mod.rs
│   │           └── api_types.rs
│   │
│   ├── capabilities/                   # Tauri v2 permission manifests
│   │   └── default.json
│   ├── migrations/                     # SQL files for DB schema
│   │   ├── 001_initial.sql
│   │   ├── 002_indexes.sql
│   │   └── 003_duplicates.sql
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                                # ── React Frontend ──
│   ├── main.tsx                        # Entry point
│   ├── App.tsx                         # Router / layout
│   ├── types/                          # TypeScript types (mirror Rust DTOs)
│   │   ├── api.ts                      # Tauri invoke/event types
│   │   ├── file.ts
│   │   └── scan.ts
│   ├── hooks/                          # Custom hooks (bridges to Tauri)
│   │   ├── useScan.ts
│   │   ├── useDuplicates.ts
│   │   └── useHealth.ts
│   ├── stores/                         # State management (Zustand)
│   │   ├── scanStore.ts
│   │   ├── fileStore.ts
│   │   └── uiStore.ts
│   ├── components/                     # UI Components (Atomic Design)
│   │   ├── ui/                         # Atoms: Button, Card, Progress
│   │   ├── scanner/                    # Molecules: ScanConfig, ScanProgress
│   │   ├── file-list/                  # Molecules: FileTable, FileCard
│   │   ├── duplicates/                 # DuplicateGroup, DuplicateCard
│   │   ├── cleaner/                    # CacheRules, CleanPreview
│   │   └── health/                     # HealthGauge, ScoreCard
│   ├── pages/                          # Pages / Routes
│   │   ├── Dashboard.tsx
│   │   ├── Scanner.tsx
│   │   ├── Duplicates.tsx
│   │   ├── Cleaner.tsx
│   │   └── Settings.tsx
│   └── lib/                            # Utility functions
│       └── format.ts
│
├── docs/                               # Dokumentasi
│   ├── architecture.md                 # (dokumen ini)
│   ├── data-model.md
│   └── development.md
│
├── scripts/                            # Build/CI scripts
│   ├── build.sh
│   └── ci.sh
│
├── .github/                            # CI/CD
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
│
├── Cargo.toml                          # Workspace root (jika multi-crate)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 8. Penerapan Clean Architecture & SOLID

### Single Responsibility Principle
Setiap *use case* satu tanggung jawab. `ScanDriveUseCase` hanya *mengatur scan* — tidak menulis langsung ke DB atau UI. `Sender` (progress) adalah *dependency injection*.

### Open/Closed Principle
Module baru ditambah dengan *extend*, bukan *modify*:
- Tambah *cache cleaner rule set* → cukup file YAML baru di `rules/`
- Tambah *analyzer baru* → implement `AnalysisPort` trait baru
- Tambah dukungan *storage provider* baru → implement `FileSystemRepo` baru

### Liskov Substitution
Semua `Port` trait diganti implementasinya tanpa mengubah *use case*. Contoh: `FileSystemRepo` bisa diimplementasikan untuk local disk, network share, atau mocked untuk testing.

### Interface Segregation
Setiap *use case* punya port kecil yang spesifik, bukan satu `Repository` raksasa:
```rust
// Buruk — terlalu gemuk
trait MegaRepository {
    fn save_file(&self, f: FileEntry);
    fn find_duplicates(&self) -> Vec<DuplicateGroup>;
    fn get_health(&self) -> HealthScore;
    fn get_volume_info(&self) -> Volume;
}

// Baik — terpisah
trait FileWritePort {
    fn batch_insert(&self, files: &[FileEntry]) -> Result<()>;
}

trait DuplicateQueryPort {
    fn find_duplicates(&self) -> Result<Vec<DuplicateGroup>>;
}

trait HealthQueryPort {
    fn get_metrics(&self) -> Result<StorageMetrics>;
}
```

### Dependency Inversion
*High-level modules* (`use_cases`) tidak bergantung pada *low-level modules* (`SQLiteRepo`, `ParallelWalker`). Keduanya bergantung pada abstraksi (`Port` trait di domain layer).

Dependency injection via constructor:
```rust
pub struct ScanDriveUseCase {
    scanner: Arc<dyn FileSystemRepo>,
    persister: Arc<dyn FileWritePort>,
    progress: Arc<dyn ProgressEmitter>,
}

impl ScanDriveUseCase {
    pub fn new(
        scanner: Arc<dyn FileSystemRepo>,
        persister: Arc<dyn FileWritePort>,
        progress: Arc<dyn ProgressEmitter>,
    ) -> Self { ... }
}
```

---

## 9. Diagram Arsitektur (ASCII)

### Layered Architecture

```
   ┌─────────────────────────────────────────────────────────────────────────┐
   │  React / TypeScript                                                     │
   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
   │  │Dashboard│Scanner││Dupes ││Cleaner││Health││Move  │                 │
   │  └───┬──┘ └───┬──┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘               │
   │      └────────┴────────┴────────┴────────┴────────┘                   │
   │                           │ invoke / listen                            │
   └───────────────────────────┼───────────────────────────────────────────┘
                               │  Tauri IPC Bridge
   ┌───────────────────────────┼───────────────────────────────────────────┐
   │  INTERFACE LAYER          │                                            │
   │  ┌────────────────────────▼────────────────────────────────────────┐  │
   │  │  commands/   start_scan  get_large_files  find_duplicates      │  │
   │  │              clean_cache smart_move        get_health_score     │  │
   │  └───────────────────────────────────────────────────────────────────┘  │
   │  ┌───────────────────────────────────────────────────────────────────┐  │
   │  │  events/    scan:progress  scan:complete  file:deleted  move:done│  │
   │  └───────────────────────────────────────────────────────────────────┘  │
   └───────────────────────────┬───────────────────────────────────────────┘
                               │ call
   ┌───────────────────────────┼───────────────────────────────────────────┐
   │  APPLICATION LAYER        │                                            │
   │  ┌────────────────────────▼────────────────────────────────────────┐  │
   │  │  Use Cases:   ScanDriveUC  FindLargeUC  FindDupUC              │  │
   │  │               CleanCacheUC SmartMoveUC  HealthScoreUC          │  │
   │  └───────────────────────────────────────────────────────────────────┘  │
   │  ┌───────────────────────────────────────────────────────────────────┐  │
   │  │  Services:    HealthCalculator  CacheIdentifier                  │  │
   │  └───────────────────────────────────────────────────────────────────┘  │
   └───────────────────────────┬───────────────────────────────────────────┘
                               │ trait (Port)
   ┌───────────────────────────┼───────────────────────────────────────────┐
   │  DOMAIN LAYER             │                                            │
   │  ┌────────────────────────▼────────────────────────────────────────┐  │
   │  │  Entities:   FileEntry  Volume  DuplicateGroup  ScanSession    │  │
   │  │              CacheEntry  HealthScore  MoveJournal              │  │
   │  └───────────────────────────────────────────────────────────────────┘  │
   │  ┌───────────────────────────────────────────────────────────────────┐  │
   │  │  Value Objs: FilePath  FileSize  FileHash  FileCategory          │  │
   │  │              FileCount  ByteSize  HealthMetric                   │  │
   │  └───────────────────────────────────────────────────────────────────┘  │
   │  ┌───────────────────────────────────────────────────────────────────┐  │
   │  │  Ports:      FileSystemRepo(扫描)  FileWritePort(DB写入)         │  │
   │  │              FileQueryPort(读取)  ProgressPort(进度)             │  │
   │  │              FileOpPort(文件操作)  HealthRepoPort(健康)           │  │
   │  └───────────────────────────────────────────────────────────────────┘  │
   └───────────────────────────┬───────────────────────────────────────────┘
                               │ implements
   ┌───────────────────────────┼───────────────────────────────────────────┐
   │  INFRASTRUCTURE LAYER     │                                            │
   │  ┌────────────────────────▼────────────────────────────────────────┐  │
   │  │  scanner/      parallel_walker (jwalk)  filter_rules           │  │
   │  │  persistence/  sqlite_connection  migrations  file_repo        │  │
   │  │  hasher/       tiered_hasher (size→partial→full) hash_cache    │  │
   │  │  ops/          safe_mover  trash_handler  operation_journal    │  │
   │  │  cleaner/      rule_engine  rules/{rust,node,general}.yaml     │  │
   │  │  platform/     paths  volume_info  permissions                 │  │
   │  └───────────────────────────────────────────────────────────────────┘  │
   │                                                                         │
   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
   │  │  SQLite  │  │ Filesys  │  │  OS API  │  │  Trash   │               │
   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
   └─────────────────────────────────────────────────────────────────────────┘
```

### Data Pipeline Architecture

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                       SCAN PIPELINE                                │
   │                                                                    │
   │  User Config                                                       │
   │  (path, filters,  ┌──────────┐    ┌──────────┐    ┌──────────┐   │
   │   depth, etc.)────>│  Walker  │───>│  Filter  │───>│  Mapper  │   │
   │                    │  (jwalk) │    │(exclude, │    │→FileEntry│   │
   │                    └──────────┘    │ hidden,  │    └────┬─────┘   │
   │                                    │ symlink) │         │         │
   │                                    └──────────┘         │         │
   │                                                         ▼         │
   │                    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
   │                    │  Event   │<───│ Channel  │<───│  Batch   │   │
   │                    │ Emitter  │    │  (mpsc)  │    │Accumulator│   │
   │                    │(progress)│    └──────────┘    │(500 items)│   │
   │                    └──────────┘                    └────┬─────┘   │
   │                                                         │         │
   │                                                         ▼         │
   │                    ┌──────────┐    ┌──────────────────────────┐   │
   │                    │  React   │<───│  SQLite Batch Insert     │   │
   │                    │  UI      │    │  (WAL mode, transaction) │   │
   │                    └──────────┘    └──────────────────────────┘   │
   │                                                                    │
   │                       ── Post-Scan ──                              │
   │                                                                    │
   │  ┌────────────────────┐    ┌────────────────────┐                  │
   │  │  Large File Query  │    │  Duplicate Analysis │                  │
   │  │  (SQL: ORDER BY    │    │  (SQL group by size │                  │
   │  │   size DESC LIMIT) │    │   → hash candidates)│                  │
   │  └────────────────────┘    └────────────────────┘                  │
   │                                                                    │
   │  ┌────────────────────┐    ┌────────────────────┐                  │
   │  │  Cache Detection   │    │  Health Score Calc │                  │
   │  │  (rule engine on   │    │  (aggregate        │                  │
   │  │   file paths)      │    │   dari semua data) │                  │
   │  └────────────────────┘    └────────────────────┘                  │
   └────────────────────────────────────────────────────────────────────┘
```

### Module Dependency (Rust Crate Modules)

```
                  ┌──────────────────────┐
                  │  interface::commands  │
                  └──────────┬───────────┘
                             │ depends on
                  ┌──────────▼───────────┐
                  │  application::        │
                  │  use_cases            │
                  └──────────┬───────────┘
                             │ depends on
                  ┌──────────▼───────────┐
                  │  domain::ports       │◄────┐
                  │  domain::entities    │     │
                  │  domain::value_objs  │     │
                  └──────────────────────┘     │
                                                │
                  ┌──────────────────────┐      │
                  │  infrastructure::    │──────┘
                  │  persistence         │ implements
                  │  scanner             │ ports
                  │  hasher              │
                  │  ops                 │
                  │  cleaner             │
                  │  platform            │
                  └──────────────────────┘
```

---

## 10. Rekomendasi Peningkatan Desain Sebelum Implementasi

### 🔴 MUST HAVE (Pencegahan Masalah Fatal)

**1. Gunakan Workspace Cargo multi-crate**
```
petabyte-core/     → domain entities, value objects, ports (no deps)
petabyte-scanner/   → filesystem traversal
petabyte-db/        → SQLite persistence
petabyte-analyzer/  → analysis pipeline
petabyte-fsops/     → file operations
petabyte-app/       → Tauri app, commands, wiring
```
Keuntungan: kompilasi paralel, *compile-time firewall* (dependency tidak bocor), test terisolasi.

**2. Scan Checkpoint — Wajib**
Simpan progress scan setiap ~10.000 file ke SQLite. Jika scan terputus (crash, cancel), user bisa resume dari checkpoint terakhir, bukan dari awal.

**3. Operation Journal untuk Semua Write Operations**
Setiap move/delete harus tercatat di tabel `operation_journal` sebelum dieksekusi. Format:
```sql
CREATE TABLE operation_journal (
    id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL,  -- 'move', 'trash', 'delete'
    source_path TEXT NOT NULL,
    destination_path TEXT,         -- NULL untuk delete
    original_path TEXT,            -- untuk undo
    created_at TEXT NOT NULL,
    status TEXT NOT NULL,          -- 'pending', 'completed', 'undone'
    session_id TEXT NOT NULL
);
```
Ini memungkinkan *undo* dan *audit trail*.

**4. SQLite WAL Mode + Busy Timeout**
```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
```
Memungkinkan concurrent reads (UI query) selama write scan berlangsung.

### 🟡 SHOULD HAVE (Peningkatan Kualitas Signifikan)

**5. Tiered Hashing Strategy untuk Duplicate Detection**
```
Tier 1: Group by exact file size       (SQL, instant)
Tier 2: Hash first 4KB + file size     (fast, eliminates 95% false positives)
Tier 3: Full Blake3 hash               (CPU-bound, hanya untuk kandidat serius)
```
Cache hasil hash tier 2/3 di SQLite agar re-scan tidak menghash ulang.

**6. Reactive Programming Pattern untuk Frontend**
Gunakan Zustand + Tauri event listener agar UI reaktif terhadap perubahan data tanpa polling. Setiap event dari Rust langsung update store → React re-render.

**7. Test Strategy**
- **Unit test**: Domain entities + Use cases (pure logic, no IO) → `#[cfg(test)]`
- **Integration test**: Repository impl dengan in-memory SQLite → `:memory:`
- **E2E test**: Tauri test harness (`tauri::test`) + mock fs
- **Property-based test**: File path parsing, duplicate detection edge cases (`proptest`)

### 🟢 NICE TO HAVE (Untuk v1.1+)

**8. Plugin System untuk Cache Cleaner**
Definisi rule dalam format declarative (YAML) yang bisa ditambahkan user tanpa rekompilasi:
```yaml
rules:
  - name: node_modules
    patterns:
      - "**/node_modules"
    category: dev
    safe_to_delete: true
    description: "Node.js dependencies (reinstallable via npm install)"
```

**9. Virtual Filesystem untuk Preview**
Sebelum operasi file, tampilkan preview ke direktori tujuan tanpa benar-benar memindahkan — mapping in-memory.

**10. Event Sourcing untuk Health Score**
Simpan snapshot health score harian agar user bisa melihat tren — "Storage Health menurun 5% dalam seminggu terakhir."

---

## Ringkasan Arsitektur (30 detik)

| Aspek | Keputusan |
|-------|-----------|
| Pola arsitektur | **Clean Architecture** — 4 layer (domain, application, infrastructure, interface) |
| Dependency injection | **Constructor injection** dengan trait objects (`Arc<dyn Trait>`) |
| State management | **Tauri managed state** (`AppState`) — hold DB pool + scanner state |
| Concurrency model | **Tokio async** untuk I/O + **Rayon** untuk CPU-bound work |
| Database | **SQLite WAL** — batch insert per 500-1000 records |
| IPC | **Tauri commands** (request/response) + **Events** (streaming progress) |
| Pipeline scan | **Channel-based streaming** — scanner → batch accumulator → DB → UI events |
| Safety | **Operation journal** + **trash-first** + **dry-run mandatory** |
