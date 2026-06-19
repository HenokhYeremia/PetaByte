# 📁 PetaByte — Repository Structure & Crate Architecture

## 1. Workspace Tree (Lengkap)

```
petabyte/
│
├── Cargo.toml                              # Workspace root [member = 11 crates]
├── package.json                            # Node/React dependencies
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
│
├── .gitignore
├── .env.example
├── .editorconfig
├── .prettierrc
├── .eslintrc.cjs
│
│   ╔══════════════════════════════════════════════════════════════╗
│   ║            CRATES / RUST BACKEND                            ║
│   ╚══════════════════════════════════════════════════════════════╝
│
├── crates/
│   │
│   ├── petabyte-shared-models/             # LAYER 0: Domain Foundation
│   │   ├── Cargo.toml                      # [dependencies] none
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── entities/
│   │       │   ├── mod.rs
│   │       │   ├── file_entry.rs           # FileEntry, Directory, Volume
│   │       │   ├── scan_session.rs         # ScanSession, ScanStatus
│   │       │   ├── duplicate_group.rs      # DuplicateGroup, DuplicateCandidate
│   │       │   ├── cache_entry.rs          # CacheEntry, CacheCategory
│   │       │   ├── move_operation.rs       # MoveOperation, MoveJournal
│   │       │   └── health_metrics.rs       # HealthMetrics, HealthFactor
│   │       ├── value_objects/
│   │       │   ├── mod.rs
│   │       │   ├── file_path.rs            # FilePath (newtype, validation)
│   │       │   ├── file_size.rs            # FileSize (ByteCount, human formatting)
│   │       │   ├── file_hash.rs            # FileHash, PartialHash, TieredHash
│   │       │   ├── file_category.rs        # FileCategory enum (Document, Image, Cache...)
│   │       │   └── errors.rs               # DomainError, Result<T>
│   │       └── ports/
│   │           ├── mod.rs
│   │           ├── scanner_port.rs         # Trait: ScannerPort
│   │           ├── file_repository.rs      # Trait: FileRepository (CRUD)
│   │           ├── scan_repository.rs      # Trait: ScanRepository
│   │           ├── hasher_port.rs          # Trait: HasherPort
│   │           ├── file_op_port.rs         # Trait: FileOpPort
│   │           ├── duplicate_port.rs       # Trait: DuplicateDetector
│   │           ├── cache_cleaner_port.rs   # Trait: CacheCleaner
│   │           ├── health_score_port.rs    # Trait: HealthScoreCalculator
│   │           ├── progress_port.rs        # Trait: ProgressEmitter
│   │           └── move_journal_port.rs    # Trait: MoveJournal
│   │
│   ├── petabyte-shared/                    # LAYER 0: Utilities
│   │   ├── Cargo.toml                      # [dependencies] serde, thiserror
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── error.rs                    # PetaByteError enum (top-level errors)
│   │       ├── constants.rs                # App constants, thresholds
│   │       ├── platform.rs                 # cfg!(target_os) helpers
│   │       ├── path_utils.rs               # Cross-platform path normalization
│   │       ├── format_utils.rs             # Byte formatting, duration
│   │       ├── serde_utils.rs              # Custom serde helpers
│   │       └── test_utils.rs              # #[cfg(test)] mock helpers
│   │
│   ├── petabyte-database/                  # LAYER 1: Persistence
│   │   ├── Cargo.toml                      # [deps] petabyte-shared-models, petabyte-shared, rusqlite
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── connection.rs               # Connection pool, WAL config
│   │       ├── migrations/
│   │       │   ├── mod.rs
│   │       │   ├── m001_initial.rs
│   │       │   ├── m002_indexes.rs
│   │       │   └── m003_duplicates.rs
│   │       ├── repositories/
│   │       │   ├── mod.rs
│   │       │   ├── file_repo.rs            # Implements FileRepository
│   │       │   ├── scan_repo.rs            # Implements ScanRepository
│   │       │   ├── duplicate_repo.rs       # Duplicate query helpers
│   │       │   ├── journal_repo.rs         # Implements MoveJournal
│   │       │   └── health_repo.rs          # Health metrics storage
│   │       ├── models/
│   │       │   ├── mod.rs
│   │       │   ├── file_row.rs             # DB row → FileEntry mapper
│   │       │   ├── scan_row.rs             # DB row → ScanSession mapper
│   │       │   └── journal_row.rs          # DB row → MoveOperation mapper
│   │       └── error.rs                    # DatabaseError
│   │
│   ├── petabyte-scanner/                   # LAYER 1: Filesystem Traversal
│   │   ├── Cargo.toml                      # [deps] petabyte-shared-models, petabyte-shared, jwalk
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── parallel_walker.rs          # jwalk-based parallel traversal
│   │       ├── entry_mapper.rs             # DirEntry → FileEntry conversion
│   │       ├── filter_rules.rs             # Exclude patterns, hidden files, depth
│   │       ├── symlink_handler.rs          # Symlink/junction resolution
│   │       ├── permission_handler.rs       # Graceful permission denied handling
│   │       └── checkpoint.rs               # Scan checkpoint state
│   │
│   ├── petabyte-hasher/                    # LAYER 1: File Hashing
│   │   ├── Cargo.toml                      # [deps] petabyte-shared-models, petabyte-shared, blake3
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── tiered_hasher.rs            # 3-tier hash strategy
│   │       ├── partial_hasher.rs           # First-N-bytes hasher
│   │       ├── full_hasher.rs              # Full file blake3 hasher
│   │       ├── hash_cache.rs               # In-memory + SQLite hash cache
│   │       └── error.rs                    # HashError
│   │
│   │                                       # ── LAYER 2: Service Crates ──
│   │
│   ├── petabyte-duplicate-detector/        # Duplicate Analysis
│   │   ├── Cargo.toml                      # [deps] petabyte-shared-models, petabyte-shared
│   │   └── src/
│   │       ├── lib.rs                      # Implements DuplicateDetector port
│   │       ├── size_grouper.rs             # Tier 1: group by size
│   │       ├── partial_hash_matcher.rs     # Tier 2: partial hash verification
│   │       ├── full_hash_verifier.rs       # Tier 3: full hash confirmation
│   │       ├── duplicate_reporter.rs       # Result aggregation & reporting
│   │       └── config.rs                   # DuplicateDetectionConfig
│   │
│   ├── petabyte-cache-cleaner/             # Developer Cache Cleaning
│   │   ├── Cargo.toml                      # [deps] petabyte-shared-models, petabyte-shared
│   │   └── src/
│   │       ├── lib.rs                      # Implements CacheCleaner port
│   │       ├── rule_engine.rs              # YAML rule loading & matching
│   │       ├── size_calculator.rs          # Aggregate cache sizes
│   │       ├── safe_remover.rs             # Trash-first removal
│   │       ├── rules/
│   │       │   ├── builtin.rs              # Built-in rule definitions
│   │       │   └── yaml/                   # YAML rule files (shipped with app)
│   │       │       ├── rust.yaml
│   │       │       ├── node.yaml
│   │       │       ├── python.yaml
│   │       │       ├── java.yaml
│   │       │       ├── dotnet.yaml
│   │       │       └── general.yaml
│   │       └── error.rs                    # CleanerError
│   │
│   ├── petabyte-smart-move/                # Safe File Operations
│   │   ├── Cargo.toml                      # [deps] petabyte-shared-models, petabyte-shared, trash
│   │   └── src/
│   │       ├── lib.rs                      # Implements FileOpPort + MoveJournal
│   │       ├── safe_mover.rs               # Move with integrity verification
│   │       ├── trash_handler.rs            # OS trash integration
│   │       ├── dry_run.rs                  # Preview mode (no actual changes)
│   │       ├── undo_manager.rs             # Rollback logic
│   │       └── error.rs                    # FileOpError
│   │
│   ├── petabyte-health-score/              # Storage Health Scoring
│   │   ├── Cargo.toml                      # [deps] petabyte-shared-models, petabyte-shared
│   │   └── src/
│   │       ├── lib.rs                      # Implements HealthScoreCalculator port
│   │       ├── scoring_engine.rs           # Weighted scoring algorithm
│   │       ├── factors/
│   │       │   ├── mod.rs
│   │       │   ├── fragmentation.rs
│   │       │   ├── free_space.rs
│   │       │   ├── duplicate_ratio.rs
│   │       │   ├── temp_file_ratio.rs
│   │       │   └── large_file_ratio.rs
│   │       ├── trend_analyzer.rs           # Historical comparison
│   │       ├── recommendation_engine.rs    # Actionable suggestions
│   │       └── config.rs                   # Scoring weights configuration
│   │
│   │                                       # ── LAYER 3: Application ──
│   │
│   ├── petabyte-core-engine/              # Use Cases / Orchestration
│   │   ├── Cargo.toml                      # [deps] petabyte-shared-models, petabyte-shared
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── use_cases/
│   │       │   ├── mod.rs
│   │       │   ├── scan_drive.rs           # ScanDriveUseCase
│   │       │   ├── find_large_files.rs     # FindLargeFilesUseCase
│   │       │   ├── find_duplicates.rs      # FindDuplicatesUseCase
│   │       │   ├── clean_cache.rs          # CleanCacheUseCase
│   │       │   ├── smart_move.rs           # SmartMoveUseCase
│   │       │   └── calculate_health.rs     # CalculateHealthUseCase
│   │       ├── dto/
│   │       │   ├── mod.rs
│   │       │   ├── scan_config.rs          # ScanConfiguration DTO
│   │       │   ├── scan_result.rs          # ScanResult DTO
│   │       │   ├── duplicate_result.rs     # DuplicateResult DTO
│   │       │   ├── clean_result.rs         # CleanResult DTO
│   │       │   ├── move_request.rs         # MoveRequest DTO
│   │       │   └── health_result.rs        # HealthResult DTO
│   │       └── error.rs                    # EngineError
│   │
│   │                                       # ── LAYER 4: Shell ──
│   │
│   └── petabyte-app/                       # Tauri Application Shell
│       ├── Cargo.toml                      # [deps] ALL crates + tauri
│       ├── build.rs
│       └── src/
│           ├── main.rs                     # tauri::Builder + plugin registration
│           ├── wiring.rs                   # Dependency injection / composition root
│           ├── commands/
│           │   ├── mod.rs
│           │   ├── scan_commands.rs        # #[tauri::command] scan, cancel, resume
│           │   ├── file_commands.rs        # large files, file details
│           │   ├── duplicate_commands.rs   # find duplicates, actions
│           │   ├── clean_commands.rs       # cache scan, execute clean
│           │   ├── move_commands.rs        # preview, execute move, undo
│           │   └── health_commands.rs      # get health score, trends
│           ├── events/
│           │   ├── mod.rs
│           │   ├── scan_events.rs          # scan:progress, scan:complete
│           │   ├── file_events.rs          # file:found, file:updated
│           │   └── operation_events.rs     # move:done, clean:done
│           ├── state.rs                    # AppState (managed Tauri state)
│           └── menu.rs                     # Native menu bar (optional)
│
│   ╔══════════════════════════════════════════════════════════════╗
│   ║            FRONTEND / REACT                                ║
│   ╚══════════════════════════════════════════════════════════════╝
│
├── src/                                    # React Frontend
│   ├── main.tsx                            # Entry point (ReactDOM.createRoot)
│   ├── App.tsx                             # Routes, layout, providers
│   ├── index.css                           # Tailwind directives + base styles
│   ├── vite-env.d.ts                       # Vite client types
│   │
│   ├── types/                              # TypeScript type definitions
│   │   ├── index.ts                        # Re-exports
│   │   ├── api.ts                          # Tauri invoke/event type contracts
│   │   ├── scan.ts                         # ScanConfig, ScanResult, ScanProgress
│   │   ├── file.ts                         # FileEntry, FileCategory
│   │   ├── duplicate.ts                    # DuplicateGroup, DuplicateAction
│   │   ├── cache.ts                        # CacheEntry, CacheGroup
│   │   ├── move.ts                         # MoveRequest, MovePreview
│   │   └── health.ts                      # HealthScore, HealthFactor
│   │
│   ├── stores/                             # Zustand state stores
│   │   ├── scanStore.ts                    # Current scan state & history
│   │   ├── fileStore.ts                    # File tree & selection
│   │   ├── duplicateStore.ts               # Duplicate groups
│   │   ├── cacheStore.ts                   # Cache entries
│   │   ├── moveStore.ts                    # Move operations
│   │   ├── healthStore.ts                  # Health score
│   │   └── uiStore.ts                      # UI state (sidebar, theme, modals)
│   │
│   ├── hooks/                              # Custom React hooks
│   │   ├── useScan.ts                      # Invoke scan + listen to events
│   │   ├── useDuplicates.ts                # Duplicate detection & management
│   │   ├── useHealth.ts                    # Health score fetching
│   │   ├── useCleaner.ts                   # Cache cleaner operations
│   │   ├── useFileMove.ts                  # Move operations
│   │   ├── useTauriEvent.ts               # Generic Tauri event listener
│   │   ├── useTauriCommand.ts             # Generic Tauri invoke wrapper
│   │   └── useKeyboard.ts                 # Keyboard shortcuts
│   │
│   ├── lib/                                # Pure utility functions
│   │   ├── format.ts                       # formatBytes, formatDuration, formatDate
│   │   ├── tree.ts                         # File tree builder from flat list
│   │   ├── colors.ts                       # Category → color mapping
│   │   ├── constants.ts                    # UI constants, thresholds
│   │   └── platform.ts                    # Browser/platform detection
│   │
│   ├── components/                         # UI Components (Atomic Design)
│   │   ├── ui/                             # Atoms — base primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Progress.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── Spinner.tsx
│   │   │
│   │   ├── layout/                         # Layout components
│   │   │   ├── AppShell.tsx                # Main layout shell
│   │   │   ├── Sidebar.tsx                 # Navigation sidebar
│   │   │   ├── Header.tsx                  # Top header bar
│   │   │   └── ContentArea.tsx             # Main content wrapper
│   │   │
│   │   ├── scanner/                        # Scanner feature
│   │   │   ├── DriveSelector.tsx           # Drive/volume selection
│   │   │   ├── ScanConfigForm.tsx          # Scan configuration
│   │   │   ├── ScanProgress.tsx            # Real-time progress bar
│   │   │   ├── ScanResultSummary.tsx       # Post-scan summary card
│   │   │   └── ScanHistory.tsx             # Previous scans list
│   │   │
│   │   ├── file-list/                      # File display
│   │   │   ├── FileTable.tsx               # Sortable file table
│   │   │   ├── FileTree.tsx                # Directory tree explorer
│   │   │   ├── FileCard.tsx                # File detail card
│   │   │   ├── FileIcon.tsx                # Icon by type/category
│   │   │   ├── FileBreadcrumb.tsx          # Path breadcrumb navigation
│   │   │   ├── LargeFileList.tsx           # Top-N largest files
│   │   │   └── DirectoryPieChart.tsx       # Storage distribution chart
│   │   │
│   │   ├── duplicates/                     # Duplicate detection
│   │   │   ├── DuplicateGroupCard.tsx      # Collapsible duplicate group
│   │   │   ├── DuplicateRow.tsx            # Single file in group
│   │   │   ├── DuplicateToolbar.tsx        # Select all, delete, move actions
│   │   │   └── DuplicateStats.tsx          # Summary statistics
│   │   │
│   │   ├── cleaner/                        # Cache cleaner
│   │   │   ├── CacheCategoryCard.tsx       # Category (Rust, Node, etc.)
│   │   │   ├── CacheItemRow.tsx            # Individual cache entry
│   │   │   ├── CleanPreview.tsx            # What will be cleaned
│   │   │   └── CleanResult.tsx             # Post-clean summary
│   │   │
│   │   ├── move/                           # Smart move
│   │   │   ├── MoveDialog.tsx              # Source → destination picker
│   │   │   ├── MovePreview.tsx             # Dry-run preview
│   │   │   ├── MoveProgress.tsx            # Move execution progress
│   │   │   ├── MoveHistory.tsx             # Past move operations
│   │   │   └── UndoButton.tsx              # One-click undo
│   │   │
│   │   ├── health/                         # Health score
│   │   │   ├── HealthGauge.tsx             # Circular/radial gauge
│   │   │   ├── FactorBreakdown.tsx         # Per-factor score breakdown
│   │   │   ├── TrendChart.tsx              # Historical trend line chart
│   │   │   └── RecommendationCard.tsx      # Actionable suggestion
│   │   │
│   │   ├── settings/                       # Settings
│   │   │   ├── GeneralSettings.tsx         # Theme, language, startup
│   │   │   ├── ScanSettings.tsx            # Default scan config
│   │   │   ├── CleanerSettings.tsx         # Cache rule preferences
│   │   │   └── AboutPanel.tsx              # App version, credits
│   │   │
│   │   └── shared/                         # Shared/composed components
│   │       ├── EmptyState.tsx              # Empty/no-data state
│   │       ├── ErrorState.tsx              # Error display
│   │       ├── ConfirmDialog.tsx           # Confirmation modal
│   │       ├── SearchBar.tsx               # Global file search
│   │       └── StatusBadge.tsx             # Status indicator
│   │
│   └── pages/                              # Page components (1:1 with routes)
│       ├── DashboardPage.tsx               # Overview / landing
│       ├── ScannerPage.tsx                 # Full scan interface
│       ├── DuplicatesPage.tsx              # Duplicate management
│       ├── CleanerPage.tsx                 # Cache cleaning
│       ├── MovePage.tsx                    # File moving
│       ├── HealthPage.tsx                  # Health score
│       └── SettingsPage.tsx                # App settings
│
│   ╔══════════════════════════════════════════════════════════════╗
│   ║            TAURI SHELL                                     ║
│   ╚══════════════════════════════════════════════════════════════╝
│
├── src-tauri/                              # Tauri Configuration
│   ├── Cargo.toml                          # Declares petabyte-app as dependency
│   ├── tauri.conf.json                     # Tauri v2 config (windows, permissions, plugins)
│   ├── capabilities/
│   │   └── default.json                    # Permission manifest
│   ├── icons/                              # App icons (all platforms)
│   │   ├── icon.ico
│   │   ├── icon.png
│   │   ├── icon.icns
│   │   └── ...
│   ├── entitlements/                       # macOS entitlements
│   │   └── macos.entitlements
│   └── build.rs                            # Tauri build script
│
│   ╔══════════════════════════════════════════════════════════════╗
│   ║            DOCUMENTATION                                   ║
│   ╚══════════════════════════════════════════════════════════════╝
│
├── docs/
│   ├── README.md                           # Documentation index
│   ├── architecture/
│   │   ├── system-architecture.md          # High-level architecture
│   │   └── repository-structure.md         # This file
│   ├── data-model.md                      # SQLite schema design
│   ├── crate-guide.md                      # Crate dependency & contribution guide
│   ├── development.md                      # Setup guide, dev workflow
│   ├── testing.md                          # Testing strategy & guidelines
│   ├── benchmarking.md                     # Performance benchmarks guide
│   ├── release.md                          # Release process
│   ├── contributing.md                     # Contribution guidelines
│   └── decisions/                          # Architecture Decision Records (ADRs)
│       ├── 0001-use-clean-architecture.md
│       ├── 0002-tiered-hashing.md
│       └── 0003-operation-journal.md
│
│   ╔══════════════════════════════════════════════════════════════╗
│   ║            TESTS, BENCHMARKS, CI/CD                        ║
│   ╚══════════════════════════════════════════════════════════════╝
│
├── tests/                                  # Integration tests
│   ├── scanner_tests.rs                    # End-to-end scanner tests
│   ├── duplicate_tests.rs                  # Full duplicate detection pipeline
│   ├── move_tests.rs                       # Move + undo integration
│   └── health_tests.rs                     # Health score integration
│
├── benches/                                # Benchmarks (criterion)
│   ├── scanner_bench.rs                    # Filesystem traversal throughput
│   ├── hasher_bench.rs                     # Hash performance (size vs time)
│   ├── duplicate_bench.rs                  # Duplicate detection scaling
│   ├── database_bench.rs                   # SQLite batch insert throughput
│   └── scan_pipeline_bench.rs             # End-to-end scan pipeline
│
├── scripts/                                # Build & dev scripts
│   ├── setup.sh                            # Initial dev environment setup
│   ├── dev.sh                              # Start dev server
│   ├── build.sh                            # Production build
│   ├── test.sh                             # Run all tests
│   ├── lint.sh                             # Run clippy + ESLint
│   ├── bench.sh                            # Run benchmarks
│   ├── coverage.sh                         # Code coverage
│   └── release.sh                          # Create release artifacts
│
└── .github/                                # GitHub configuration
    ├── CODE_OF_CONDUCT.md
    ├── CONTRIBUTING.md
    ├── SECURITY.md
    ├── FUNDING.yml
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.md
    │   ├── feature_request.md
    │   └── config.yml
    └── workflows/
        ├── ci.yml                          # PR checks: build, lint, test, clippy
        ├── nightly.yml                     # Nightly: full test suite + benchmark
        ├── release.yml                     # Release: tag, build, publish artifacts
        ├── security-audit.yml              # cargo audit weekly
        ├── dependency-review.yml           # PR dependency review
        ├── code-coverage.yml               # Codecov upload
        └── stale-issues.yml                # Stale issue management
```

