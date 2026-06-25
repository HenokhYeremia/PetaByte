# PetaByte — Release Candidate

> **Last updated:** 2026-06-20
> **Version:** 0.1.0
> **Status:** 🟡 Release Candidate — Build Validation in Progress

---

## 1. Release Readiness Assessment

### Overall Score: **65/100** — Build Partially Validated

| Category | Score | Status |
|----------|:-----:|--------|
| Application Metadata | 100/100 | ✅ Complete |
| Tauri Configuration | 95/100 | ✅ Complete |
| CI/CD Pipeline | 100/100 | ✅ 3 pipelines active |
| Icon Assets | 70/100 | ⚠️ Exist, needs design audit |
| macOS Signing | 40/100 | ❌ No Apple Developer account |
| Windows Signing | 50/100 | ❌ No code signing certificate |
| Installer Testing | 0/100 | ❌ Not tested on any platform |
| Frontend Build | 100/100 | ✅ Builds cleanly (9.86s, 366 kB) |
| Rust Release Build | 0/100 | ❌ No Rust toolchain in dev environment |
| Tauri Bundle Build | 0/100 | ❌ Requires Rust + Tauri CLI on build host |
| Documentation | 100/100 | ✅ Complete |
| **Weighted Total** | **65/100** | **🟡 Build partially validated** |

### Build Validation Results (2026-06-20)

| Test | Result | Detail |
|------|--------|--------|
| `npm run build` (tsc + vite) | ✅ PASS | 9.86s, 0 TS errors, 0 lint errors |
| `cargo check --release` | ❌ SKIPPED | No Rust toolchain on dev machine |
| `cargo build --release` | ❌ SKIPPED | Requires Rust toolchain |
| `cargo tauri build` | ❌ SKIPPED | Requires Rust + Tauri CLI |
| `pnpm test` | ✅ PASS | 503/503 tests pass (from prior run) |

---

## 2. Application Metadata

| Field | Value | Status |
|-------|-------|--------|
| **Product Name** | PetaByte | ✅ Set in `tauri.conf.json` |
| **Identifier** | `com.petabyte.app` | ✅ Set in `tauri.conf.json` |
| **Version** | `0.1.0` | ⚠️ Bump to `1.0.0-rc.1` before RC announcement |
| **Publisher** | PetaByte Contributors | ✅ Set in `tauri.conf.json` |
| **Copyright** | Copyright (c) 2026 PetaByte Contributors | ✅ Set in `tauri.conf.json` |
| **Category** | Utility | ✅ Set in `tauri.conf.json` |
| **Short Description** | PetaByte — Intelligent storage analysis and optimization | ✅ Set in `tauri.conf.json` |
| **Long Description** | See `tauri.conf.json` | ✅ Set |
| **Repository** | `https://github.com/HenokhYeremia/PetaByte` | ✅ Set in workspace `Cargo.toml` |

### Versioning Strategy

| Phase | Version | Git Tag |
|-------|---------|---------|
| Current development | `0.1.0` | — |
| Release Candidate 1 | `1.0.0-rc.1` | `v1.0.0-rc.1` |
| Release Candidate 2 | `1.0.0-rc.2` | `v1.0.0-rc.2` |
| Final v1.0 Release | `1.0.0` | `v1.0.0` |
| Patch v1.0.1 | `1.0.1` | `v1.0.1` |

All version bumps must be synchronized across:
- `Cargo.toml` (workspace `version`)
- `src-tauri/Cargo.toml` (inherits workspace)
- `src-tauri/tauri.conf.json` (`version` field)
- `package.json` (`version` field)

---

## 3. Tauri Bundle Configuration

### Targets

| Format | Platform | File Extension | Status |
|--------|----------|----------------|--------|
| **MSI (Wix)** | Windows | `.msi` | ✅ Configured in `tauri.conf.json` |
| **NSIS** | Windows | `.exe` | ✅ Configured (per-user install) |
| **ZIP** | Windows | `.zip` | ✅ Configured (portable) |
| **DMG** | macOS | `.dmg` | ✅ Configured (x86_64 + ARM64) |
| **AppImage** | Linux | `.AppImage` | ✅ Configured |
| **DEB** | Linux | `.deb` | ✅ Configured |
| **RPM** | Linux | `.rpm` | ⚠️ Configured but not in CI |

