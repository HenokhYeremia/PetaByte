# PetaByte — Technical Debt Report

> **Date:** 2026-06-20  
> **Author:** Automated Audit  
> **Scope:** Frontend (TypeScript/React) + Backend (Rust 11 crates)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total debt items | 16 |
| High priority | 4 |
| Medium priority | 6 |
| Low priority | 6 |
| Estimated payoff effort | ~4-6 weeks |

---

## High Priority

### H-DEBT-01: No `ts-rs` integration (Manual type sync)
- **Area:** Cross-cutting (Rust ↔ TypeScript)
- **Description:** All 84+ TypeScript interfaces in `src/types/index.ts` are manually mirrored from Rust DTOs. No `#[derive(TS)]` / `ts-rs` generation pipeline exists.
- **Risk:** Type drift between backend and frontend — a field rename in Rust silently breaks frontend at runtime.
- **Effort:** Medium (2-3 days to add `ts-rs` to all models, integrate with build script, fix type differences)
- **Impact:** Manual sync burden increases with every schema change.

### H-DEBT-02: ~181 Clippy warnings
- **Area:** Backend (all Rust crates)
- **Description:** `cargo clippy -- -D warnings` reports ~181 warnings. Categories: missing docs (~80%), missing `#[must_use]` (~10%), cast precision (~10%).
- **Risk:** Legitimate bugs may be hidden in warning noise. CI currently allows warnings.
- **Effort:** Large (1-2 weeks for comprehensive fix across 11 crates)
- **Impact:** Low code risk (none are "deny" level), but blocks strict CI enforcement.

### H-DEBT-03: No end-to-end Tauri integration test
- **Area:** Integration
- **Description:** All 13 Tauri commands are registered but no automated test verifies the full `invoke() → Rust handler → SQLite → response → frontend render` pipeline.
- **Risk:** Bridge contracts may have subtle mismatches caught only at runtime.
- **Effort:** Medium (3-5 days to set up Tauri test harness, write integration tests for each command)
- **Impact:** Medium — unit tests cover individual layers but not the full stack.

### H-DEBT-04: Mock data isolation prevents real UI testing
- **Area:** Frontend
- **Description:** All 7 pages render with mock data. Stores call `invoke()` but no Tauri backend is present in dev mode.
- **Risk:** UI/UX cannot be validated with real data until Tauri backend is wired.
- **Effort:** Medium (wiring hooks to stores, testing with `cargo tauri dev`)
- **Impact:** Blocks user acceptance testing.

---

## Medium Priority

### M-DEBT-01: No barrel exports for shared UI directories
- **Area:** Frontend (imports)
- **Description:** Components from `ui/`, `layout/`, `shared/`, `dashboard/`, `scanner/`, `duplicates/`, `move/`, `cleaner/` must be imported via deep paths instead of a barrel `index.ts`.
- **Effort:** Low (0.5 day to create `index.ts` files)
- **Impact:** Import statements are verbose and fragile to refactoring.

### M-DEBT-02: No accessibility audit
- **Area:** Frontend (a11y)
- **Description:** Keyboard navigation, ARIA labels, focus management, screen reader support not implemented.
- **Effort:** Medium (1 week for comprehensive audit + fixes)
- **Impact:** Excludes users with disabilities.

### M-DEBT-03: Settings store uses hardcoded defaults
- **Area:** Frontend (settingsStore)
- **Description:** `reset()` function duplicates the default values defined in the store initial state. Any change to defaults must be done in two places.
- **Effort:** Low (0.5 day to refactor defaults to shared constant)
- **Impact:** Maintenance burden increases with each new setting group.

### M-DEBT-04: No storybook / visual regression testing
- **Area:** Frontend (QA)
- **Description:** No component playground or visual snapshot testing. CSS changes risk unintended visual side effects.
- **Effort:** Medium (1 week to set up Storybook + Chromatic)
- **Impact:** Visual regressions may go undetected.