---

## 2. Penjelasan Setiap Crate

### Layer 0 — Foundation (No Workspace Dependencies)

| Crate | Tanggung Jawab | Boleh Akses | Tidak Boleh Akses |
|-------|---------------|-------------|-------------------|
| `petabyte-shared-models` | Definisi semua entity, value object, dan port trait. **Inti dari domain.** Tidak ada logika infrastruktur. | Crate eksternal (serde, thiserror) | Crate workspace manapun |
| `petabyte-shared` | Error types, konstanta, utilitas cross-platform, helper test. `PetaByteError` sebagai error top-level. | Crate eksternal (serde, thiserror) | Crate workspace manapun |

### Layer 1 — Infrastructure (Implementasi Port)

| Crate | Tanggung Jawab | Boleh Akses | Tidak Boleh Akses |
|-------|---------------|-------------|-------------------|
| `petabyte-database` | SQLite: connection pool (r2d2), migrasi, semua repository (`FileRepository`, `ScanRepository`, `MoveJournal`). WAL mode, batch insert. | `shared-models`, `shared` | `engine`, `scanner`, `hasher`, `app` |
| `petabyte-scanner` | Traversal filesystem paralel (`jwalk`). Mapping `DirEntry` → `FileEntry`. Filter symlink, permission handling. Checkpoint & resume. | `shared-models`, `shared` | `engine`, `database`, `app` |
| `petabyte-hasher` | Tiered hashing (size → partial blake3 → full blake3). Hash cache untuk menghindari re-hash. | `shared-models`, `shared` | `engine`, `scanner`, `database`, `app` |