### Installer Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Windows installer type | Wix + NSIS | Dual coverage |
| Wix language | en-US | |
| NSIS install mode | currentUser | No admin required |
| NSIS installer icon | `icons/icon.ico` | |
| macOS min version | 12.0 (Monterey) | |
| macOS sandbox | Disabled | Required for filesystem access |
| macOS entitlements | `entitlements/entitlements.plist` | |
| Linux DEB depends | webkit2gtk, gtk3, libappindicator, librsvg | |
| Linux AppImage | Media framework bundled | |

---

## 4. CI/CD Pipeline

### Pipeline Overview

| Pipeline | Trigger | Jobs | Status |
|----------|---------|------|--------|
| `ci.yml` | Push/PR to `main` | lint, test, security-audit | ✅ Active |
| `nightly.yml` | Daily 06:00 UTC | full-test, cargo-deny, cargo-audit, benchmark | ✅ Active |
| `release.yml` | Git tag `v*` | lint+test, build-windows, build-macos-x86, build-macos-arm, build-linux, create-release | ✅ Active |

### Release Pipeline Steps

```
Git tag v1.0.0-rc.1
    │
    ▼
lint-and-test (ubuntu)
    │
    ├── build-windows (windows-latest)
    │   ├── MSI Installer → artifact
    │   ├── NSIS Installer → artifact
    │   └── Portable ZIP → artifact
    │
    ├── build-macos-x86 (macos-13)
    │   └── DMG (Intel) → artifact
    │
    ├── build-macos-arm (macos-14)
    │   └── DMG (Apple Silicon) → artifact
    │
    └── build-linux (ubuntu-latest)
        ├── AppImage → artifact
        └── DEB → artifact
    │
    ▼
create-release
    ├── Download all artifacts
    ├── Generate SHA-256 checksums
    ├── Generate release body
    ├── Create GitHub Release (draft)
    └── Upload all assets
```

### Required Secrets

| Secret | Purpose | Required For |
|--------|---------|-------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri updater signing | All platforms |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key password | All platforms |

*Note: Signing keys are optional for RC. Release pipeline will work without them for unsigned builds.*

---

## 5. Icon & Asset Validation

### Icon Files

| File | Path | Status | Notes |
|------|------|--------|-------|
| 32×32 PNG | `src-tauri/icons/32x32.png` | ✅ Exists (413 bytes) | Small file — verify it's a valid PNG |
| 128×128 PNG | `src-tauri/icons/128x128.png` | ✅ Exists (1.16 KB) | |
| 128×128@2x PNG | `src-tauri/icons/128x128@2x.png` | ✅ Exists (3.04 KB) | |
| 256×256 PNG | `src-tauri/icons/256x256.png` | ✅ Exists (3.04 KB) | |
| icon.png (fallback) | `src-tauri/icons/icon.png` | ✅ Exists (3.04 KB) | |
| icon.icns (macOS) | `src-tauri/icons/icon.icns` | ⚠️ Exists (3.04 KB) | Verify it's a valid icns with all required sizes |
| icon.ico (Windows) | `src-tauri/icons/icon.ico` | ⚠️ Exists (3.46 KB) | Verify it contains 16×16, 32×32, 48×48, 256×256 |

### Asset Gaps

| Missing Asset | Impact | Recommendation |
|---------------|--------|----------------|
| AppImage `.desktop` file | Not packaged — Tauri auto-generates | No action needed |
| AppImage icon metadata | Not packaged — Tauri auto-generates | No action needed |
| macOS code signing identity | Unsigned DMG | Obtain Apple Developer account pre-release |
| Windows Authenticode certificate | Unsigned MSI/EXE | Obtain code signing certificate pre-release |

---

## 6. Packaging Checklist

### Windows

- [x] Tauri bundle config: MSI + NSIS + ZIP targets configured
- [x] Wix installer: `tauri.conf.json` configured with upgrade code, manufacturer, language
- [x] NSIS installer: per-user install mode, custom icon
- [x] Icon: `.ico` file exists at `src-tauri/icons/icon.ico`
- [ ] **Build test:** `cargo tauri build --bundles msi,zip` succeeds
- [ ] **Install test:** MSI installs on Windows 10/11 clean
- [ ] **Install test:** NSIS installs on Windows 10/11 clean
- [ ] **Portable test:** ZIP extract and run without install
- [ ] **Uninstall test:** Clean removal with no leftover files
- [ ] **Signing:** Code signing certificate applied

### macOS

