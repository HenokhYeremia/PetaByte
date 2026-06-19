# PetaByte — Master Specification

> **Version:** 1.1
> **Status:** Active — Post-Implementation Audit
> **Single Source of Truth** for architecture, requirements, and implementation reference.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [MVP Scope](#2-mvp-scope)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [High-Level Architecture](#5-high-level-architecture)
6. [Repository Structure](#6-repository-structure)
7. [Database Summary](#7-database-summary)
8. [Scanner Engine Summary](#8-scanner-engine-summary)
9. [Duplicate Engine Summary](#9-duplicate-engine-summary)
10. [Smart Move Summary](#10-smart-move-summary)
11. [Cache Cleaner Summary](#11-cache-cleaner-summary)
12. [Health Score Summary](#12-health-score-summary)
13. [Performance Targets](#13-performance-targets)
14. [Security Requirements](#14-security-requirements)
15. [Coding Standards](#15-coding-standards)
16. [Future Roadmap](#16-future-roadmap)

---

## 1. Product Vision

### 1.1 Vision Statement

**PetaByte** is a cross-platform desktop application (Windows, macOS, Linux) that gives users deep visibility and intelligent control over their storage. It transforms raw file-system data into actionable insights — finding duplicates, cleaning developer caches, moving files safely, and scoring storage health — all with a privacy-first, local-only architecture.

### 1.2 Target Users

| Segment | Need | Key Feature |
|---------|------|-------------|
| **Software Developers** | Reclaim GB from `node_modules`, `target/`, `.cache` | Developer Cache Cleaner |
| **General Users** | Free up disk space safely, understand storage usage | Scanner + Duplicate Detection |
| **Power Users / Admins** | Safe file operations across volumes, health monitoring | Smart Move + Health Score |
| **Photographers / Creators** | Manage large media files, find duplicates | Large File Analysis |

### 1.3 Competitive Differentiation

| Competitor | Strengths | PetaByte Advantage |
|-----------|-----------|-------------------|
| WinDirStat / WizTree | Fast scanning, treemap visualization | Cache Cleaner + Smart Move + Health Score |
| DaisyDisk | Beautiful UI, disk map | Same + cross-platform + actionable insights |
| SpaceSniffer | Real-time, zoomable | Developer-specific features + health scoring |
| CleanMyMac | Safe cleaning, system optimization | Windows/Linux + open-source + developer focus |
| GrandPerspective | macOS, open-source | Multi-platform + modern UI + duplicate detection |

### 1.4 Core Principles

1. **Privacy-first, local-only** — All processing happens on-device. No cloud, no telemetry.
2. **Safety over speed** — Journaled operations, trash-first, dry-run mandatory. Data loss is unacceptable.
3. **Actionable insights** — Not just visualization; tell the user what to do and why.
4. **Performant at scale** — 1M+ files in under 30 seconds. Parallel processing from day one.
5. **Cross-platform parity** — Feature-complete on Windows, macOS, and Linux.

---

## 2. MVP Scope

### 2.1 v1.0 — Core Platform

| Feature | Priority | Description |
|---------|----------|-------------|
| Filesystem Scanner | P0 | Parallel walk, filter, batch insert to SQLite, pause/resume/cancel, checkpoint |
| File Browser | P0 | Tree view, table view, sort by size/name/date, search |
| Large File Analysis | P0 | Top-N largest files, per-directory breakdown, file type distribution |
| Duplicate Detection | P0 | 5-tier hashing pipeline (size → partial hash → full hash), grouping |
| Cache Cleaner | P0 | YAML rule engine, built-in rules for 6 ecosystems, trash-first removal |
| Smart Move | P0 | 6-phase journal-first pipeline, dry-run, undo, crash recovery |
| Storage Health Score | P0 | 7-factor weighted scoring, grade A-E, recommendations, trend tracking |
| Dashboard | P0 | Health gauge, factor breakdown, summary stats, quick actions |
| Cross-platform | P0 | Windows, macOS, Linux (x86-64 + ARM for macOS) |

### 2.2 v1.0 — Out of Scope

| Feature | Reason | Future Version |
|---------|--------|----------------|
| Real-time file watching (FS events) | Complexity | v1.1 |
| S.M.A.R.T integration | OS-level access complexity | v1.1 |
| Network drive scanning | Performance & reliability concerns | v1.2 |
| Cloud storage integration (Google Drive, Dropbox) | API dependency, scope creep | v2.0 |
| Plugin system | API stability not ready | v2.0 |
| Mobile companion app | Separate product | v3.0 |

---

## 3. Functional Requirements

### 3.1 Scanner

| ID | Requirement | Priority |
|----|-------------|----------|
| SCAN-001 | System shall traverse a user-selected directory path recursively | P0 |
| SCAN-002 | System shall traverse using parallel threads (jwalk), default = num_cpus | P0 |
| SCAN-003 | System shall filter by exclusion patterns (glob, regex, built-in system dirs) | P0 |
| SCAN-004 | System shall record file metadata: path, size, permissions, timestamps, depth | P0 |
| SCAN-005 | System shall batch-insert to SQLite (500-1000 entries per transaction) | P0 |
| SCAN-006 | System shall support pause/resume via atomic flags | P0 |
| SCAN-007 | System shall support cancellation with cleanup | P0 |
| SCAN-008 | System shall emit real-time progress events to frontend via Tauri IPC | P0 |
| SCAN-009 | System shall save checkpoint every 10K files or 30 seconds for resume | P0 |
| SCAN-010 | System shall handle permission-denied errors gracefully (skip, log, continue) | P0 |
| SCAN-011 | System shall support incremental scan (compare with previous session) | P1 |
| SCAN-012 | System shall classify files into categories (Document, Image, Video, Audio, Cache, Temp, Archive, System, Other) | P0 |

### 3.2 Duplicate Detection

| ID | Requirement | Priority |
|----|-------------|----------|
| DUP-001 | System shall group files by exact size as the first tier of duplicate detection | P0 |
| DUP-002 | System shall compute partial Blake3 hash (first 8KB) for candidate groups | P0 |
| DUP-003 | System shall compute full Blake3 hash for partial-hash-matched groups | P0 |
| DUP-004 | System shall use hash cache to avoid re-hashing files across scan sessions | P0 |
| DUP-005 | System shall store duplicate groups with file count, wasted bytes, hash reference | P0 |
| DUP-006 | System shall calculate total wasted space = sum((count_in_group - 1) * file_size) | P0 |
| DUP-007 | System shall support marking files as "keep" or "selected for removal" | P0 |
| DUP-008 | System shall emit progress events during detection | P0 |
| DUP-009 | System shall support resuming detection from last checkpoint | P1 |
| DUP-010 | System shall optionally filter by file extension before hashing | P1 |

### 3.3 Cache Cleaner

| ID | Requirement | Priority |
|----|-------------|----------|
| CCH-001 | System shall load cache detection rules from declarative YAML files | P0 |
| CCH-002 | System shall support matching rules by path glob, filename, and extension patterns | P0 |
| CCH-003 | System shall include built-in rules for Rust, Node.js, Python, Java, .NET, and general dev caches | P0 |
| CCH-004 | System shall categorize entries by ecosystem (Rust, Node, Python, Java, .NET, General) | P0 |
| CCH-005 | System shall calculate total size per category and overall | P0 |
| CCH-006 | System shall move items to OS trash (recycle bin) before permanent deletion | P0 |
| CCH-007 | System shall run safety checks before each deletion: path validity, not system dir, not user home, not in use | P0 |
| CCH-008 | System shall support dry-run mode (preview only, no changes) | P0 |
| CCH-009 | System shall support undoing clean operations via trash restore | P1 |
| CCH-010 | System shall emit progress events during scanning and cleaning | P0 |
| CCH-011 | System shall reject deleting items matching whitelist patterns | P0 |

### 3.4 Smart Move

| ID | Requirement | Priority |
|----|-------------|----------|
| SMV-001 | System shall write a journal entry BEFORE any file operation (journal-first) | P0 |
| SMV-002 | System shall validate pre-conditions: source exists, destination writable, sufficient space | P0 |
| SMV-003 | System shall use atomic rename for same-drive operations (instant, no copy) | P0 |
| SMV-004 | System shall use stream-copy with integrated Blake3 checksum for cross-drive operations | P0 |
| SMV-005 | System shall verify checksum of destination against source before deleting source | P0 |
| SMV-006 | System shall never delete source until destination is verified | P0 |
| SMV-007 | System shall support dry-run mode showing what will happen (no actual changes) | P0 |
| SMV-008 | System shall support undo via journal (reverse the operation) | P0 |
| SMV-009 | System shall recover from crashes at any phase (decision matrix per state) | P0 |
| SMV-010 | System shall emit progress events during copy/move operations | P0 |
| SMV-011 | System shall support batch operations (multiple files/directories in one request) | P0 |
| SMV-012 | System shall fall back to `.petabyte_recovery/` directory if OS trash is unavailable | P0 |

### 3.5 Health Score

| ID | Requirement | Priority |
|----|-------------|----------|
| HLT-001 | System shall calculate a storage health score on a scale of 0-100 | P0 |
| HLT-002 | System shall derive score from 7 weighted factors: Free Space, Fragmentation, Duplicates, Temp/Cache, Large Files, File Age, Disk Health | P0 |
| HLT-003 | System shall assign a letter grade (A=Excellent, B=Good, C=Fair, D=Poor, E=Critical) | P0 |
| HLT-004 | System shall generate actionable recommendations ordered by impact | P0 |
| HLT-005 | System shall show the top N factors affecting the score | P0 |
| HLT-006 | System shall store score snapshots for trend/history tracking | P0 |
| HLT-007 | System shall compute trend deltas (1 day, 7 days, 30 days, 90 days) | P0 |
| HLT-008 | System shall support emergency overrides (e.g., <3% free → max grade E) | P0 |
| HLT-009 | System shall support multiple user profiles (Default, Developer, Photographer, Server Admin, Custom) | P1 |
| HLT-010 | System shall support cross-volume comparison and aggregated system score | P0 |
| HLT-011 | System shall emit event on score update for dashboard refresh | P0 |

### 3.6 UI / Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| UI-001 | Dashboard shall display health gauge with score, grade, and color | P0 |
| UI-002 | Dashboard shall show factor breakdown bar chart sorted by impact | P0 |
| UI-003 | Dashboard shall show trend chart (7d/30d/90d) | P0 |
| UI-004 | Dashboard shall show top 5 recommendations with impact estimates | P0 |
| UI-005 | Dashboard shall show storage overview: total, used, free, file count | P0 |
| UI-006 | Scanner page shall show real-time progress with ETA during scan | P0 |
| UI-007 | Scanner page shall show file tree and table view post-scan | P0 |
| UI-008 | Duplicates page shall show grouped results with selection/action toolbar | P0 |
| UI-009 | Cleaner page shall show cache categories with size and risk level | P0 |
| UI-010 | Move page shall show preview, destination picker, and undo history | P0 |
| UI-011 | Settings page shall allow configuring scan exclusions, profiles, thresholds | P0 |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target (1M files) | Target (10M files) |
|--------|-------------------|--------------------|
| Full scan (SSD) | <30s | <5 min |
| Duplicate detection | <10s (after scan) | <1 min (after scan) |
| Large file query | <100ms | <500ms |
| Cache detection | <200ms | <1s |
| Health score calculation | <500ms | <2s |
| Dashboard query (latest) | <10ms | <10ms |
| Memory usage (scan) | <200MB | <500MB |
| Memory usage (idle) | <50MB | <50MB |
| Database size | <200MB | <2GB |

### 4.2 Scalability

- Scanner shall handle 10M+ files via streaming pipeline, never loading all into memory
- SQLite shall use WAL mode, batch inserts (500/transaction), strategic indexes
- Duplicate detection shall use tiered hashing to minimize full-hash operations (<0.1% of files)
- Cache cleaner rules shall be evaluated in bulk SQL queries, not per-file iteration

### 4.3 Reliability

- Smart Move operations shall guarantee: at worst, file exists at both locations; never at neither
- All file mutations shall be journaled (WAL for metadata, journal for operations)
- Application shall recover from crash mid-operation via journal replay
- Scanner shall checkpoint every 10K files or 30 seconds for resume
- All errors shall be non-fatal where possible; aggregated and reported

### 4.4 Cross-Platform

| Platform | Minimum Version | Architecture |
|----------|----------------|--------------|
| Windows | Windows 10 | x86-64 |
| macOS | macOS 12 Monterey | x86-64, ARM64 |
| Linux | Ubuntu 20.04+, Fedora 38+, equivalent | x86-64 |

Key platform considerations:
- Path separator normalization (`\` vs `/`) in all file operations
- Volume detection API difference (letter drives vs mount points)
- Trash/Restore API abstraction (`trash` crate)
- Permission model differences (Windows ACL vs Unix rwx)

### 4.5 Resilience

| Scenario | Expected Behavior |
|----------|------------------|
| Permission denied on specific file | Skip file, log error, continue scan |
| Drive disconnected mid-scan | Pause scan, emit error event, allow resume |
| SQLite disk full | Transaction rollback, emit error, keep prior data intact |
| Out of memory | Scanner uses streaming, never loads all files |
| App crash mid-move | Journal replay on restart; source exists, destination may be partial |
| User force-kills app | At worst, re-run scan with checkpoint resume |

### 4.6 Security

| Requirement | Implementation |
|-------------|----------------|
| No data exfiltration | All processing local, no network calls |
| Safe file deletion | Trash-first always; no permanent delete by default |
| Path traversal prevention | Validate all paths before operations |
| Permission boundaries | Never mutate files outside user-writable scope |
| Journal integrity | Journal written before operations; crash-atomic via SQLite transactions |
| Input validation | All paths validated, sanitized, normalized server-side |

### 4.7 Observability

| Mechanism | Purpose |
|-----------|---------|
| Structured logging (log crate) | Debugging, crash analysis |
| Tauri event stream | Real-time UI updates |
| Operation journal | All file mutations auditable |
| Health score snapshots | Trend analysis, debugging scoring algorithm |
| Error collector (scan) | Per-file error aggregation for reporting |

---

## 5. High-Level Architecture

### 5.1 Architecture Pattern

PetaByte uses **Clean Architecture** with **5 layers** and strict dependency rules:

```
  ┌─────────────────────────────────────────────────────────────┐
  │                   PRESENTATION LAYER                         │
  │            React / TypeScript (Atomic Design)                │
  └───────────────────────┬─────────────────────────────────────┘
                          │ Tauri IPC (invoke + events)
  ┌───────────────────────┴─────────────────────────────────────┐
  │                   INTERFACE / SHELL LAYER                     │
  │        petabyte-app (Tauri commands, events, wiring)        │
  └───────────────────────┬─────────────────────────────────────┘
                          │ calls use cases
  ┌───────────────────────┴─────────────────────────────────────┐
  │                   APPLICATION LAYER                           │
  │        petabyte-core-engine (use cases, DTOs)               │
  └───────────────────────┬─────────────────────────────────────┘
                          │ depends on ports (traits)
  ┌───────────────────────┴─────────────────────────────────────┐
  │                   DOMAIN LAYER                                │
  │     petabyte-shared-models (entities, value objects, ports) │
  │     petabyte-shared (errors, constants, utilities)          │
  └───────────────────────┬─────────────────────────────────────┘
                          │ implemented by
  ┌───────────────────────┴─────────────────────────────────────┐
  │                INFRASTRUCTURE LAYER                           │
  │    petabyte-scanner │ petabyte-database │ petabyte-hasher    │
  │    petabyte-smart-move │ petabyte-cache-cleaner              │
  │    petabyte-duplicate-detector │ petabyte-health-score      │
  └─────────────────────────────────────────────────────────────┘
```

### 5.2 Dependency Rules (Strict)

```
Rule 1: Foundation Isolation
  petabyte-shared-models + petabyte-shared import NO workspace crates.

Rule 2: No Skylines
  petabyte-core-engine imports NO infrastructure or service crates.
  It knows only ports (traits) from shared-models.

Rule 3: No Upward Dependency
  Service/infrastructure crates NEVER import core-engine or app.

Rule 4: Service Isolation
  Service crates NEVER import each other.

Rule 5: No Cross-Infra Dependency
  Infrastructure crates NEVER import each other.

Rule 6: App Is One-Way Mirror
  petabyte-app imports ALL crates. NO crate imports petabyte-app.
```

### 5.3 Dependency Injection

All wiring is in `petabyte-app::wiring.rs` via constructor injection:

```
petabyte-app (wiring.rs)
    │
    ├──→ database::SqliteRepo::new(path)
    │     → Arc<dyn FileRepository>
    │     → Arc<dyn ScanRepository>
    │
    ├──→ scanner::ParallelWalker::new(config)
    │     → Arc<dyn ScannerPort>
    │
    ├──→ hasher::TieredHasher::new(cache)
    │     → Arc<dyn HasherPort>
    │
    ├──→ duplicate_detector::Detector::new(file_repo, hasher)
    │     → Arc<dyn DuplicateDetector>
    │
    ├──→ cache_cleaner::Cleaner::new()
    │     → Arc<dyn CacheCleaner>
    │
    ├──→ smart_move::SafeMover::new()
    │     → Arc<dyn FileOpPort> + Arc<dyn MoveJournal>
    │
    └──→ health_score::Calculator::new()
          → Arc<dyn HealthScoreCalculator>
    │
    └──→ Inject into use cases:
          ScanDriveUseCase::new(scanner, file_repo, scan_repo, progress)
          FindDuplicatesUseCase::new(dup_detector, file_repo)
          → ... (all use cases)
    │
    └──→ Register AppState + Tauri commands
```

### 5.4 Threading Model

```
┌────────────────────────────────────────────┐
│            MAIN THREAD (UI)                  │
│   Tauri event loop + React rendering       │
│   Receives events, updates Zustand stores  │
└───────────────────┬────────────────────────┘
                    │ async
┌───────────────────▼────────────────────────┐
│           TOKIO RUNTIME                      │
│   ┌────────────┐  ┌────────────┐           │
│   │ Command    │  │ Event      │           │
│   │ Handlers   │  │ Emitters   │           │
│   └────────────┘  └────────────┘           │
└───────────────────┬────────────────────────┘
                    │ spawn_blocking / rayon
┌───────────────────▼────────────────────────┐
│          WORKER THREAD POOL                  │
│   ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│   │ jwalk    │  │ Blake3   │  │ SQLite  │ │
│   │ (parallel│  │ (rayon)  │  │ (serial │ │
│   │  walk)   │  │          │  │  writer)│ │
│   └──────────┘  └──────────┘  └─────────┘ │
└────────────────────────────────────────────┘
```

Key principle: Single SQLite writer thread to prevent contention; concurrent readers via WAL mode.

---

## 6. Repository Structure

### 6.1 Top-Level Layout

```
petabyte/
├── Cargo.toml                      # Workspace root (11 crates + src-tauri)
├── rust-toolchain.toml             # Stable Rust, clippy + rustfmt
├── package.json                    # React/TypeScript frontend
├── vite.config.ts                  # Vite bundler config
├── tailwind.config.ts              # Tailwind CSS config
├── tsconfig.json / tsconfig.node.json
├── index.html                      # HTML entry point
├── .gitignore / .editorconfig / .prettierrc / .eslintrc.cjs
│
├── crates/                         # ── 11 Rust Workspace Crates ──
│   ├── petabyte-shared-models/     # Layer 0: Entities, Value Objects, Port traits
│   ├── petabyte-shared/            # Layer 0: Error types, constants, platform utils
│   ├── petabyte-database/          # Layer 1: SQLite connection, migrations, repos
│   ├── petabyte-scanner/           # Layer 1: jwalk parallel traversal, filter
│   ├── petabyte-hasher/            # Layer 1: Tiered Blake3 hashing + cache
│   ├── petabyte-duplicate-detector/ # Layer 2: 5-tier duplicate detection pipeline
│   ├── petabyte-cache-cleaner/     # Layer 2: YAML rule engine, trash removal
│   ├── petabyte-smart-move/        # Layer 2: 6-phase journaled move operations
│   ├── petabyte-health-score/      # Layer 2: 7-factor weighted scoring engine
│   ├── petabyte-core-engine/       # Layer 3: Use cases (depends only on ports)
│   └── petabyte-app/               # Layer 4: Composition root, Tauri commands
│
├── src/                            # ── React Frontend ──
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Router + layout
│   ├── types/                      # TypeScript interfaces (mirror Rust DTOs)
│   ├── stores/                     # Zustand state stores (7 stores)
│   ├── hooks/                      # Custom React hooks (Tauri bridge)
│   ├── mocks/                      # Mock data for UI development
│   ├── components/                 # Atomic Design UI components (59 total)
│   │   ├── ui/                     # Button, Card, Skeleton, Spinner
│   │   ├── layout/                 # AppShell, Sidebar, Header
│   │   ├── shared/                 # ErrorBoundary, LoadingScreen
│   │   ├── dashboard/              # 10 widgets (HealthScoreCard, StorageOverviewCard, etc.)
│   │   ├── scanner/                # 9 components (DriveSelector, ScanProgressSection, etc.)
│   │   ├── duplicates/             # 5 components (DuplicateGroupList, DuplicateDetailsPanel, etc.)
│   │   ├── cleaner/                # 6 components (CacheSummarySection, CacheCategoryPanel, etc.)
│   │   ├── move/                   # 6 components (DestinationSelector, MovePreviewSection, etc.)
│   │   ├── health/                 # 6 components (HealthScoreHero, ScoreBreakdown, etc.)
│   │   └── settings/               # 8 components (GeneralSettings + 6 section + SettingsPrimitives)
│   └── pages/                      # 7 pages (DashboardPage, ScannerPage, DuplicatesPage...
│
├── src-tauri/                      # ── Tauri Desktop Shell ──
│   ├── Cargo.toml                  # Declares petabyte-app as dependency
│   ├── build.rs                    # Tauri build script
│   ├── tauri.conf.json             # App config, window, bundle settings
│   ├── capabilities/default.json   # Permission manifest
│   ├── icons/                      # App icons for all platforms
│   ├── entitlements/               # macOS entitlements
│   └── src/main.rs                 # Tauri bootstrap
│
├── docs/                           # ── Documentation ──
│   ├── architecture/               # Detailed design documents
│   └── MASTER_SPECIFICATION.md     # This file
│
├── tests/                          # Integration tests (workspace level)
├── benches/                        # Criterion benchmarks
├── scripts/                        # Build/dev/test shell scripts
├── .github/workflows/              # GitHub Actions CI/CD
│   ├── ci.yml                      # Build, lint, test, clippy
│   ├── nightly.yml                 # Full test suite + benchmark
│   ├── release.yml                 # Tag, build, publish
│   ├── security-audit.yml          # cargo audit weekly
│   └── code-coverage.yml           # Codecov upload
└── deny.toml                       # cargo-deny dependency rules
```

### 6.2 Crate Dependency Matrix

```
                     ┌─────────┬─────────┬────────┬──────────┬───────────┬──────┐
                     │  shared │  shared │  scan  │  database│  engine  │  app │
                     │ -models │         │  -ner  │          │          │      │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ shared-models      │    ✗    │    ✗    │   ✗    │    ✗     │    ✗     │  ✗   │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ shared             │    ✗    │    ✗    │   ✗    │    ✗     │    ✗     │  ✗   │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ scanner            │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ database           │    ✓    │    ✓    │   ✓    │    ✗     │    ✗     │  ✗   │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ hasher             │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ duplicate-detector │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ cache-cleaner      │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ smart-move         │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ health-score       │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ core-engine        │    ✓    │    ✓    │   ✗    │    ✗     │    ✗     │  ✗   │
├────────────────────┼─────────┼─────────┼────────┼──────────┼───────────┼──────┤
│ app                │    ✓    │    ✓    │   ✓    │    ✓     │    ✓     │  ✗   │
└────────────────────┴─────────┴─────────┴────────┴──────────┴───────────┴──────┘

Legend: ✓ = depends on, ✗ = does NOT depend on
```

### 6.3 Frontend Architecture

```
[React Component]
      │
      ▼
[Custom Hook]  ←── useScan(), useDuplicates(), useHealth(), etc.
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

---

## 7. Database Summary

### 7.1 Engine & Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Engine | SQLite 3 | Embedded, zero-config, cross-platform |
| Journal Mode | WAL | Concurrent reads during writes |
| Page Size | 4096 bytes | Default, good for mixed workloads |
| Cache Size | 32MB-64MB | Balanced memory/performance for 10M rows |
| Busy Timeout | 5000ms | Prevent SQLITE_BUSY under load |
| Synchronous | NORMAL | Safe with WAL, faster than FULL |
| mmap_size | 256MB | Faster read queries for dashboards |
| Temp Store | MEMORY | Faster temp sorting for duplicate queries |

### 7.2 Tables

| Table | Purpose | Key Columns | Est. Rows |
|-------|---------|-------------|-----------|
| `volumes` | Drive/volume metadata | mount_point, total_capacity, free_space | <10 |
| `scan_sessions` | Per-scan metadata | volume_id, status, total_files, total_size | <10K |
| `scan_entries` | Individual file records | scan_session_id, file_path, file_size, modified_at | 1M-10M |
| `file_hashes` | Hash cache (size + partial + full) | file_size, partial_hash, full_hash | <1M |
| `duplicate_groups` | Duplicate groups | scan_session_id, file_size, hash_id, total_wasted_bytes | <100K |
| `duplicate_group_members` | Files in duplicate groups | group_id, scan_entry_id, file_path (denorm) | <500K |
| `cache_categories` | Cache type definitions | name, display_name, risk_level | <50 |
| `cache_entries` | Detected cache items | category_id, file_path, file_size, matched_rule | <100K |
| `operation_journal` | File operation audit log | operation_type, source_path, checksum_before, status | <50K |
| `directory_summaries` | Pre-computed dir aggregates | scan_session_id, dir_path, total_files, total_size | <500K |
| `health_snapshots` | Health score history | volume_id, overall_score, factor scores, snapshot_at | <10K |
| `scan_statistics` | Aggregated scan stats | scan_session_id, top_files_json, average_file_size | <10K |
| `scan_exclusions` | User-defined exclude patterns | pattern, is_regex, is_active | <100 |
| `app_settings` | Key-value configuration store | key, value, updated_at | <100 |

### 7.3 Key Indexes

```sql
-- Critical for scan_entries (largest table)
CREATE INDEX idx_scan_entries_session    ON scan_entries(scan_session_id);
CREATE INDEX idx_scan_entries_size       ON scan_entries(file_size) WHERE is_directory = 0;
CREATE INDEX idx_scan_entries_parent     ON scan_entries(scan_session_id, parent_path);
CREATE INDEX idx_scan_entries_extension  ON scan_entries(scan_session_id, extension);
CREATE INDEX idx_scan_entries_hash       ON scan_entries(hash_id) WHERE hash_id IS NOT NULL;

-- Critical for duplicate detection
CREATE INDEX idx_file_hashes_size        ON file_hashes(file_size);
CREATE INDEX idx_file_hashes_partial     ON file_hashes(file_size, partial_hash) WHERE partial_hash IS NOT NULL;

-- Critical for health score
CREATE INDEX idx_health_volume_time      ON health_snapshots(volume_id, snapshot_at DESC);
```

### 7.4 Migration Files

| File | Content | Status |
|------|---------|--------|
| `001_initial.sql` | All 14 tables with constraints, defaults, foreign keys | Created |
| `002_indexes.sql` | 20 performance indexes with partial indexes | Created |

---

## 8. Scanner Engine Summary

### 8.1 Purpose

Parallel filesystem traversal that produces structured `FileEntry` records for downstream analysis.

### 8.2 Pipeline (5 Stages)

```
User Config → [Walker] → [Filter] → [Mapper] → [BatchAccum] → [Persister] → SQLite
(jwalk)      (exclude)  (→FileEntry) (500 items)  (batch INSERT)
```

### 8.3 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Traversal library | jwalk | Parallel directory walk (one thread per core) |
| Channel capacity | 10,000 items | Natural backpressure via bounded mpsc |
| Batch size | 500 rows/tx | Optimal balance between throughput and memory |
| Checkpoint interval | 10K files or 30s | Enables resume with <1% re-scan penalty |
| Thread safety | AtomicBool + Notify + CancellationToken | Lock-free pause/resume/cancel |

### 8.4 Lifecycle States

```
IDLE → PENDING → SCANNING → COMPLETED
                ↓            ↗
              PAUSED → RESUME
                ↓
            CANCELLED
```

### 8.5 Performance

| Metric | Expected |
|--------|----------|
| Throughput (NVMe SSD) | ~35,000 files/sec |
| 1M files scan time | ~28 seconds |
| Peak memory (incl. SQLite cache) | ~72MB |
| Checkpoint overhead | <1% of total scan time |

### 8.6 Error Handling

- Permission denied: skip file, log, increment error counter, continue
- Symlink cycles: jwalk handles via inode tracking
- Drive disconnect: detect I/O error, pause scan, emit error event
- Partial errors: aggregated into final scan report

---

## 9. Duplicate Engine Summary

### 9.1 Purpose

Identify duplicate files using a progressive hashing strategy that minimizes I/O and CPU.

### 9.2 Pipeline (5 Tiers)

```
Tier 1: Size Grouping          (SQL GROUP BY file_size, HAVING count > 1)
   ↓
Tier 2: Size + Extension       (Optional: GROUP BY extension, reduces candidates ~30-40%)
   ↓
Tier 3: Partial Hash (8KB)     (Blake3 of first 8KB, eliminates ~95% candidates)
   ↓
Tier 4: Full Hash              (Full file Blake3, <0.1% of total files reach this tier)
   ↓
Tier 5: Verify & Store         (Insert groups + members, emit events)
```

### 9.3 Data Flow

```
scan_entries → [Tier 1: Size SQL] → candidate sizes → [Tier 2: Ext filter] (optional)
    → [Tier 3: Partial hash] → hash candidates → [Tier 4: Full hash]
    → [Tier 5: Verify] → duplicate_groups + duplicate_group_members
```

### 9.4 Hash Cache Strategy (3-Tier Lookup)

```
Lookup 1: Check by (file_size)                    → skip if unique size
Lookup 2: Check by (file_size, partial_hash)      → skip if unique partial hash
Lookup 3: Check by (file_size, partial_hash, full) → cache hit → reuse hash_id
```

### 9.5 Performance

| Metric | Expected (1M files) |
|--------|---------------------|
| Tier 1 (SQL) | <1s |
| Tier 3 (partial hash) | ~45s (150K candidates, 8KB each) |
| Tier 4 (full hash) | ~45s (5K files, average 10MB) |
| Total | ~90s |
| Full hash operations | <0.1% of total files |

### 9.6 Accuracy Guarantee

- **100% accuracy** — full Blake3 hash is cryptographic; zero false positives
- Partial hash false positive rate: <0.001% (different content with same 8KB Blake3 prefix)
- All partial-hash matches are verified with full hash before reporting as duplicates

---

## 10. Smart Move Summary

### 10.1 Purpose

Move files between locations with journaled safety, integrity verification, and one-click undo.

### 10.2 Golden Rule

```
"Write the journal entry BEFORE touching any file.
 Never delete source until destination is verified."

 Worst case: file exists at BOTH locations.
 NEVER:      file exists at NEITHER location.
```

### 10.3 Pipeline (6 Phases)

```
Phase 0: Journal Begin        (INSERT operation_journal with status='pending')
Phase 1: Pre-Validation        (10 checks: source exists, space, permissions, etc.)
Phase 2: Copy (cross-drive)   (Stream 64KB chunks + incremental Blake3)
Phase 3: Checksum Verify      (Compare source_hash vs dest_hash)
Phase 4: Meta Verify          (Verify size, timestamps, permissions)
Phase 5: Delete Source        (Move to trash, never permanent delete)
Phase 6: Commit Success       (journal.status = 'completed')
```

**Same-drive shortcut:** If same volume → atomic `rename()` (instant, skip Phase 2-4).

### 10.4 Crash Recovery Matrix

| Phase at Crash | Source State | Destination State | Recovery Action |
|---------------|-------------|------------------|-----------------|
| Phase 0 (pending) | Intact | N/A | Delete orphan journal entry |
| Phase 1 (validating) | Intact | N/A | Delete orphan journal entry |
| Phase 2 (copying) | Intact | Incomplete | Delete partial dest, retry |
| Phase 3 (verifying) | Intact | Complete (maybe corrupt) | Verify checksum; delete dest if fail, retry |
| Phase 4 (meta verify) | Intact | Complete | Verify metadata; retry if mismatch |
| Phase 5 (deleting) | Trashed/Deleted | Complete | Verify dest; mark done |
| Phase 6 (committing) | Trashed/Deleted | Complete | Update journal status |

### 10.5 Safety Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| Source NEVER deleted before destination verified | Phase 3 must pass before Phase 5 |
| All operations reversible | Journal entry enables LIFO undo |
| Data corruption detectable | Blake3 checksum before AND after |
| Cancel-safe | Partial destination deleted, source untouched |
| Crash-safe | Recovery matrix handles every state |

### 10.6 Undo Behavior

- Undo reverses the journal in LIFO order
- Cross-drive undo: copy verified file back, verify, trash destination copy
- Same-drive undo: atomic rename back to original path
- Undo chain: full history preserved for audit

---

## 11. Cache Cleaner Summary

### 11.1 Purpose

Detect and safely remove developer build artifacts and temporary files.

### 11.2 Pipeline (5 Phases)

```
Phase 1: Load Rules           (Parse YAML rule files from rules/ directory)
Phase 2: Scan & Match         (Glob patterns against scan_entries file paths)
Phase 3: Calculate            (Aggregate sizes per category)
Phase 4: Safety Check         (5 safety checks per item)
Phase 5: Execute Clean        (Trash-first, record in journal)
```

### 11.3 Built-in Rules (6 Ecosystems)

| Ecosystem | Rule Examples | Risk Level |
|-----------|--------------|------------|
| Rust | `**/target/`, `**/.rustup/toolchains/**/share/doc/` | Safe |
| Node.js | `**/node_modules` | Safe |
| Python | `**/__pycache__`, `**/.pyc`, `**/.eggs/`, `**/site-packages/*.dist-info/` | Safe |
| Java | `**/build/`, `**/.gradle/`, `**/target/` | Safe |
| .NET | `**/bin/`, `**/obj/`, `**/packages/` | Safe |
| General | `.cache/`, `.npm/`, `.cargo/registry/`, `**/.DS_Store` | Varies |

### 11.4 Safety Checks (Per Item)

```
☑ Path is within user home or selected scan directory
☑ Path is not a system directory (C:\Windows, /etc, /usr, etc.)
☑ Path is not user home root
☑ Item is not currently in use (best-effort on Windows)
☑ Item does not match whitelist patterns
```

### 11.5 False Positive Prevention

| Strategy | Description |
|----------|-------------|
| Context validation | For generic patterns (build/, target/), verify parent directory context |
| Whitelist override | User-defined paths that should never be deleted |
| Risk classification | Safe / Moderate / Risky labels per rule |
| Dry-run mandatory | Preview before any actual deletion |
| Trash-first | All deletions go to OS trash; full restore available |

---

## 12. Health Score Summary

### 12.1 Purpose

Aggregate storage telemetry into a single actionable score (0-100) with grade and recommendations.

### 12.2 Formula

```
overall_score = round(
    free_space_score    × 0.30 +
    fragmentation_score  × 0.15 +
    duplicate_score      × 0.15 +
    temp_cache_score     × 0.15 +
    large_file_score     × 0.10 +
    file_age_score       × 0.10 +
    disk_health_score    × 0.05
)
```

### 12.3 Factor Details

| Factor | Weight | Range | Source | Scoring Method |
|--------|--------|-------|--------|----------------|
| F1: Free Space | 30% | 0-100 | `volumes` | Threshold-based (30%+ → 100, <5% → 0-5) |
| F2: Fragmentation | 15% | 0-100 | `scan_entries` | Proxy via file density + depth variance + size variance |
| F3: Duplicates | 15% | 0-100 | `duplicate_groups` | Threshold-based (<1% wasted → 100, >30% → 20) |
| F4: Temp/Cache | 15% | 0-100 | `cache_entries` | Threshold-based (<1% cache → 100, >20% → 15) |
| F5: Large Files | 10% | 0-100 | `scan_entries` | Threshold-based (<10% large → 100, >50% → 25) |
| F6: File Age | 10% | 0-100 | `scan_statistics` | Threshold-based (<5% old → 100, >40% → 20) |
| F7: Disk Health | 5% | 0-100 | Placeholder | Currently always 100; future: S.M.A.R.T |

### 12.4 Grade System

| Grade | Score | Label | Color | Interpretation |
|-------|-------|-------|-------|---------------|
| A | 90-100 | Excellent | Green | Storage optimal. Maintain current habits. |
| B | 75-89 | Good | Light Green | Minor optimization opportunities exist. |
| C | 55-74 | Fair | Yellow | Several factors need attention. |
| D | 35-54 | Poor | Orange | Significant problems detected. |
| E | 0-34 | Critical | Red | Immediate action required. |

**Emergency overrides:**
- Free space <3% → max grade E regardless of calculated score
- Free space <5% AND duplicate ratio >20% → max grade D
- Cannot get A if any factor (except F7) is <50

### 12.5 Recommendation Engine

Ranks recommendations by `impact × (1/effort) × safety`. Urgent items get 2× priority. Top 5 shown.

| ID | Trigger | Recommendation | Category |
|----|---------|----------------|----------|
| R01 | `free_ratio < 0.10` | Free up space — drive critically full | Urgent |
| R02 | `free_ratio < 0.20` | Drive getting full | Warning |
| R03 | `dup_ratio > 0.05` | Remove duplicate files | Duplicate |
| R04 | `temp_ratio > 0.03` | Clear cache and temp files | Cache |
| R05 | `large_ratio > 0.30` | Review large files | Files |
| R06 | `age_ratio > 0.10` | Archive old files | Files |
| R07 | `dup_ratio > 0.15` | Run duplicate detector | Duplicate |
| R08 | `temp_ratio > 0.08` | Run cache cleaner | Cache |
| R09 | `file_density > 1000` | Consolidate small files | Maintenance |
| R10 | `frag_score < 40` | Defragment or optimize | Performance |

### 12.6 Trend & History

| Feature | Mechanism |
|---------|-----------|
| Trend intervals | 1d, 7d, 30d, 90d deltas |
| History storage | `health_snapshots` table |
| Retention | Daily: 90d, Weekly: 1yr, Monthly: forever |
| Anomaly detection | Sudden drops/spikes flagged as `health_anomalies` |

---

## 13. Performance Targets

### 13.1 Operations

| Operation | Target (1M files) | Target (10M files) |
|-----------|-------------------|--------------------|
| Full scan (NVMe SSD) | <30s | <5 min |
| Full scan (HDD) | <2 min | <20 min |
| Duplicate detection (post-scan) | <10s | <1 min |
| Cache detection | <200ms | <1s |
| Health score calc | <500ms | <2s |
| Large file query (Top 100) | <100ms | <500ms |
| Dashboard load | <200ms | <500ms |
| Smart move (1GB, cross-drive) | <5s | N/A |
| Undo operation | <100ms (journal-based) | N/A |

### 13.2 Memory

| Component | Budget | Notes |
|-----------|--------|-------|
| Scanner (peak) | <200MB | Includes 64MB SQLite cache + channel buffer |
| Duplicate detection | <100MB | Hash cache + result buffers |
| Health score calc | <10MB | Factor scores, trend data, recommendations |
| Idle (app running) | <50MB | SQLite cache + minimal state |
| Dashboard display | <20MB | Cached query results + chart data |

### 13.3 Storage

| Data | Growth Rate | 1 Year (10K scans) |
|------|-------------|-------------------|
| scan_entries | 200 bytes/file | 2GB (10M files) |
| scan_sessions | 100 bytes/scan | 1MB |
| duplicate_groups | 50 bytes/group | 5MB |
| health_snapshots | 200 bytes/snapshot | 2MB |
| operation_journal | 300 bytes/op | 15MB |
| Total DB (typical) | — | <2.5GB |

---

## 14. Security Requirements

### 14.1 Data Privacy

| Requirement | Implementation |
|-------------|----------------|
| All data local | Zero network calls. No telemetry, no cloud sync. |
| No user data collection | No analytics, no crash reporting to third parties. |
| Database location | User-configurable; default in app data directory. |
| Crash logs | Local only; user must opt-in to share. |

### 14.2 File Operations

| Requirement | Implementation |
|-------------|----------------|
| No permanent delete | All deletions use OS trash as first destination. |
| Journal before action | All file mutations recorded before execution. |
| Integrity verification | Blake3 checksum before and after every move/copy. |
| Path traversal protection | All paths validated, normalized, and bounded. |
| Dry-run required | Preview must be shown before any batch operation. |

### 14.3 System Protection

| Protection | Mechanism |
|------------|-----------|
| System file detection | Built-in exclude list prevents scanning system dirs deeper than configurable depth |
| Permission boundary | Never mutate files outside user scope |
| Symlink safety | Optional: don't follow symlinks (prevents escaping scan root) |
| Resource limits | Configurable max scan depth, file size limits, thread count |
| Input validation | All user-supplied paths sanitized via `FilePath` newtype with validation |

### 14.4 Application Security

| Aspect | Implementation |
|--------|----------------|
| Tauri permissions | Minimal capability manifest in `capabilities/default.json` |
| Shell access | No shell commands executed for file operations |
| Unsafe code | Minimize `unsafe` usage; audit all FFI boundaries |
| Dependency audit | `cargo audit` in CI/CD pipeline |
| Supply chain | `cargo deny` checks for banned/unsafe dependencies |

---

## 15. Coding Standards

### 15.1 Rust

| Standard | Rule |
|----------|------|
| Edition | 2021 |
| Naming | snake_case (functions, modules, variables); PascalCase (types, traits); SCREAMING_SNAKE (constants) |
| Error handling | `thiserror` for library errors; hierarchical error enums per crate |
| Concurrency | `Arc` for shared state; `parking_lot::Mutex` for internal mutability; `tokio` for async |
| Traits | Prefer trait objects (`Arc<dyn Trait>`) over generics for DI; use generics for performance-critical paths |
| Documentation | `///` doc comments on all public APIs; `//` for internal; `// TODO:` for intentional gaps |
| Testing | Unit tests in `#[cfg(test)] mod tests`; integration tests in `tests/`; property-based with `proptest` |
| Linting | `#![deny(warnings)]`; `#![deny(clippy::all)]`; `cargo clippy -- -D warnings` in CI |
| Formatting | `cargo fmt` via `rustfmt`; 2-space indent in TOML files |
| Modules | `mod.rs` convention for module directories |

### 15.2 TypeScript / React

| Standard | Rule |
|----------|------|
| Framework | React 18+ with hooks, no class components |
| State management | Zustand (lightweight, no boilerplate) |
| Styling | Tailwind CSS (utility-first, no separate CSS files) |
| Component architecture | Atomic Design (atoms → molecules → organisms → pages) |
| Typing | Strict TypeScript; `interface` for objects, `type` for unions |
| File naming | PascalCase for components, camelCase for hooks/stores/utilities |
| Naming convention | `useScan()` for hooks; `scanStore` for stores; `ScanPage` for components |
| Imports | Absolute imports via Vite alias (`@/components/...`) |
| Error handling | Error boundaries at page level; toast notifications for transient errors |

### 15.3 Git

| Practice | Standard |
|----------|----------|
| Workflow | GitHub Flow (feature branches → PR → main) |
| Commit message | Conventional Commits: `feat(scanner): add parallel walker` |
| Branch naming | `feat/*`, `fix/*`, `docs/*`, `refactor/*`, `bench/*` |
| PR size | <500 lines per PR; decompose large features |

### 15.4 CI/CD

| Pipeline | Trigger | Actions |
|----------|---------|---------|
| CI | Push + PR | Build, lint (clippy + ESLint), test (unit + integration), typecheck |
| Nightly | Daily 06:00 UTC | Full test suite + benchmarks + `cargo audit` |
| Release | Git tag | Build artifacts for all targets, create GitHub release |
| Security audit | Weekly | `cargo audit` vulnerability scan |
| Code coverage | PR | `cargo tarpaulin` + Codecov upload |

---

## 16. Future Roadmap

### 16.1 Version Map

```
v1.0 (Current Design)
  ├── Scanner + Duplicate Detection
  ├── Cache Cleaner (6 ecosystems)
  ├── Smart Move + Undo
  ├── Health Score (7 factors)
  └── Dashboard

v1.1 (3 months post-v1.0)
  ├── Real-time file watching (FS events)
  ├── S.M.A.R.T integration for Disk Health factor
  ├── Per-directory health scoring
  ├── Notification system (score drops, scan reminders)
  ├── Custom user-defined scoring rules
  └── Export/Import (JSON snapshot)

v2.0 (6 months post-v1.0)
  ├── Machine learning scoring (trained on cleaning patterns)
  ├── Predictive scoring ("estimated score in 30 days")
  ├── Anomaly detection (sudden space loss, unusual growth)
  ├── Personalized weights (ML-adjusted per user behavior)
  ├── Community benchmarks (anonymous comparisons)
  └── Plugin system for cache cleaner rules

v3.0 (12 months post-v1.0)
  ├── Cloud sync (score history across devices)
  ├── Team dashboard (multi-user health overview)
  ├── Automated remediation (scheduled clean at thresholds)
  ├── Third-party API (embed health score in other apps)
  └── Mobile companion (push alerts, quick actions)
```

### 16.2 Extensibility Points

| Extension Point | Mechanism | Used By |
|----------------|-----------|---------|
| New scoring factors | Implement `HealthFactor` trait, register in calculator | Health Score v1.1+ |
| New cache rules | Add `.yaml` file to `rules/` directory | Cache Cleaner (any version) |
| New file operations | Implement `FileOpPort` trait | Smart Move v2.0 |
| New storage backends | Implement `FileSystemRepo` trait | Network drives v1.2 |
| Custom scoring profiles | JSON config modifiable in Settings UI | Health Score v1.1 |
| Plugin system | Dynamic library loading via `dlopen`/`LoadLibrary` | v2.0 |

### 16.3 Known Gaps (v1.0)

| Gap | Impact | Planned For |
|-----|--------|-------------|
| Fragmentation is proxy-estimated, not measured | ±20% accuracy on F2 | v1.1 (S.M.A.R.T) |
| No real-time file watching | User must re-scan for updates | v1.1 |
| Cache rules limited to 6 ecosystems | Emerging ecosystems missed | v1.1 (community contributions) |
| No machine learning | Weights are static, not personalized | v2.0 |
| No cloud features | No multi-device sync | v3.0 |

---

## 17. Implementation Deviations

The following sections document permanent design decisions made during implementation that differ from the original specification (v1.0).

### 17.1 Crate Dependency: database → scanner

| Aspect | Spec v1.0 | Actual v1.1 |
|--------|-----------|-------------|
| Dependency | `petabyte-database` does NOT depend on `petabyte-scanner` | `petabyte-database` DOES depend on `petabyte-scanner` for `ScanPersistenceService` |

**Rationale:** The `ScanPersistenceService` requires knowledge of scan session types and entry structures defined in the scanner crate. This is an intentional architectural refinement — the database layer owns persistence for all domain entities, including scan-specific ones.

### 17.2 Frontend Component Structure

| Spec Component | Actual Implementation | Change |
|----------------|----------------------|--------|
| `file-list/` directory | No separate directory; LargeFileList incorporated into `dashboard/` | Large file analysis is displayed on Dashboard, not a separate page |
| `cleaner/`: `CacheCategoryCard, CleanPreview` | `CacheCategoryPanel, CacheCleanupPreview, CacheSummarySection, CacheSearchFilter, CacheDetailsTable, CacheActions` | Expanded to 6 specific components for richer UI |
| `move/`: `MoveDialog, MovePreview, UndoButton` | `DestinationSelector, MovePreviewSection, MoveSummarySection, ConflictResolution, MoveExecutionPanel, UndoCenterPreview` | Replaced dialog pattern with full-page multi-panel layout |
| `health/`: `HealthGauge, FactorBreakdown, TrendChart` | `HealthScoreHero, ScoreBreakdown, TrendVisualization, RecommendationPanel, PotentialSavings, HealthQuickActions` | Added recommendations, savings, and quick actions |
| `settings/`: `GeneralSettings, ScanSettings, CleanerSettings` | `GeneralSettings, ScannerSettings, DuplicateSettings, MoveSettings, CacheCleanerSettings, HealthScoreSettings, AppSettings + SettingsPrimitives` | Expanded to 7 tab sections + reusable primitives |
| `shared/`: `EmptyState, ErrorState, ConfirmDialog, SearchBar` | `ErrorBoundary, LoadingScreen` | Simplified; error/empty states handled inline per component |

### 17.3 Mock Data Strategy

| Spec v1.0 | Actual v1.1 |
|-----------|-------------|
| Frontend communicates directly with Tauri `invoke()` for all data | Frontend uses Zustand stores populated with mock data (`src/mocks/`); Tauri hooks exist but are not the primary data source |

**Rationale:** Mock data decouples UI development from backend availability, enabling parallel development and test-driven UI without a running Tauri process. The Tauri hooks (`useScan()`, `useDuplicates()`, `useHealth()`) serve as the bridge layer and are ready for substitution via a single store update. Mock files (`src/mocks/`) will be removed before release.

### 17.4 Component Barrel Exports

| Spec v1.0 | Actual v1.1 |
|-----------|-------------|
| All component directories have barrel `index.ts` re-exports | Only `types/`, `health/`, and `settings/` have barrels; all others import via direct file path |

**Rationale:** Barrel exports were added incrementally. Remaining directories can be migrated as needed. No functional impact.

### 17.5 Frontend Test Count

| Spec v1.0 (estimated) | Actual v1.1 |
|-----------------------|-------------|
| ~100 tests expected | 329 tests across 14 files |

**Rationale:** The mock-data strategy enabled extensive component-level testing (loading, empty, data, error, and interaction states per component), exceeding initial estimates.

### 17.6 Backend Test Distribution

| Crate | Spec v1.0 (estimated) | Actual v1.1 | Note |
|-------|----------------------:|------------:|------|
| petabyte-scanner | — | 24 | |
| petabyte-database | — | 32 | |
| petabyte-hasher | — | 29 | |
| petabyte-duplicate-detector | — | 49 | Most tested crate |
| petabyte-cache-cleaner | — | 17 | |
| petabyte-smart-move | 0 (AUDIT) | 20 | Tests exist in source |
| petabyte-health-score | — | 31 | |
| petabyte-core-engine | — | 11 | |
| **Total** | ~150 (estimated) | **213** | |

### 17.7 Dev Dependency: `shellexpand`, `walkdir`, `regex`, `notify`

These external crates were added to the cache-cleaner crate dependencies during implementation:
- `shellexpand` — for expanding `~` and env vars in cache rule paths
- `walkdir` — for cache directory traversal outside scan sessions
- `regex` — for regex-based cache rule matching
- `notify` — listed in workspace deps but not yet used; reserved for v1.1 file watching

These additions do not violate architectural rules.

---

## Appendix A: Environment & Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| Rust | stable (2024+) | Backend language |
| Node.js | 20+ | Frontend build |
| pnpm | 9+ | Package manager |
| Tauri CLI | 2.x | Desktop framework |
| cargo-deny | latest | Dependency audit |
| cargo-tarpaulin | latest | Code coverage |
| cargo-audit | latest | Security scanning |
| criterium | latest | Benchmarking |
| ESLint | 9+ | JS/TS linting |
| Prettier | 3+ | JS/TS formatting |
| taplo | latest | TOML formatting |

## Appendix B: Key External Dependencies

| Crate | Purpose | License |
|-------|---------|---------|
| tauri | Desktop app framework | MIT/Apache-2.0 |
| rusqlite (bundled) | SQLite with bundled libsqlite3 | MIT |
| jwalk | Parallel directory traversal | MIT/Apache-2.0 |
| blake3 | Cryptographic hashing | CC0-1.0/Apache-2.0 |
| serde / serde_json | Serialization | MIT/Apache-2.0 |
| serde_yaml | YAML parsing | MIT/Apache-2.0 |
| thiserror | Error derive macro | MIT/Apache-2.0 |
| chrono | Date/time handling | MIT/Apache-2.0 |
| uuid | UUID generation | MIT/Apache-2.0 |
| trash | OS trash/restore API | MIT |
| parking_lot | Fast mutexes | MIT/Apache-2.0 |
| rayon | Data parallelism | MIT/Apache-2.0 |

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| Clean Architecture | Layered architecture with dependency inversion; inner layers don't know about outer layers |
| WAL | Write-Ahead Logging — SQLite mode enabling concurrent reads during writes |
| jwalk | Parallel directory walker for Rust (multi-threaded `walkdir`) |
| Blake3 | Cryptographic hash function (faster than SHA-256, more secure than MD5) |
| Port | Interface/trait that defines a boundary between layers (input port = use case API, output port = repository API) |
| Use Case | Single unit of business logic; orchestrates calls to ports |
| Composition Root | Central location where all dependencies are wired together (`wiring.rs`) |
| Tiered Hashing | Progressive hashing strategy: size → partial 8KB → full Blake3; each tier eliminates more candidates |
| Journal-First | Pattern where a journal entry is written to database BEFORE any file mutation |
| LIFO Undo | Last-In-First-Out undo stack; the most recent operation is undone first |
| DTO | Data Transfer Object — serializable struct that crosses the Tauri IPC boundary |
| Atomic Design | UI component methodology: atoms → molecules → organisms → pages |