### Layer 2 — Service (Business Logic)

| Crate | Tanggung Jawab | Boleh Akses | Tidak Boleh Akses |
|-------|---------------|-------------|-------------------|
| `petabyte-duplicate-detector` | Algoritma duplicate detection 3-tier. Menerima `FileQueryPort` + `HasherPort` via DI. Tidak tahu implementasi konkret. | `shared-models`, `shared` | `database`, `hasher`, `engine`, `app` |
| `petabyte-cache-cleaner` | Rule engine untuk mendeteksi cache developer. YAML rules. Trash-first removal. | `shared-models`, `shared` | `engine`, `database`, `app` |
| `petabyte-smart-move` | Operasi file aman: move + verify checksum, trash integration, dry-run, undo. | `shared-models`, `shared` | `engine`, `database`, `app` |
| `petabyte-health-score` | Weighted scoring algorithm. Menerima `HealthQueryPort` via DI. | `shared-models`, `shared` | `engine`, `database`, `app` |

### Layer 3 — Application

| Crate | Tanggung Jawab | Boleh Akses | Tidak Boleh Akses |
|-------|---------------|-------------|-------------------|
| `petabyte-core-engine` | **Use cases:** orchestrasi scan, duplicate detection, cache cleaning, smart move, health score. Hanya bergantung pada port trait, bukan implementasi. Semua dependency di-inject via constructor. | `shared-models`, `shared` | `scanner`, `database`, `hasher`, `duplicate-detector`, `cache-cleaner`, `smart-move`, `health-score`, `app` |