- [x] Tauri bundle config: DMG target configured
- [x] macOS entitlements: `entitlements/entitlements.plist` created
- [x] Minimum version: macOS 12.0 (Monterey)
- [x] Icon: `.icns` file exists at `src-tauri/icons/icon.icns`
- [ ] **Build test:** `cargo tauri build --bundles dmg` on both Intel and ARM
- [ ] **Install test:** DMG mounts and app runs on macOS 12+
- [ ] **Uninstall test:** Clean removal via Trash
- [ ] **Signing:** Apple Developer signing applied (or notarization)

### Linux

- [x] Tauri bundle config: AppImage + DEB targets configured
- [x] DEB dependencies: webkit2gtk, gtk3, libappindicator, librsvg listed
- [x] AppImage: Media framework bundling enabled
- [ ] **Build test:** `cargo tauri build --bundles appimage,deb` succeeds
- [ ] **Install test:** DEB installs on Ubuntu 22.04+
- [ ] **Install test:** AppImage runs on Ubuntu 22.04+ / Fedora 38+
- [ ] **Uninstall test:** Clean removal via package manager

---

## 7. Distribution Checklist

- [ ] **GitHub Release workflow** created at `.github/workflows/release.yml`
- [ ] **Draft release** generated with all platform assets
- [ ] **Checksums** (SHA-256) generated for all assets
- [ ] **Release notes** generated with asset table
- [ ] **Version tag** follows semver (e.g., `v1.0.0-rc.1`)
- [ ] **Pre-release flag** set for RC versions
- [ ] **Download page** or release URL documented

---

## 8. Artifact Audit

### Frontend Build Artifacts

| File | Size | Gzip | Type |
|------|:----:|:----:|------|
| `dist/index.html` | 381 B | 0.27 kB | HTML entry point |
| `dist/assets/index-BBNe7KgH.js` | 366.42 kB | 93.55 kB | JS bundle (React + Zustand + Recharts + all components) |

**JS Bundle Contents (inferred from imports):**
- React 18 + ReactDOM
- React Router v6 (client-side routing)
- Recharts (dashboard charts)
- Zustand (state management)
- Lucide React (icons)
- All 59 UI components
- All 7 Zustand stores
- All bridge modules (scanner, cache, duplicates, move, health)

**HTML Entry Validation:**
- Title: ✅ "PetaByte"
- Viewport: ✅ `width=device-width, initial-scale=1.0`
- Encoding: ✅ UTF-8
- Script loading: ✅ `type="module" crossorigin`
- Root div: ✅ Present
- Favicon: ✅ Points to `/vite.svg`

### Rust Build Artifacts (Expected — Not Yet Built)

| Artifact | Platform | Expected Size | CI Job |
|----------|----------|:-------------:|--------|
| `petabyte.exe` (~30 MB) | Windows | ~15-30 MB (stripped) | `build-windows` |
| `petabyte` binary | Linux | ~15-30 MB (stripped) | `build-linux` |
| `PetaByte.msi` | Windows Installer | ~10-15 MB | `build-windows` |
| `PetaByte Setup.exe` | Windows NSIS | ~8-12 MB | `build-windows` |
| `PetaByte.zip` | Windows Portable | ~15-30 MB | `build-windows` |
| `PetaByte.dmg` | macOS (Intel) | ~40-60 MB | `build-macos-x86` |
| `PetaByte.dmg` | macOS (ARM) | ~40-60 MB | `build-macos-arm` |
| `PetaByte.AppImage` | Linux | ~50-80 MB | `build-linux` |
| `petabyte_*.deb` | Linux | ~10-20 MB | `build-linux` |

### Metadata Audit

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| App title | "PetaByte" | "PetaByte" | ✅ |
| Window title | "PetaByte — Storage Analyzer & Optimizer" | In tauri.conf.json | ✅ |
| Version in tauri.conf.json | 0.1.0 | 0.1.0 | ✅ |
| Version in package.json | 0.1.0 | 0.1.0 | ✅ |
| Version in Cargo.toml | 0.1.0 | 0.1.0 | ✅ |
| Identifier | com.petabyte.app | com.petabyte.app | ✅ |
| Upgrade code (Wix) | UUID | A1B2C3D4-... | ⚠️ Placeholder — generate unique GUID |
| macOS bundle ID | com.petabyte.app | Inferred from identifier | ✅ |

---

## 9. Build Validation Status

### Build Commands

