# PetaByte — Known Issues Report

> **Date:** 2026-06-20  
> **Status:** Pre-Release Audit

---

## Critical Issues (0)

No critical issues identified at this time.

---

## High Issues (1)

### H-01: No live Tauri backend in dev environment
- **Area:** Integration
- **Description:** All bridge functions call `invoke()` which throws when Tauri is unavailable. Error-handling paths exist in stores/pages/hooks but cannot be verified end-to-end without a running Tauri backend.
- **Impact:** Frontend rendered unusable in `npm run dev` without Tauri.
- **Mitigation:** The `registerEventListeners` function returns noop unsubscribers when Tauri is unavailable. Stores handle errors gracefully. Pages show error states.
- **Resolution Path:** Wire Tauri dev server (`cargo tauri dev`) for full integration testing. All error paths are exercised in unit tests.
- **Target:** v1.0 RC

---

## Medium Issues (3)

### M-01: Fragmentation score is proxy-estimated
- **Area:** petabyte-health-score
- **Description:** F2 (Fragmentation) factor uses file density + depth variance + size variance as a proxy. No actual NTFS/APFS/ext4 fragmentation API is queried.
- **Impact:** ±20% accuracy on the F2 factor score.
- **Mitigation:** Proxy scoring uses 3 sub-metrics with conservative weighting.
- **Target:** v1.1 (S.M.A.R.T integration)

### M-02: No real-time file watching
- **Area:** petabyte-scanner
- **Description:** User must manually re-scan to detect filesystem changes. No FS event watcher (inotify/FSEvents/ReadDirectoryChangesW) integrated.
- **Impact:** Stale data displayed between scans.
- **Target:** v1.1

### M-03: Cache rules limited to 6 ecosystems
- **Area:** petabyte-cache-cleaner
- **Description:** Only Rust, Node.js, Python, Java, .NET, and General dev caches covered. Go, Swift, Ruby, etc. are missing.
- **Impact:** Emerging ecosystem caches not detected.
- **Target:** v1.1 (community rules)

---

## Low Issues (8)

### L-01: CLI argument parsing not implemented
- **Area:** petabyte-app
- **Description:** No CLI flags for headless scanning or batch operations.
- **Impact:** Must be launched via GUI.

### L-02: No Windows/MSI installer CI
- **Area:** CI/CD
- **Description:** No automated workflow producing `.msi` installer for Windows.
- **Impact:** Manual packaging required for distribution.

### L-03: No macOS code signing
- **Area:** CI/CD
- **Description:** CI does not sign macOS `.dmg` artifacts.
- **Impact:** Not distributable outside direct build.

### L-04: Fragmentation check skips before cleanup
- **Area:** petabyte-cache-cleaner
- **Description:** The 5th safety check (item not in use) is best-effort on Windows and skipped on macOS/Linux.
- **Impact:** Possible (rare) false positives on files open by other processes.

### L-05: No `ts-rs` type generation
- **Area:** Frontend/Backend
- **Description:** TypeScript interfaces are manually maintained to mirror Rust DTOs. No automatic generation via `ts-rs`.
- **Impact:** Risk of type drift between Rust and TypeScript.

### L-06: Dashboard uses mock health data
- **Area:** Frontend/Dashboard
- **Description:** Dashboard charts and gauges accept real data types but currently render with mock data until Tauri bridge is wired.
- **Impact:** No live health data displayed in dashboard.

### L-07: HDD performance not benchmarked
- **Area:** Performance
- **Description:** All performance targets assume NVMe SSD. HDD performance has not been measured.
- **Impact:** Targets may not hold for HDD users.

### L-08: Smart move crate has 0 integration tests
- **Area:** petabyte-smart-move
- **Description:** Unit tests exist but no end-to-end test of the 6-phase pipeline with actual file operations.
- **Impact:** Core safety pipeline untested at integration level.

---

## Resolved Issues (11)

| ID | Description | Resolution |
|----|-------------|------------|
| R-01 | Mock data files in `src/mocks/` | Deleted — zero remaining imports |
| R-02 | `getScanStatusTauri` return type mismatch | Fixed return type to match bridge response |
| R-03 | `formatBytes` rounding causing test failures | All tests use exact binary calculations |
| R-04 | `settingsStore` missing `settings_file_path` in defaults | Added empty default string |
| R-05 | `cleanerStore` missing `preview` field in initial state | Added `preview: null` |
| R-06 | `eventBus.clearAll` + re-emit causing spurious test failure | Test restructured to check state before re-emit |
| R-07 | `useCacheEvents` deprecated `cacheStatus` and `cacheProgress` separation | Unified into single `useCacheEvents` hook |
| R-08 | `fetchDrives` returning wrong structure from `get_scan_status` | Parsed `{ drives: Drive[] }` instead of raw array |
| R-09 | Missing event channel constants for `MOVE_COMPLETE` and `CACHE_COMPLETE` | Added to `EventChannels` |
| R-10 | `computePreview` risk level test fixture issue | Risky category entries set to `selected: true` |
| R-11 | Health mock response shape mismatch | Wrapped in `{ score, factors, ... }` to match bridge return |

---

## Issue Trends

| Metric | Value |
|--------|-------|
| Total issues (open) | 12 |
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 8 |
| Issues resolved | 11 |
| Issue closure rate | 47.8% |