### Layer 4 — Shell

| Crate | Tanggung Jawab | Boleh Akses | Tidak Boleh Akses |
|-------|---------------|-------------|-------------------|
| `petabyte-app` | **Composition root.** Membuat instance semua crate, melakukan dependency injection, mendaftarkan Tauri commands & events. | ALL crates (untuk wiring) | — |

---

## 3. Dependency Diagram (ASCII)

```
                     ┌──────────────────────────────────────────┐
                     │             petabyte-app                  │
                     │   (Tauri Shell - Composition Root)       │
                     └────┬─────┬─────┬─────┬─────┬─────┬──────┘
                          │     │     │     │     │     │
          ┌───────────────┘     │     │     │     │     └───────────────┐
          ▼                     ▼     │     ▼     ▼                     ▼
 ┌────────────────┐   ┌────────────────┐ │ ┌────────────────┐   ┌────────────────┐
 │ petabyte-      │   │ petabyte-      │ │ │ petabyte-      │   │ petabyte-      │
 │ scanner        │   │ database       │ │ │ duplicate-     │   │ cache-cleaner  │
 └───────┬────────┘   └───────┬────────┘ │ │ detector       │   └───────┬────────┘
         │                    │          │ └───────┬────────┘           │
         │                    │          │         │                    │
         │                    │          │         │                    │
         ▼                    ▼          │         ▼                    ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                         petabyte-core-engine                            │
 │          (Use Cases - hanya tahu trait dari shared-models)              │
 └─────────────────────────────────────────────────────────────────────────┘
          │                    │                    │                    │
          ▼                    ▼                    ▼                    ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                        petabyte-shared-models                           │
 │     Entities │ Value Objects │ Port Traits (ScannerPort, FileRepo...)  │
 └─────────────────────────────────────────────────────────────────────────┘
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                           petabyte-shared                               │
 │            Errors │ Constants │ Platform Utils │ Serde Helpers          │
 └─────────────────────────────────────────────────────────────────────────┘

                  ── Also wired by app, not depended by engine ──

 ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
 │ petabyte-      │   │ petabyte-      │   │ petabyte-      │
 │ hasher         │   │ smart-move     │   │ health-score   │
 └────────────────┘   └────────────────┘   └────────────────┘
```

