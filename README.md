# PetaByte

**Intelligent storage analysis and optimization for desktop.**

PetaByte is a cross-platform desktop application (Windows, macOS, Linux) that gives users deep visibility and intelligent control over their storage. It transforms raw filesystem data into actionable insights — finding duplicates, cleaning developer caches, moving files safely, and scoring storage health — all with a privacy-first, local-only architecture.

## Features

- **Filesystem Scanner** — Parallel directory traversal (jwalk), 35K+ files/sec, pause/resume/cancel, incremental resume
- **Duplicate Detection** — 5-tier progressive hashing pipeline (size → partial 8KB Blake3 → full Blake3), 100% accuracy
- **Cache Cleaner** — Declarative YAML rule engine, 6 built-in ecosystems (Rust, Node.js, Python, Java, .NET, General), trash-first removal
- **Smart Move** — 6-phase journal-first pipeline, cross-drive integrity verification, one-click undo, crash-proof
- **Storage Health Score** — 7-factor weighted formula (0–100), letter grade A–E, trend analysis, actionable recommendations
- **Dashboard** — Health gauge, factor breakdown, trend charts, storage overview, quick actions

## Architecture

```
petabyte/
├── crates/                         # 11 Rust workspace crates (Clean Architecture)
│   ├── petabyte-shared-models/     # Domain entities, value objects, port traits
│   ├── petabyte-shared/            # Errors, constants, platform utilities
│   ├── petabyte-database/          # SQLite connection, migrations, repositories
│   ├── petabyte-scanner/           # jwalk parallel traversal + filter
│   ├── petabyte-hasher/            # Tiered Blake3 hashing + cache
│   ├── petabyte-duplicate-detector/# 5-tier duplicate detection pipeline
│   ├── petabyte-cache-cleaner/     # YAML rule engine, safe removal
│   ├── petabyte-smart-move/        # 6-phase journaled file mover
│   ├── petabyte-health-score/      # 7-factor weighted scoring engine
│   ├── petabyte-core-engine/       # Use cases (depends only on ports)
│   └── petabyte-app/               # Composition root, Tauri commands
├── src/                            # React/TypeScript frontend
├── src-tauri/                      # Tauri v2 desktop shell
└── docs/                           # Design documentation
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Tauri v2 (Rust) |
| Backend | Rust — 11 workspace crates, Clean Architecture |
| Frontend | React 18, TypeScript, Tailwind CSS, Zustand |
| Database | SQLite (WAL mode, rusqlite bundled) |
| Hashing | Blake3 (tiered: partial 8KB + full) |
| Parallelism | jwalk (filesystem), rayon (CPU), tokio (async) |

## Getting Started

### Prerequisites

- Rust stable (2024+)
- Node.js 20+
- pnpm 9+

### Setup

```bash
# Install Tauri CLI
cargo install tauri-cli --version "^2"

# Install frontend dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

### Build

```bash
pnpm tauri build
```

## Performance Targets

| Operation | 1M Files | 10M Files |
|-----------|----------|-----------|
| Full scan (NVMe SSD) | <30s | <5 min |
| Duplicate detection | <10s | <1 min |
| Cache detection | <200ms | <1s |
| Health score calc | <500ms | <2s |
| Memory (scan peak) | <200MB | <500MB |

## Design Principles

1. **Privacy-first, local-only** — All processing on-device. No cloud, no telemetry.
2. **Safety over speed** — Journaled operations, trash-first, dry-run mandatory.
3. **Actionable insights** — Not just visualization; tell the user what to do and why.
4. **Performant at scale** — 1M+ files in under 30 seconds. Parallel from day one.
5. **Cross-platform parity** — Feature-complete on Windows, macOS, and Linux.

## License

MIT OR Apache-2.0