### M-DEBT-05: No i18n/l10n
- **Area:** Frontend (internationalization)
- **Description:** All user-facing strings are hardcoded in English. No translation infrastructure.
- **Effort:** Medium (1 week to integrate i18next, extract strings, create locale files)
- **Impact:** Non-English users cannot use the application.

### M-DEBT-06: Smart move crate has 0 integration tests
- **Area:** Backend (petabyte-smart-move)
- **Description:** The 6-phase journal-first pipeline is complex but has no integration-level test that exercises file I/O, trash operations, and crash recovery.
- **Effort:** Medium (3-5 days for comprehensive integration test suite)
- **Impact:** Core data-safety guarantee not validated at integration level.

---

## Low Priority

### L-DEBT-01: No Playwright E2E tests
- **Area:** QA
- **Description:** All tests are unit/integration tests. No browser-level E2E test verifies full user flow (click → render → state update).
- **Effort:** Medium (1 week for Playwright setup + key user flows)
- **Impact:** User-facing bugs not caught before deployment.

### L-DEBT-02: HDD performance not benchmarked
- **Area:** Backend (performance)
- **Description:** All benchmarks and performance targets assume NVMe SSD. HDD throughput has not been characterized.
- **Effort:** Low (0.5 day to run benchmarks on HDD)
- **Impact:** Users on HDD may have degraded experience.

### L-DEBT-03: No `petabyte-app` unit tests
- **Area:** Backend (petabyte-app)
- **Description:** The composition root and Tauri command handlers have no unit tests.
- **Effort:** Medium (2-3 days for test setup + command handler tests)
- **Impact:** Command wiring errors caught only at runtime.

### L-DEBT-04: No `src-tauri` tests
- **Area:** Shell (src-tauri)
- **Description:** The Tauri bootstrap (main.rs) has no tests.
- **Effort:** Low (automated via Tauri integration test harness)
- **Impact:** Bootstrap configuration errors caught only at runtime.

### L-DEBT-05: No benchmark regression tracking
- **Area:** Performance
- **Description:** Criterion benchmarks exist but no CI integration tracks performance changes over time.
- **Effort:** Low (1 day to set up benchmark comparison in CI)
- **Impact:** Performance regressions may go unnoticed.

### L-DEBT-06: No contribution guidelines / CONTRIBUTING.md
- **Area:** Documentation
- **Description:** No document explaining how to set up dev environment, run tests, submit PRs.
- **Effort:** Low (0.5 day)
- **Impact:** Slows onboarding for new contributors.

---

## Debt Payoff Plan

### Phase 1 (Pre-v1.0)
| Priority | Item | Assigned | Effort |
|----------|------|----------|--------|
| H | H-DEBT-03: Tauri integration test | — | 3-5 days |
| H | H-DEBT-04: Wire Tauri bridge | — | 2-3 days |
| M | M-DEBT-06: Smart move integration tests | — | 3-5 days |

### Phase 2 (v1.1)
| Priority | Item | Assigned | Effort |
|----------|------|----------|--------|
| H | H-DEBT-01: `ts-rs` integration | — | 2-3 days |
| H | H-DEBT-02: Fix clippy warnings | — | 1-2 weeks |
| M | M-DEBT-01: Barrel exports | — | 0.5 day |
| M | M-DEBT-03: Settings defaults refactor | — | 0.5 day |
| L | L-DEBT-03: `petabyte-app` tests | — | 2-3 days |

### Phase 3 (v1.2+)
| Priority | Item | Assigned | Effort |
|----------|------|----------|--------|
| M | M-DEBT-02: Accessibility audit | — | 1 week |
| M | M-DEBT-04: Storybook | — | 1 week |
| M | M-DEBT-05: i18n/l10n | — | 1 week |
| L | L-DEBT-01: Playwright E2E | — | 1 week |
| L | Remaining low items | — | ~2 days |