### Simplified Dependency Matrix

```
                    ┌─────────┬─────────┬────────┬──────────┬───────────┬──────┐
                    │  shared │  shared │  scan  │  database│  engine  │  app │
                    │ -models │         │  -ner  │          │          │      │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ shared-models     │    ✗    │    ✗    │   ✗    │    ✗     │    ✗     │  ✗   │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ shared            │    ✗    │    ✗    │   ✗    │    ✗     │    ✗     │  ✗   │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ scanner           │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ database          │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ hasher            │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ duplicate-detector│    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ cache-cleaner     │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ smart-move        │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ health-score      │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ core-engine       │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├───────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ app               │    ✓    │    ✓    │   ✓    │    ✓     │    ✓     │  ✗   │
└───────────────────┴─────────┴─────────┴────────┴──────────┴───────────┴──────┘
```

**Legend:** ✓ = depends on, ✗ = does NOT depend on

---

## 4. Dependency Rules (Access Control)

### Aturan Emas

```
                  petabyte-app (tahu segalanya, untuk wiring)
                       │
        ┌──────────────┼──────────────────┐
        ▼              ▼                   ▼
    petabyte-core-engine  ────────   Service/Infra Crates
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
            petabyte-shared-models
            petabyte-shared
```

### Strict Rules

**Rule 1: Foundation Isolation**
`petabyte-shared-models` dan `petabyte-shared` TIDAK BOLEH mengimpor crate workspace manapun. Mereka adalah *pure foundation*.