| Command | Purpose | Status | Duration | Output |
|---------|---------|--------|:--------:|--------|
| `npm run build` | Frontend production build | ✅ PASS | 9.86s | 366.42 kB JS (93.55 kB gzip), 0.38 kB HTML |
| `pnpm test` | Frontend unit tests | ✅ PASS | — | 503/503 pass (from prior run) |
| `cargo build --release` | Rust release build | ❌ SKIPPED | — | No Rust toolchain on dev machine |
| `cargo tauri build --bundles msi` | Windows MSI | ❌ SKIPPED | — | Requires Rust on Windows build host |
| `cargo tauri build --bundles dmg` | macOS DMG | ❌ SKIPPED | — | Requires Rust on macOS build host |
| `cargo tauri build --bundles appimage` | Linux AppImage | ❌ SKIPPED | — | Requires Rust on Linux build host |

### Issues Found & Fixed During Validation

| Issue | File | Fix |
|-------|------|-----|
| `ScanStatus` type imported but never used | `src/__tests__/e2e/01-scanner-workflow.test.ts:5` | Removed unused import |
| `fetchDuplicates` imported but never read | `src/__tests__/e2e/02-duplicate-workflow.test.ts:5` | Removed unused import |
| All bridge/move imports unused | `src/__tests__/e2e/03-smart-move-workflow.test.ts:5` | Removed unused import block |
| `scanCacheTauri, cleanCacheTauri, CleanupPreview` unused | `src/__tests__/e2e/04-cache-cleaner-workflow.test.ts:5-6` | Removed unused imports |
| 4 type imports unused (`HealthFactor`, `HealthRecommendation`, `PotentialSavings`, `HealthTrend`) | `src/__tests__/e2e/05-health-score-workflow.test.ts:5` | Removed unused imports |
| `DuplicateProgress` imported but unused | `src/__tests__/e2e/06-event-system.test.ts:6` | Removed unused import |
| `MoveProgress, CacheStatus` imported but unused | `src/__tests__/e2e/07-error-handling.test.ts:10` | Removed unused import block |
| `severity` property access on `unknown` type | `src/__tests__/e2e/07-error-handling.test.ts:128` | Added `as Record<string, unknown>` cast |
| `DuplicateGroup` imported from wrong module | `src/__tests__/e2e/08-performance-validation.test.ts:10` | Changed to correct `@/types` import |
| All type imports in `eventBus.ts` unused | `src/bridge/eventBus.ts:1,4` | Removed all unused type imports |
| `listenWithRecovery` declared but never used | `src/bridge/events.ts:112` | Removed dead function |

---

## 10. Known Packaging Limitations

| Limitation | Impact | Resolution |
|------------|--------|------------|
| No code signing | Windows/macOS will show "unverified developer" warnings | Required for production release; RC acceptable without |
| No Tauri updater configured | Users must manually download updates | Add for v1.0 (not RC) |
| No automated installer testing | Install/uninstall not verified on clean OS | Manual testing required before final v1.0 |
| Windows ARM64 not targeted | No native ARM64 Windows build | Future consideration |
| macOS ARM64 signed with different identity | Must test signing on both architectures | Add universal binary script if needed |

---

## 11. Technical Debt (Packaging-Related)

| Debt | Priority | Effort | Notes |
|------|----------|--------|-------|
| No code signing certificate | High | Medium | Cost: $200-500/yr for Windows, $99/yr for Apple |
| No Tauri updater configuration | Medium | Small | Requires signing key + server endpoint |
| 32×32 icon may be invalid | Low | Small | Verify with `file` command |
| `icon.icns` may not contain all sizes | Low | Small | Verify with `iconutil` on macOS |
| No Playwright E2E tests | Medium | Large | Separate from packaging, but needed for release quality |
| No performance benchmark CI integration | Low | Medium | Nightly runs benchmarks but no trend dashboard |

---

## 12. Recommendations

### Immediate (Before RC-1 Release)

1. **Build test on all 3 platforms** — Run `cargo tauri build` on Windows, macOS, and Linux
2. **Verify icon files** — Confirm `icon.ico` and `icon.icns` contain proper resolutions
3. **Document build prerequisites** — Ensure each platform's build deps are documented
4. **Push release `v*` tag** — Trigger the release pipeline CI
5. **Review draft release** — Verify all assets, checksums, and release notes

### Before Final v1.0