**Rule 2: No Skylines**
`petabyte-core-engine` TIDAK BOLEH mengimpor crate infrastruktur/service manapun (`scanner`, `database`, `hasher`, `duplicate-detector`, `cache-cleaner`, `smart-move`, `health-score`). Engine hanya tahu trait dari `shared-models`.

**Rule 3: No Upward Dependency**
Service/infrastructure crates TIDAK BOLEH mengimpor `petabyte-core-engine` atau `petabyte-app`.

**Rule 4: Service Isolation**
Service crates (`duplicate-detector`, `cache-cleaner`, `smart-move`, `health-score`) satu sama lain TIDAK BOLEH saling mengimpor. Mereka independen.

**Rule 5: No Cross-Infra Dependency**
Infrastructure crates (`scanner`, `database`, `hasher`) satu sama lain TIDAK BOLEH saling mengimpor. Jika perlu komunikasi, gunakan port trait yang di-inject oleh `app`.

**Rule 6: App Is One-Way Mirror**
`petabyte-app` boleh mengimpor SEMUA crate. TIDAK ADA crate yang boleh mengimpor `petabyte-app`.

### Enforcement

Enforce aturan ini di `ci.yml`:
```yaml
# Gunakan cargo-deny untuk memblokir dependency yang melanggar
- name: Check dependency rules
  run: cargo deny check bans
```

Buat file `deny.toml` di root dengan aturan:
```toml
[graph]
# Hanya izinkan dependency sesuai hierarchy
# (akan didefinisikan secara eksplisit per crate)
```

---

## 5. Dependency Injection Flow

```
 ┌──────────────┐
 │  petabyte-app │
 │  (wiring.rs)  │
 └──────┬───────┘
        │
        │  1. Buat infrastructure instances
        │
        ├──→ petabyte-database::SqliteRepo::new(path)
        │     → mengembalikan Arc<dyn FileRepository>
        │     → mengembalikan Arc<dyn ScanRepository>
        │
        ├──→ petabyte-scanner::ParallelWalker::new(config)
        │     → mengembalikan Arc<dyn ScannerPort>
        │
        ├──→ petabyte-hasher::TieredHasher::new(cache)
        │     → mengembalikan Arc<dyn HasherPort>
        │
        ├──→ petabyte-duplicate-detector::Detector::new(file_repo, hasher)
        │     → menerima Arc<dyn FileQueryPort>, Arc<dyn HasherPort>
        │     → mengembalikan Arc<dyn DuplicateDetector>
        │
        ├──→ petabyte-cache-cleaner::Cleaner::new()
        │     → mengembalikan Arc<dyn CacheCleaner>
        │
        ├──→ petabyte-smart-move::SafeMover::new()
        │     → mengembalikan Arc<dyn FileOpPort>
        │     → mengembalikan Arc<dyn MoveJournal>
        │
        └──→ petabyte-health-score::Calculator::new(health_repo)
              → mengembalikan Arc<dyn HealthScoreCalculator>
        │
        │  2. Inject ke engine (use cases)
        │
        └──→ petabyte-core-engine::ScanDriveUseCase::new(
        │         scanner, file_repo, scan_repo, progress_emitter
        │    )
        │
        └──→ petabyte-core-engine::FindDuplicatesUseCase::new(
        │         duplicate_detector, file_repo
        │    )
        │
        └──→ ... (use cases lainnya)
        │
        │  3. Register Tauri state & commands
        │
        └──→ app.manage(AppState { scan_uc, duplicate_uc, ... })
            → app.invoke_handler(commands![...])
```

---

## 6. Struktur Frontend React — Detail

### Aturan Akses Frontend ke Backend

```
[React Component]
      │
      ▼
[Custom Hook]  ←── useScan(), useDuplicates(), dll.
      │
      ├── invoke("command_name", args)    ←── Request/Response
      └── listen("event:name", callback)  ←── Streaming/Real-time
      │
      ▼
[Zustand Store]  ←── update(state) → re-render
      │
      ▼
[React Component]  ←── render with new data
```

### Interface Contract (TypeScript)

Semua type di `src/types/` adalah mirror dari DTO di `petabyte-core-engine::dto`. Keduanya harus sinkron (manual, atau ideally via `ts-rs` crate):

```rust
// Rust — petabyte-core-engine/src/dto/scan_result.rs
#[derive(Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS))]
pub struct ScanResult {
    pub total_files: u64,
    pub total_size: u64,
    pub scan_duration_ms: u64,
    pub status: ScanStatus,
}
```

```typescript
// TypeScript — src/types/scan.ts
export interface ScanResult {
    total_files: number;
    total_size: number;
    scan_duration_ms: number;
    status: "running" | "completed" | "cancelled" | "failed";
}
```

**Rekomendasi:** Gunakan `ts-rs` crate untuk auto-generate TypeScript types dari Rust struct, mencegah desync.

---

## 7. Strategi Testing

### Per Layer

| Layer | Test Type | Tools | Lokasi |
|-------|-----------|-------|--------|
| Domain Models | Unit test | `#[cfg(test)]` | Di setiap crate: `src/entities/*.rs`, `src/value_objects/*.rs` |
| Use Cases | Unit test + mock | `mockall` crate | `petabyte-core-engine/src/use_cases/*.rs` |
| Database | Integration test | `:memory:` SQLite | `petabyte-database/tests/` |
| Scanner | Integration test | Temp directory fixture | `petabyte-scanner/tests/` |
| End-to-End | Full pipeline | `tempfile` + Tauri test harness | `tests/` (workspace root) |
| Benchmark | Performance | `criterion` | `benches/` (workspace root) |

### Test Coverage Target

| Area | Target |
|------|--------|
| Domain entities & logic | 100% |
| Use cases (all branches) | 100% |
| Database repositories | 90%+ |
| Scanner (happy + error paths) | 85%+ |
| File operations (including error recovery) | 95%+ |
| Overall project | 80%+ |

---

## 8. Struktur GitHub Actions

### CI Pipeline (`ci.yml`)

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint-rust:
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo clippy --all-targets -- -D warnings
      - run: cargo fmt --check

  lint-js:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint

  test-rust:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test --workspace

  test-js:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test

  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo build --workspace --release
      - run: npm run build
```

### Nightly Pipeline (`nightly.yml`)

```yaml
name: Nightly
on:
  schedule:
    - cron: "0 6 * * *"  # Every day at 06:00 UTC
jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo install cargo-audit
      - run: cargo audit

  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo bench --workspace
      - uses: benchmark-action/github-action-benchmark@v1

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo install cargo-tarpaulin
      - run: cargo tarpaulin --workspace --out xml
      - uses: codecov/codecov-action@v4
```

---

## 9. Best Practice Recommendations

### 9.1 Workspace Configuration

**Root `Cargo.toml`:**
```toml
[workspace]
resolver = "2"
members = [
    "crates/petabyte-shared-models",
    "crates/petabyte-shared",
    "crates/petabyte-database",
    "crates/petabyte-scanner",
    "crates/petabyte-hasher",
    "crates/petabyte-duplicate-detector",
    "crates/petabyte-cache-cleaner",
    "crates/petabyte-smart-move",
    "crates/petabyte-health-score",
    "crates/petabyte-core-engine",
    "crates/petabyte-app",
    "src-tauri",
]