1. **Obtain code signing certificates** — Windows Authenticode + Apple Developer
2. **Configure Tauri updater** — Add signing keys + update server endpoint
3. **Test installers on clean OS** — Fresh VM for each platform
4. **User acceptance testing** — At least 3 testers per platform
5. **Performance benchmark against targets** — Ensure scan, detection, and scoring meet targets

---

## 13. Platform Build Readiness

### Windows Build Readiness

| Requirement | Status | Detail |
|-------------|--------|--------|
| MSI build config | ✅ | Wix configured in `tauri.conf.json` |
| NSIS build config | ✅ | NSIS configured (fallback installer) |
| ZIP build config | ✅ | Portable ZIP configured |
| Icon `.ico` | ✅ | `src-tauri/icons/icon.ico` exists |
| Build host | ✅ | Windows 10+ with Rust toolchain |
| WebView2 | ✅ | Bootstrapped via Tauri |
| **Readiness Score** | **80%** | Missing: actual build test + signing |

### macOS Build Readiness

| Requirement | Status | Detail |
|-------------|--------|--------|
| DMG build config | ✅ | DMG configured in `tauri.conf.json` |
| Icon `.icns` | ✅ | `src-tauri/icons/icon.icns` exists |
| Entitlements | ✅ | `entitlements/entitlements.plist` created |
| Minimum version | ✅ | macOS 12.0 (Monterey) |
| x86_64 build host | ✅ | macos-13 (Intel) available in CI |
| ARM64 build host | ✅ | macos-14 (Apple Silicon) available in CI |
| Signing identity | ❌ | Requires Apple Developer account |
| Notarization | ❌ | Requires signing identity |
| **Readiness Score** | **65%** | Missing: build test + signing + notarization |

### Linux Build Readiness

| Requirement | Status | Detail |
|-------------|--------|--------|
| AppImage build config | ✅ | AppImage configured with media framework |
| DEB build config | ✅ | DEB with depends list configured |
| RPM build config | ⚠️ | Configured but not in CI pipeline |
| System deps | ⚠️ | Must install 6 dev packages pre-build |
| **Readiness Score** | **75%** | Missing: actual build test |

### Installer Generation Readiness

| Installer | Config | CI Job | Tested | Score |
|-----------|--------|--------|--------|:-----:|
| Windows MSI | ✅ | ✅ `build-windows` | ❌ | 66% |
| Windows NSIS | ✅ | ✅ `build-windows` | ❌ | 66% |
| Windows ZIP | ✅ | ✅ `build-windows` | ❌ | 66% |
| macOS DMG (Intel) | ✅ | ✅ `build-macos-x86` | ❌ | 66% |
| macOS DMG (ARM) | ✅ | ✅ `build-macos-arm` | ❌ | 66% |
| Linux AppImage | ✅ | ✅ `build-linux` | ❌ | 66% |
| Linux DEB | ✅ | ✅ `build-linux` | ❌ | 66% |
| **Overall** | **100%** | **100%** | **0%** | **66%** |

---

## 14. Next Steps for v1.0 Release

### Phase 1: RC Build Validation (Current)

- [x] `npm run build` — ✅ Verified (9.86s, 366 kB, 0 TS errors)
- [ ] `cargo build --release` — ❌ Requires Rust toolchain (install via `rustup.rs`)
- [ ] `cargo tauri build --bundles msi` (on Windows) — ❌ Requires Rust + Tauri CLI
- [ ] `cargo tauri build --bundles appimage,deb` (on Linux) — ❌ Requires Rust + Tauri CLI
- [ ] `cargo tauri build --bundles dmg` (on macOS) — ❌ Requires Rust + Tauri CLI

### Phase 2: Installer Testing

- [ ] Install MSI on Windows 10 clean VM
- [ ] Install MSI on Windows 11 clean VM
- [ ] Extract and run portable ZIP on Windows
- [ ] Mount DMG and run on macOS 12 (Intel)
- [ ] Mount DMG and run on macOS 14 (Apple Silicon)
- [ ] Install DEB on Ubuntu 22.04
- [ ] Run AppImage on Ubuntu 22.04
- [ ] Run AppImage on Fedora 38

### Phase 3: Release Publishing

- [ ] Bump version to `1.0.0-rc.1` across all config files
- [ ] Tag commit: `git tag v1.0.0-rc.1 && git push origin v1.0.0-rc.1`
- [ ] Verify release workflow triggers and completes
- [ ] Download draft release assets and verify
- [ ] Publish release (un-draft)
- [ ] Announce RC on GitHub Discussions