[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT OR Apache-2.0"
repository = "https://github.com/username/petabyte"

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
thiserror = "1"
tauri = { version = "2", optional = true }
# ... shared dependencies pinned at workspace level
```

**Keuntungan:**
- Semua crate pakai version dependency yang sama
- `cargo update` konsisten
- Dependency tree jelas

### 9.2 Feature Flags per Crate

Gunakan feature flags di `petabyte-app` untuk conditional compilation:

```toml
[features]
default = ["scanner", "duplicate-detector", "cache-cleaner"]
scanner = ["petabyte-scanner"]
duplicate-detector = ["petabyte-duplicate-detector"]
cache-cleaner = ["petabyte-cache-cleaner"]
smart-move = ["petabyte-smart-move"]
health-score = ["petabyte-health-score"]
database = ["petabyte-database"]

[dependencies]
petabyte-scanner = { path = "../petabyte-scanner", optional = true }
# ...
```

### 9.3 Error Handling Strategy

Gunakan enum hierarkis:

```rust
// petabyte-shared — PetaByteError (top level)
#[derive(Debug, thiserror::Error)]
pub enum PetaByteError {
    #[error("Scan error: {0}")]
    Scan(#[from] ScanError),
    #[error("Database error: {0}")]
    Database(#[from] DbError),
    #[error("File operation error: {0}")]
    FileOp(#[from] FileOpError),
    #[error("Hash error: {0}")]
    Hash(#[from] HashError),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Cancelled")]
    Cancelled,
}

// Each crate defines its own error types, converted via From/Into
```

Semua `#[tauri::command]` return `Result<T, PetaByteError>` — Tauri akan serialize error ke frontend secara otomatis.

### 9.4 Public API Surface

Setiap crate harus minimal re-export:

```rust
// petabyte-scanner/src/lib.rs
pub use parallel_walker::ParallelWalker;
pub use filter_rules::FilterConfig;
pub use error::ScanError;

// Selebihnya private (di belakang `pub(crate)`)
```

**Aturan:** Hanya expose apa yang diperlukan oleh `app` untuk wiring. Jangan expose internal implementation details.

### 9.5 Caching & Build Time

- **`cargo-chef`** untuk Docker multi-stage build di CI
- **`sccache`** untuk caching kompilasi
- **`mold`** linker (Linux) / **`lld`** (macOS) untuk mempercepat link
- Workspace dengan 11 crates memberikan *incremental compilation* yang baik — hanya crate yang berubah yang di-recompile

### 9.6 Semantic Versioning

```
petabyte-shared-models    → v0.1.x  (paling stabil, jarang berubah)
petabyte-shared           → v0.1.x
petabyte-database         → v0.1.x
petabyte-scanner          → v0.1.x
petabyte-hasher           → v0.1.x
petabyte-duplicate-detector → v0.1.x
petabyte-cache-cleaner    → v0.1.x
petabyte-smart-move       → v0.1.x
petabyte-health-score     → v0.1.x
petabyte-core-engine      → v0.1.x  (mengikuti versi shared-models)
petabyte-app              → 0.1.0    (versi publik aplikasi)
```

### 9.7 Monorepo Tooling

| Tool | Fungsi |
|------|--------|
| `cargo-deny` | Audit dependency (license, ban, advisory) |
| `cargo-tarpaulin` | Code coverage |
| `cargo-criterion` | Benchmarking |
| `cargo-audit` | Security vulnerability scanning |
| `taplo` | TOML formatter (for `Cargo.toml`) |
| `cargo-machete` | Deteksi unused dependencies |
| `cargo-semver-checks` | Cek breaking changes antar versi |

### 9.8 Git Workflow

```
main          ← stable releases (tag: v0.1.0, v0.2.0)
develop       ← integration branch
feat/*        ← feature branches
fix/*         ← bugfix branches
bench/*       ← benchmark improvements
docs/*        ← documentation
```

Commit messages: [Conventional Commits](https://www.conventionalcommits.org/)
```
feat(scanner): add parallel directory traversal
fix(database): batch insert OOM on large scans
docs: add architecture decision record for tiered hashing
```

### 9.9 Performance Budget

| Operasi | Target (1M files) | Target (10M files) |
|---------|-------------------|--------------------|
| Full scan (SSD) | < 30s | < 5 menit |
| Duplicate detection | < 10s | < 1 menit |
| Large file query | < 100ms | < 500ms |
| Health score calc | < 1s | < 5s |
| Memory usage | < 200MB | < 500MB |
| Database size | < 200MB | < 2GB |

---

## 10. Ringkasan (30 Detik)

| Aspek | Detail |
|-------|--------|
| **Total crates** | 11 (foundation 2 + infra 3 + service 4 + app 1 + shell 1) |
| **Layers** | 5 layer (Foundation → Infrastructure → Service → Application → Shell) |
| **Dependency rule** | Satu arah: App → Service → Domain. Tidak ada upward/circular dependency |
| **DI pattern** | Constructor injection via `Arc<dyn Trait>` — semua wiring di `petabyte-app::wiring.rs` |
| **Test strategy** | Unit (domain) → Integration (infra) → E2E (full pipeline) |
| **CI/CD** | 7 GitHub Actions workflows: CI, nightly, release, audit, coverage, dependency review, stale issues |
| **Key principle** | Setiap crate independen, testable in isolation, dan bisa dikembangkan oleh kontributor berbeda secara paralel |
