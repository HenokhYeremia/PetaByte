# PetaByte — Security Review & Threat Model

> **Reviewer:** Principal Security Engineer
> **Date:** 2026-06-20
> **Scope:** Full system design audit across all 6 engines + architecture + database
> **Source of Truth:** `/docs/MASTER_SPECIFICATION.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Threat Model](#2-threat-model)
3. [Risk Register](#3-risk-register)
4. [Architecture Review](#4-architecture-review)
5. [Database Security Review](#5-database-security-review)
6. [Scanner Engine Security Review](#6-scanner-engine-security-review)
7. [Duplicate Engine Security Review](#7-duplicate-engine-security-review)
8. [Smart Move Engine Security Review](#8-smart-move-engine-security-review)
9. [Cache Cleaner Security Review](#9-cache-cleaner-security-review)
10. [Health Score Security Review](#10-health-score-security-review)
11. [Risk Matrix](#11-risk-matrix)
12. [Security Checklist](#12-security-checklist)
13. [Production Readiness Checklist](#13-production-readiness-checklist)
14. [Key Findings Summary](#14-key-findings-summary)

---

## 1. Executive Summary

### 1.1 Overall Assessment

PetaByte's design demonstrates **strong security awareness** — the journal-first approach, trash-first deletion, checksum verification, and clean architecture principles provide solid foundations. However, several **critical gaps** exist that must be addressed before production release.

### 1.2 Critical Issues (Must Fix)

| # | Issue | Risk | Engine | Priority |
|---|-------|------|--------|----------|
| C1 | **No path canonicalization** before comparison | Path traversal, TOCTOU | ALL | **Blocker** |
| C2 | **Same-drive rename bypasses safety** | Data loss on overwrite | Smart Move | **Blocker** |
| C3 | **Symlink/Junction following** without ownership validation | Arbitrary file read/delete | Scanner, Cache Cleaner | **Blocker** |
| C4 | **No file locking during hash operations** | TOCTOU, hash poisoning | Duplicate | **Blocker** |
| C5 | **No transaction boundary for journal + file ops** | Inconsistent state on crash | Smart Move | **Critical** |
| C6 | **Checkpoint file could be maliciously modified** | Resume from corrupted state | Scanner | **Critical** |
| C7 | **No sandbox for YAML rule loading** | Code injection via YAML | Cache Cleaner | **Critical** |
| C8 | **Recovery directory `.petabyte_recovery/` is predictable** | Attacker pre-creates directory | Smart Move | **High** |

### 1.3 Design Strengths

| Strength | Benefit |
|----------|---------|
| Journal-first WAL pattern | Crash recovery is theoretically sound |
| Trash-first deletion | All deletions recoverable via OS trash |
| Blake3 checksum verification | Cryptographic integrity guarantee |
| Clean Architecture layers | Isolation limits blast radius |
| Batch operations with transactions | Atomic write consistency |
| Permission-denied graceful handling | Scan continues despite errors |

### 1.4 Design Weaknesses

| Weakness | Risk |
|----------|------|
| No path canonicalization anywhere in design | All path-based operations vulnerable |
| No mandatory lock files during file operations | TOCTOU on all file reads |
| No integrity check on checkpoint/resume data | Corrupted checkpoint → corrupt data |
| No filesystem watch for concurrent modification | Hash-cache poisoning possible |
| Same-drive `rename()` bypasses all safety checks | Silent data loss on overwrite |
| YAML rules loaded without validation or sandbox | Malicious YAML → arbitrary paths |
| Recovery directory path is hardcoded and predictable | Pre-creation attack |

---

## 2. Threat Model

### 2.1 Methodology

STRIDE threat model applied to each system component.

```
S — Spoofing         (pretending to be something else)
T — Tampering        (modifying data in transit or at rest)
R — Repudiation      (denying an action was performed)
I — Information Disc. (leaking sensitive information)
D — Denial of Service (preventing legitimate use)
E — Elevation of Priv.(gaining unauthorized access)
```

### 2.2 Component: Scanner Engine

| Threat | STRIDE | Description | Risk |
|--------|--------|-------------|------|
| T-SCN-01 | T | Malicious symlink points to system file; scanner reads and records its metadata | Medium |
| T-SCN-02 | E | Junction escape: scanner follows junction from user folder to protected system area | High |
| T-SCN-03 | D | Scan depth bomb: attacker creates deep directory tree to exhaust threads | Medium |
| T-SCN-04 | T | Checkpoint file tampered with; resume scans wrong paths | Critical |
| T-SCN-05 | E | Permission bypass: jwalk running with elevated privileges reads protected files | Medium |
| T-SCN-06 | D | File count bomb: billions of tiny files in one directory exhaust SQLite | Low |
| T-SCN-07 | I | Scanner records paths of sensitive files (passwords, keys) in database | Medium |

### 2.3 Component: Duplicate Detection Engine

| Threat | STRIDE | Description | Risk |
|--------|--------|-------------|------|
| T-DUP-01 | T | TOCTOU on hash: file modified between partial hash and full hash → false result | High |
| T-DUP-02 | T | Hash cache poisoning: attacker-controlled file content cached → pollutes future scans | High |
| T-DUP-03 | I | Hash comparison reveals file content similarity; side channel for file content inference | Low |
| T-DUP-04 | D | Large files exhaust memory during full hash streaming | Medium |
| T-DUP-05 | T | Race condition: file deleted/recreated while hashing → hash of wrong content | Medium |

### 2.4 Component: Smart Move Engine

| Threat | STRIDE | Description | Risk |
|--------|--------|-------------|------|
| T-MOV-01 | T | Same-drive rename overwrites existing file without verification | Critical |
| T-MOV-02 | T | TOCTOU: file modified between checksum and delete → data inconsistency | High |
| T-MOV-03 | E | Move to symbolic link destination overwrites arbitrary file | Critical |
| T-MOV-04 | R | Journal entry deleted; no audit trail for completed operations | High |
| T-MOV-05 | T | Attacker pre-creates `.petabyte_recovery/` as junction to system folder | High |
| T-MOV-06 | D | Massive batch move fills disk at destination; system unstable | Medium |
| T-MOV-07 | T | Journal file truncated mid-write; recovery unreachable | Medium |

### 2.5 Component: Cache Cleaner Engine

| Threat | STRIDE | Description | Risk |
|--------|--------|-------------|------|
| T-CCH-01 | T | YAML rule defines `**/important/*` pattern; deletes user data | Critical |
| T-CCH-02 | E | Symlink in cache path points to `/etc`; cleaner follows and deletes | Critical |
| T-CCH-03 | D | Rule engine infinitely loops on recursive glob pattern | Medium |
| T-CCH-04 | T | Whitelist bypass via encoded path characters | High |
| T-CCH-05 | I | Cache scan reveals project structure and language usage | Low |
| T-CCH-06 | E | Rule file replaced by attacker; custom rule deletes arbitrary paths | High |

### 2.6 Component: Health Score Engine

| Threat | STRIDE | Description | Risk |
|--------|--------|-------------|------|
| T-HLT-01 | T | Health snapshot data tampered; incorrect grade shown to user | Low |
| T-HLT-02 | D | Frequent health re-calculations flood database with snapshots | Low |
| T-HLT-03 | I | Score history reveals usage patterns over time | Low |

### 2.7 Component: Database

| Threat | STRIDE | Description | Risk |
|--------|--------|-------------|------|
| T-DB-01 | T | Malicious SQL injection via file path stored in database | Medium |
| T-DB-02 | D | Database file grows unbounded; disk exhaustion | Medium |
| T-DB-03 | T | WAL file corruption leads to inconsistent read state | High |
| T-DB-04 | I | Database file stored in world-readable location | Medium |
| T-DB-05 | T | Concurrent write from multiple app instances corrupts database | Medium |

---

## 3. Risk Register

### 3.1 Comprehensive Risk Assessment

| ID | Risk | Engine | Severity | Likelihood | Impact | Risk Level |
|----|------|--------|----------|------------|--------|------------|
| R-001 | **Path traversal via symlink** — scanner follows symlink to arbitrary location | Scanner | **Critical** | Medium | Data leak, system file discovery | **High** |
| R-002 | **Junction escape** — attacker-placed junction leads scanner into protected system area | Scanner | **Critical** | Medium | Unauthorized read of system files | **High** |
| R-003 | **Symlink followed during cache clean** — cleaner deletes file at symlink destination | Cache Cleaner | **Critical** | Medium | System file deletion | **High** |
| R-004 | **Same-drive rename overwrites without verification** | Smart Move | **Critical** | Low | Unintended file overwrite | **High** |
| R-005 | **Move to symlink destination** — destination is symlink pointing to arbitrary path | Smart Move | **Critical** | Medium | Arbitrary file overwrite | **High** |
| R-006 | **Malicious YAML rule injection** — rule file path wildcard matches sensitive dirs | Cache Cleaner | **Critical** | Low | Mass deletion of user data | **High** |
| R-007 | **Checkpoint file tampering** — malicious checkpoint causes wrong paths on resume | Scanner | **Critical** | Low | Corrupted scan state | **Medium** |
| R-008 | **TOCTOU on hash** — file modified between partial and full hash | Duplicate | **High** | Low | False duplicate detection | **Medium** |
| R-009 | **Hash cache poisoning** — malicious content cached; all future scans inherit | Duplicate | **High** | Low | Persistent false duplicates | **Medium** |
| R-010 | **Pre-created recovery directory as junction** | Smart Move | **High** | Low | Move target hijack | **High** |
| R-011 | **No canonicalization** — relative paths, `..`, encoded chars bypass filters | ALL | **Critical** | Medium | Universal path bypass | **Critical** |
| R-012 | **No file locking** — concurrent modification during hash/read produces stale data | Duplicate, Scanner | **High** | Medium | Incorrect metadata | **Medium** |
| R-013 | **WAL file corruption** — crash during checkpoint leads to inconsistent db | Database | **High** | Low | Database state loss | **Medium** |
| R-014 | **No transaction scope on journal + file operation** | Smart Move | **Critical** | Medium | Inconsistent journal on crash | **High** |
| R-015 | **Deep directory tree bomb** — `a/b/c/.../z` 1000 deep exhausts thread pool | Scanner | **Medium** | Low | Thread pool starvation | **Low** |
| R-016 | **SQL injection via file path** — path stored in DB, later used in unsafe query | Database | **Medium** | Low | Unlikely with parameterized queries | **Low** |
| R-017 | **.petabyte_recovery directory world-readable** — recovered files exposed | Smart Move | **Medium** | Medium | Accidental data exposure | **Medium** |
| R-018 | **Batch operation memory exhaustion** — 100K files in one move request | Smart Move | **Medium** | Low | OOM crash | **Low** |
| R-019 | **Database file locked by another process** — app fails to open on startup | Database | **Medium** | Medium | App fails to start | **Medium** |
| R-020 | **Deep directory info disclosure** — scanner reveals full directory hierarchy | Scanner | **Low** | High | Privacy concern (local only) | **Low** |
| R-021 | **Crash mid-checkpoint-write corrupts resume state** | Scanner | **High** | Low | Partial rescan needed | **Low** |
| R-022 | **Recursive glob pattern DoS** — `**/**/node_modules` causes regex explosion | Cache Cleaner | **Medium** | Low | CPU exhaustion | **Low** |
| R-023 | **Permission denied escalation** — scanner runs as user but tries to read protected dir | Scanner | **Low** | High | Graceful handling exists | **Low** |
| R-024 | **Undo chain grows unbounded** — thousands of operations, journal table huge | Smart Move | **Low** | Medium | Storage growth | **Low** |
| R-025 | **File renamed during batch operation** — source path no longer valid | Smart Move | **Medium** | Medium | Partial operation failure | **Medium** |

---

## 4. Architecture Review

### 4.1 Trust Boundary Analysis

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TRUST BOUNDARY #1                              │
│                     (User Space — Untrusted Input)                    │
│                                                                       │
│   User-Supplied Paths, Scan Configuration, Move Requests             │
│   ───────────────────────────────────────────────────────────────     │
│   All input from frontend passes through Tauri IPC                   │
│   ┌──────────┐     ┌─────────┐     ┌─────────────┐                  │
│   │ React UI │────>│ Commands │────>│ Validation  │                  │
│   │ (user)   │     │(tauri)   │     │ Layer       │                  │
│   └──────────┘     └─────────┘     └──────┬──────┘                  │
│                                           │                          │
└───────────────────────────────────────────┼──────────────────────────┘
                                            │ Validated
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       TRUST BOUNDARY #2                               │
│                     (Application — Trusted)                           │
│                                                                       │
│   Use Cases → Domain Logic → Infrastructure Operations               │
│   ┌──────────────────────────────────────────────────────────┐       │
│   │  All validated, sanitized, canonicalized paths flow here │       │
│   └──────────────────────────────────────────────────────────┘       │
│                                                                       │
│                            ▲                                          │
│                            │                                          │
│   ┌──────────────────────────────────────────────────────────┐       │
│   │  Filesystem — Untrusted, mutable external environment    │       │
│   └──────────────────────────────────────────────────────────┘       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Critical finding:** The validation layer at the trust boundary is **not defined** in the design. There is no specification for input sanitization, path canonicalization, or parameter validation between Tauri commands and use cases.

### 4.2 Path Canonicalization Gap

**Problem:** The design stores and operates on user-provided paths without any canonicalization step.

```
User input:  "C:\\Users\\test\\..\\..\\Windows\\System32\\config"
After resolve: "C:\\Windows\\System32\\config"  ← Accesses protected area

User input:  "C:\\Users\\test\\node_modules" (symlink to "C:\\Windows")
After follow: "C:\\Windows"  ← Symlink escape
```

**Recommendation:** Every path must pass through a canonicalization pipeline:

```
Raw path → Normalize separators → Resolve .. segments → Reject if outside base
→ Follow symlinks? (configurable) → Canonical absolute path → Validate permissions
→ Use as canonical key for all operations
```

### 4.3 Tauri IPC Surface

| Attack Vector | Risk | Mitigation |
|---------------|------|------------|
| Unauthenticated `invoke` | Low | Tauri v2 has IPC authentication |
| Command argument injection | Medium | Validate all arguments server-side |
| Event channel flooding | Low | Event throttling |
| Large payload DoS | Medium | Size limits on invoke arguments |

---

## 5. Database Security Review

### 5.1 SQL Injection

**Current Design:** Uses parameterized queries (rusqlite prepared statements). **Adequate.**

**Risk:** File paths are stored from user filesystem and later used in queries. If any dynamic query construction is used, paths containing `'` or `"` characters could break queries.

**Mitigation:** Enforce 100% parameterized queries. Never construct SQL via string concatenation, even for "safe" data. Code review rule: zero tolerance for raw SQL string building.

### 5.2 WAL Mode Risks

| Risk | Detail | Mitigation |
|------|--------|------------|
| WAL file unbounded growth | Long-running scan without checkpoint | `PRAGMA wal_autocheckpoint=1000` |
| WAL corruption on power loss | WAL not fully flushed | `PRAGMA synchronous=NORMAL` (already in design) |
| Read inconsistency | Reader sees stale WAL pages | Already mitigated by WAL's reader-writer model |

### 5.3 Database File Protection

| Concern | Rating | Action Required |
|---------|--------|-----------------|
| Database location | Permissive | Store in platform-appropriate protected directory (`app_data_dir` via Tauri) |
| File permissions | Not specified | Set 0600 on database file post-creation |
| Encryption at rest | Not planned | v1.1 consideration; SQLite SEE or sqlcipher |
| Backup safety | Not specified | Warn user before overwriting existing DB on restore |

### 5.4 Migration Safety

**Current Design:** SQL migration files in `src-tauri/migrations/`.

**Risk:** Migration 002 (indexes) could take **minutes** on 10M-row `scan_entries` table. If interrupted, table may be in inconsistent state.

**Mitigation:** Wrap each migration in a transaction. Add migration version tracking. Use `CREATE INDEX IF NOT EXISTS` for idempotency. Run migrations in a background thread with progress reporting.

---

## 6. Scanner Engine Security Review

### 6.1 Symlink & Junction Handling

**Current Design:** `follow_links = false` (default). Configurable. Built-in system excludes per platform.

**Risk:**

| Scenario | Attack | Impact |
|----------|--------|--------|
| User scans `D:\Projects` — attacker places junction `D:\Projects\system` → `C:\Windows\System32` | Scanner follows junction, reads system file metadata | Information disclosure of system files |
| Hidden junction at `D:\Projects\node_modules` → `D:\Projects\..\..\Users\Admin\Documents` | Scanner indexes private documents | Privacy violation |
| Symlink farm: millions of symlinks in one directory | Scanner follows and reports each; SQLite flooded | Intentional database bloat |

**Mitigation (required):**

```
1. Symlink scan policy — MUST read and verify symlink target before following
2. Target validation — Symlink target must be WITHIN the scan root directory
3. Max depth for symlink chains — Reject chains > 5 hops
4. Junction detection — On Windows, detect and verify junction targets explicitly
5. Configurable follow — Default: DO NOT FOLLOW; user must opt-in
```

### 6.2 Path Traversal in Exclusions

**Current Design:** Exclusion patterns support glob and regex.

**Risk:** If exclusion pattern is user-supplied (custom exclude list), a malicious pattern like `!/etc/passwd` could include a path that should be excluded, or vice versa.

**Mitigation:** All exclusion patterns must be:
1. Prefixed with user's scan root (cannot escape)
2. Validated against path traversal patterns
3. Logged for audit

### 6.3 Checkpoint Security

**Current Design:** Checkpoint saves every 10K files or 30 seconds.

**Risk:** Checkpoint is stored in SQLite (scan state). If SQLite file is corrupted at checkpoint position:

```
scan_entries: 50,000 rows committed
checkpoint:   last_processed_path = "C:\Users\test\malicious" (tampered)
resume:       starts from wrong path, skips files, or re-processes
```

**Mitigation:**
1. Store checkpoint as **checksummed record** in a separate `scan_checkpoints` table
2. CRC32 or Blake3 hash of checkpoint data for integrity verification
3. On resume, verify checkpoint integrity before accepting it
4. Acceptable loss: resume from last VALID checkpoint, not latest

### 6.4 Permission Handling

**Current Design:** Graceful skip on permission denied. Log and continue.

**Risk on Windows:** Some directories have dynamic permissions (e.g., `C:\ProgramData\Microsoft\Windows\Containers`). Scanner retry on these may thrash.

**Mitigation:** Cache denied paths per session; don't retry access to paths already denied.

### 6.5 TOCTOU in Scanner

| Race Window | Duration | Impact | Mitigation |
|-------------|----------|--------|------------|
| `walkdir` reads path → batch insert reads metadata | ~10-500ms | File renamed/deleted → stale or incorrect entry | Store `file_id` (inode on Unix, file index on Windows) for cross-validation |
| Scanner records size → user file grows | ~1s | Size recorded is stale; health score inaccurate | Acceptable for v1.0 — health score is point-in-time |
| File replaced between scan and hash | Minutes to hours | Hash of old content stored for new content | Re-verify `modified_at` before hashing; reject if changed |

---

## 7. Duplicate Engine Security Review

### 7.1 TOCTOU Between Tiers

**Critical design gap:** The multi-tier pipeline spans **seconds to minutes** between Tier 1 (size grouping) and Tier 4 (full hash). A file can be modified during this window.

```
Tier 1 (t=0s):  File A and File B both have size 1,048,576
                → Candidate pair
Tier 3 (t=45s): Hash File A → partial_hash = 0xABCD
                Hash File B → partial_hash = 0xABCD
                → Candidate pair, schedule for full hash
Tier 4 (t=90s): Hash File A → full_hash = 0x1234...
   ↑ File B was MODIFIED by another process at t=60s
   ↑ Size changed to 2,097,152
                Hash File B → full_hash = 0x5678... (different content!)
                → NOT a duplicate (correct result, but wasted work)
```

**Worse scenario (poisoning):**

```
Tier 1 (t=0s):  File A (size=1000) and File B (size=1000) → Candidate
Tier 3 (t=45s): Partial hash File A → 0xABCD
                Partial hash File B → 0xABCD → Candidate
Tier 4 (t=90s): Full hash File A → 0x1234
   ↑ File B REPLACED with new content (same path, new size)
   ↑ Now size=2000, hash=0x5678
                Hash of OLD File B? No, system reads current file
                → Tier 3 partial hash was of old content, Tier 4 is of new content
                → INCONSISTENT STATE
```

**Mitigation (required):**

```
1. Verify file size and modified_at before EVERY hash operation
2. If size or modified_at changed since scan entry was written:
   a. Re-record the scan entry with current metadata
   b. Abandon the hash; the file will be picked up in next scan
3. For Tier 3→Tier 4 transition:
   a. Re-check scan_entry.modified_at before opening file for full hash
   b. If changed, skip full hash, mark for re-scan
4. Log all TOCTOU skips for user awareness
```

### 7.2 Hash Cache Poisoning

**Current Design:** Hash cache stores `(file_size, partial_hash, full_hash)` for reuse.

**Attack scenario:**

```
Scan 1: File X (size=1000, content="AAAA") → hash=0xAAAA, stored in cache
         → User deletes File X
Scan 2: File Y (size=1000, content="BBBB") → size=1000 found in cache
         → Cache hit! hash=0xAAAA reused
         → File Y marked as duplicate of File X's hash group
         → FALSE POSITIVE (content is different!)
```

**But wait** — the hash cache stores `(size, partial_hash, full_hash)`. For a cache hit, the lookup requires partial_hash match too. So:

```
Scan 1: File X (size=1000, partial=0xAAAA_8KB, full=0xAAAA_full) → cached
Scan 2: File Y (size=1000, content="BBBB") → partial hash of File Y = 0xBBBB_8KB
         → Cache lookup by (size=1000, partial=0xBBBB_8KB) → MISS (correct!)
         → Full hash File Y → 0xBBBB_full
         → Store in cache
```

**The real cache poisoning risk:** If an attacker controls the content of a file that gets hashed:

```
Legitimate app file: size=10MB, partial_hash=0xABCD
→ cached as (10MB, 0xABCD, full_hash_A)
Attacker creates file at same size: content adjusted to produce partial_hash=0xABCD
→ Tier 3 matches → proceed to full hash
→ Full hash is DIFFERENT → correctly rejected
```

**Verdict:** Cache poisoning via collision is **not feasible** against Blake3. The cache design is sound.

### 7.3 Race Condition: File Hashed While In Use

| Scenario | Impact | Probability |
|----------|--------|-------------|
| Database actively writing while being hashed | Partial/torn read; hash of truncated content | Low (OS buffer cache) |
| Log file rotated while being hashed | Hash of old + new content; false dedup result | Low |
| VM disk image being modified | Large file, partial hash of 8KB fine; full hash reads entire modified content | Medium |

**Mitigation:** Blake3 streaming reads sequentially. OS page cache ensures reads are coherent (no torn reads within a single `read()` call). However, if file size changes during read, the hash result is meaningless.

**Recommendation:** Check `file_size` before and after reading. If changed, discard hash and skip the file.

---

## 8. Smart Move Engine Security Review

### 8.1 Same-Drive Rename Bypass (Critical)

**Current Design (SMV-003):** Same-drive operations use atomic `rename()`. This SKIPS Phases 2-4 (copy, checksum verify, meta verify).

**The problem:**

```
User requests: Move "D:\docs\report.docx" → "D:\archive\report.docx"
System validates: destination "D:\archive\report.docx" does not exist → OK
System performs: rename("D:\docs\report.docx", "D:\archive\report.docx") → OK

But what if between validation and rename:
- Attacker (or another process) creates "D:\archive\report.docx"
- rename() OVERWRITES the existing file silently
```

**Windows `rename()` behavior:** `MoveFileEx` with `MOVEFILE_REPLACE_EXISTING` flag overwrites existing file. Without the flag, it fails. But the current design specifies "atomic rename (instant, no copy)" without specifying **no-overwrite semantics**.

**Mitigation (required):**

```
1. Use rename() with NO_REPLACE / MOVEFILE_NO_REPLACE_EXISTING flag
2. If rename fails because destination exists → check if it's the same inode
3. If rename fails for any other reason → fall back to copy+verify path
4. NEVER allow rename() to overwrite an existing file
5. Same-drive path must still: write journal, validate, rename(noreplace), commit
```

### 8.2 Symlink Destination Attack (Critical)

**Current Design:** System validates destination path, but does NOT check if destination is a symlink.

```
User requests: Move "D:\docs\file.txt" → "D:\target\"
Destination "D:\target\" is a symlink pointing to "E:\system\"
System resolves: "D:\target\file.txt" → actually "E:\system\file.txt"
→ File written to system directory!
```

**Mitigation (required):**

```
1. Resolve destination path to canonical form BEFORE any operation
2. Check if resolved destination is within allowed boundaries
3. If destination is a symlink → REJECT or warn user explicitly
4. Never follow symlinks at destination during move operations
```

### 8.3 Journal-First Integrity

**Current Design:** Journal entry written BEFORE any file operation.

**Adequate, but needs hardening:**

| Concern | Design Gap | Fix |
|---------|-----------|-----|
| Journal write + file operation NOT in same transaction | Crash after journal write, before file op → "phantom" journal entry | Wrap journal + first file op in same SQLite transaction where possible |
| Journal ID is UUID v4 — predictable if RNG is weak | Attacker could pre-generate journal IDs | Use UUID v7 (time-ordered) + random suffix, or auto-increment |
| Journal truncation | Partial write to journal file | Store checksum of journal entry within the entry itself |
| Journal replay safety | Replaying journal could perform stale operations | Mark journal entries with session ID; only replay uncommitted entries for current session |

### 8.4 Recovery Directory Attack (High)

**Current Design (SMV-012):** Fall back to `.petabyte_recovery/` if OS trash unavailable.

**Attack:**

```
1. Attacker pre-creates "C:\Users\victim\.petabyte_recovery" as a junction
   pointing to "C:\Windows\System32"
2. Victim uses Smart Move → trash unavailable → fallback to .petabyte_recovery
3. Files are "recovered" to .petabyte_recovery → actually go to System32
4. System files corrupted
```

**Mitigation (required):**

```
1. Create .petabyte_recovery directory at APP STARTUP, not on demand
2. Verify the directory is a REAL directory, not a junction/symlink
3. Set restrictive permissions on the directory (0700)
4. Store the canonical path in app state; verify before each use
5. If directory at expected path is not the one we created → ABORT
6. Periodic integrity check: "is this still a real directory with our expected inode?"
```

### 8.5 Batch Operation Consistency

**Current Design (SMV-011):** Batch operations are supported.

**Risk:** 10,000 files in one batch move. File 5,001 fails. What state is the system in?

- Files 1-5,000: moved and committed
- File 5,001: failed (journal = 'failed')
- Files 5,002-10,000: NOT yet processed

**Mitigation:** Implement **all-or-nothing** batch semantics:
1. Journals for ALL files written first (all 'pending')
2. Execute ALL moves
3. If any fails → roll back completed moves, mark all as 'rolled_back'
4. Or: use checkpoint-style batches (500 files), each batch atomic

---

## 9. Cache Cleaner Security Review

### 9.1 YAML Rule Injection (Critical)

**Current Design (CCH-001):** Rules loaded from YAML files.

**Risk — Arbitrary path pattern matching:**

```yaml
# Malicious rule:
- name: "clean_everything"
  patterns:
    - "**/*"
  safe_to_delete: true
```

Even without a malicious file, a generic rule can have unintended consequences:

```yaml
# Rust build rule
- name: "target_directory"
  patterns:
    - "**/target/"
```

This matches `D:\Projects\my-project\target\` **AND** `C:\Users\test\important\my_target_files\` if glob semantics include `target` as a substring.

**Mitigation (required):**

```
1. YAML schema validation — Load rules through a strict JSON Schema / YAML Schema validator
2. Pattern sandbox — Restrict glob patterns:
   a. Must contain at least one directory separator
   b. Must not start with **/ (would match anywhere)
   c. Pattern must be relative to known ecosystem directories
3. Rule review — Built-in rules reviewed by security team before shipping
4. No user-custom rules in v1.0 — Custom rules postponed to v1.1 with explicit user confirmation
5. Pattern testing — Unit test each pattern against known-safe and known-dangerous paths
6. Deny-by-default — Only match paths within user-confirmed directories
```

### 9.2 Safe Delete Verification Gaps

**Current Design (CCH-007):** 5 safety checks per item.

**Missing checks:**

| # | Current | Missing | Risk |
|---|---------|---------|------|
| 1 | Path within user home | Path is NOT a symlink | Symlink in home → delete outside home |
| 2 | Not system directory | Not a mount point | Accidental unmount |
| 3 | Not user home root | Not `.` or root directory | Path normalization bypass |
| 4 | Not in use (Windows) | Not a hardlinked important file | Delete one hardlink → data still exists but confusing |
| 5 | No whitelist match | Check for file with same name in sibling dirs | False positive on generic name |

**Required additional checks:**

```
6. Path canonicalization — Resolve to absolute canonical path before any check
7. Symlink resolution — Reject if any path component is a symlink (unless explicitly allowed)
8. Mount point check — Reject if path is a mount point root
9. Environment variable integrity — Don't delete $HOME, $TEMP, $TMP directory roots
10. Path depth minimum — Only delete at least 2 levels deep from home (prevent $HOME/subdir)
```

### 9.3 Trash Operation Safety

| Risk | Detail | Mitigation |
|------|--------|------------|
| Trash unavailable (network drive) | Fallback to `.petabyte_recovery/` | Already in design |
| Trash restore fails | File permanently lost | Journal entry enables manual recovery |
| Trash directory filled | Trash silently fails to accept new items | Warn user before clean if trash is full |
| Cross-device trash | Can't trash across volumes | Use `.petabyte_recovery/` on same volume |

### 9.4 Whitelist Bypass

**Current Design (CCH-011):** Whitelist patterns reject matching items.

**Risk:** Path encoding bypass:

```
Whitelist: "C:\Users\test\Projects\important\"
Actual path: "C:\Users\test\Projects\important\..\..\..\Desktop\clean_me"
→ Normalized: "C:\Users\test\Desktop\clean_me" (NOT matched by whitelist!)
```

**Mitigation:** Canonicalize ALL paths before whitelist/blacklist matching.

---

## 10. Health Score Security Review

### 10.1 Data Integrity

**Risk:** Low. Health score is read-only analysis. It does not modify files or system state.
**Worst case:** Incorrect score shown to user → user takes unnecessary action or ignores real problem.

### 10.2 Recommendation Engine Safety

| Risk | Impact | Mitigation |
|------|--------|------------|
| Recommendation suggests deleting system files | User follows bad advice | Recommendations are informational ONLY; all actions go through engine with full safety checks |
| Score manipulation via cache poisoning | Incorrect recommendation | Score uses aggregated data; single cache miss doesn't move score significantly |
| Trend data misinterpretation | User thinks storage is degrading when it's not | Always show raw numbers alongside trend; display confidence indicators |

### 10.3 Denial of Service

| Vector | Risk | Mitigation |
|--------|------|------------|
| Frequent re-calculation on very large dataset | CPU bound for seconds | Cache score for 5 minutes minimum; re-calculate only on explicit events |
| Historical snapshot accumulation | Database growth | Retention policy already in design (90d daily, 1yr weekly) |

---

## 11. Risk Matrix

### 11.1 Heat Map

```
                   LIKELIHOOD
              ┌─────┬─────┬─────┬─────┬─────┐
              │ Rare│ Low │ Med │ High│V.High│
   ┌──────────┼─────┼─────┼─────┼─────┼─────┤
   │ Critical │     │     │R-011│     │     │
   │          │     │     │R-001│     │     │
   ├──────────┼─────┼─────┼─────┼─────┼─────┤
   │   High   │R-004│R-005│R-010│     │     │
   │          │R-007│R-003│R-014│     │     │
   │          │     │R-002│     │     │     │
   ├──────────┼─────┼─────┼─────┼─────┼─────┤
   │  Medium  │R-009│R-008│R-012│     │     │
   │          │R-013│R-022│R-017│     │     │
   │          │R-021│R-016│R-019│     │     │
   │          │R-024│     │     │     │     │
   ├──────────┼─────┼─────┼─────┼─────┼─────┤
   │    Low   │R-015│R-018│R-020│     │     │
   │          │     │R-023│R-025│     │     │
   └──────────┴─────┴─────┴─────┴─────┴─────┘
```

### 11.2 Priority Matrix

| Risk Level | Count | Action Required |
|------------|-------|-----------------|
| **Critical** | 1 (R-011) | **Blocker** — Must fix before any production release |
| **High** | 7 | **Required** — Must fix before v1.0 release |
| **Medium** | 12 | **Recommended** — Fix before v1.0; acceptable with documented exception |
| **Low** | 5 | **Deferred** — Acceptable for v1.0; address in v1.1 |

### 11.3 Risk by Engine

| Engine | Critical | High | Medium | Low | Total |
|--------|----------|------|--------|-----|-------|
| Scanner | 1 | 2 | 3 | 2 | 8 |
| Duplicate | 0 | 2 | 2 | 0 | 4 |
| Smart Move | 2 | 2 | 2 | 2 | 8 |
| Cache Cleaner | 2 | 2 | 1 | 0 | 5 |
| Health Score | 0 | 0 | 1 | 2 | 3 |
| Database | 0 | 0 | 3 | 1 | 4 |

**Total risks identified: 32** (1 Critical, 8 High, 12 Medium, 7 Low)

---

## 12. Security Checklist

### 12.1 Pre-Implementation (Design Phase)

- [x] Clean Architecture with dependency inversion
- [x] Journal-first write pattern for all file mutations
- [x] Trash-first deletion policy
- [x] Blake3 checksum verification for moves
- [x] Crash recovery decision matrix documented
- [ ] **Path canonicalization pipeline defined** (MISSING)
- [ ] **Symlink/junction security policy defined** (MISSING)
- [ ] **Input validation layer specified** (MISSING)
- [ ] **TOCTOU mitigation strategy documented** (MISSING)
- [ ] **YAML rule sandbox specified** (MISSING)

### 12.2 Implementation (Code Phase)

- [ ] All paths canonicalized via `std::fs::canonicalize()` before use
- [ ] Symlinks NOT followed by default; explicit user opt-in required
- [ ] Junction targets verified to be within scan root
- [ ] `rename()` uses `NO_REPLACE` flag; never overwrites existing files
- [ ] Move destination checked for symlink before execution
- [ ] TOCTOU guards: verify `modified_at` + `file_size` before and after hashing
- [ ] YAML rules validated against strict schema before loading
- [ ] `.petabyte_recovery/` verified as real directory (not junction) at startup
- [ ] Journal entries checksummed for integrity verification
- [ ] SQLite migrations wrapped in transactions; idempotent
- [ ] All SQL queries parameterized; zero string concatenation
- [ ] Tauri command inputs validated server-side (not just client-side)
- [ ] File locking (shared read lock) during hash operations

### 12.3 Testing (QA Phase)

- [ ] Symlink escape test: place symlink to system dir, verify not followed
- [ ] Junction escape test: Windows junction to Protected directory
- [ ] Path traversal test: `..` segments, encoded characters, Unicode normalization
- [ ] TOCTOU test: modify file mid-scan, verify engine detects and skips
- [ ] TOCTOU test: modify file between hash tiers, verify re-validation
- [ ] Race condition test: create/delete files during scan (10 parallel processes)
- [ ] Malicious YAML test: patterns matching system directories
- [ ] Recovery directory pre-creation test: create as symlink before app starts
- [ ] Same-drive rename overwrite test: verify no silent overwrite
- [ ] Batch consistency test: verify all-or-nothing on partial failure
- [ ] Database corruption test: truncate WAL, verify recovery
- [ ] Deep directory bomb: 1000+ depth, verify scanner doesn't crash
- [ ] Permission denied test: scan system dirs, verify graceful skip
- [ ] Large file edge case: 100GB+ file, verify streaming doesn't OOM
- [ ] Unicode path test: emoji, RTL, zero-width characters, Chinese/Japanese/Arabic

### 12.4 Pre-Release (Ship Phase)

- [ ] `cargo audit` passes with zero vulnerabilities
- [ ] `cargo deny` passes (license check, banned deps)
- [ ] `cargo clippy -- -D warnings` passes
- [ ] All integration tests pass on Windows, macOS, Linux
- [ ] Fuzz testing on path inputs (100K random paths)
- [ ] Property-based testing on path normalization
- [ ] Manual penetration test on file operations
- [ ] Security review sign-off

---

## 13. Production Readiness Checklist

### 13.1 Error Handling & Resilience

- [ ] All file operations wrapped in try-catch; no unwrap/expect on I/O
- [ ] Graceful degradation: if one engine fails, others still work
- [ ] Error aggregation: non-fatal errors collected and reported to user
- [ ] Panic boundary: `catch_unwind` around worker threads prevents app crash
- [ ] Timeout on all filesystem operations (configurable, default 30s per file)
- [ ] Retry policy: transient errors (sharing violation, permission) retried 3x
- [ ] Logging: structured logs with correlation IDs per scan/move operation

### 13.2 Concurrency Safety

- [ ] SQLite: single writer thread; `Send + Sync` on all repository implementations
- [ ] Shared state: `Arc<parking_lot::RwLock>` for mutable config; `AtomicBool` for flags
- [ ] Channel bounded: mpsc channel capacity bounded to prevent OOM
- [ ] Thread naming: each worker thread named for debugging
- [ ] Cancellation: `CancellationToken` pattern throughout; no `thread::kill`
- [ ] Deadlock prevention: consistent lock ordering; no nested locks across layers

### 13.3 Data Durability

- [ ] Journal entries: flushed to disk before file operations begin
- [ ] SQLite: `PRAGMA synchronous = NORMAL` (balance safety/performance)
- [ ] WAL checkpoint: periodic via `PRAGMA wal_checkpoint(TRUNCATE)`
- [ ] Backup: no built-in backup in v1.0; documented manual backup procedure
- [ ] Recovery tested: crash at every phase of Smart Move pipeline verified

### 13.4 Resource Management

- [ ] File handles: opened with `Drop` that auto-closes; RAII throughout
- [ ] Memory: streaming for large files; no `read_to_string` on unknown sizes
- [ ] Disk space: check available space before batch operations; 10% safety margin
- [ ] SQLite: page cache size limited; prevent OS memory pressure
- [ ] Thread pool: bounded by `num_cpus`; configurable maximum

### 13.5 Upgrade & Migration

- [ ] Database migration: forward-only, version-tracked, idempotent
- [ ] Rollback: documented downgrade path for each migration
- [ ] Data format version: `calculation_version` in health snapshots
- [ ] Config migration: `app_settings` uses key-value; forward compatible by design
- [ ] Breaking change policy: minor version bumps for breaking schema changes

### 13.6 Monitoring & Observability

- [ ] Application logs: structured JSON format, configurable level
- [ ] Performance metrics: scan throughput (files/sec), hash throughput (MB/sec)
- [ ] Error rate: track and expose error count per session
- [ ] Resource usage: track memory, thread count, open file handles
- [ ] Audit trail: all file mutations logged with timestamp, user, operation details

---

## 14. Key Findings Summary

### 14.1 Critical (Blocker for v1.0)

| Finding | Engine | Root Cause | Fix Priority |
|---------|--------|------------|-------------|
| **No path canonicalization** anywhere in design | ALL | Design oversight — paths used as received | **Implement `canonicalize()` pipeline in shared crate** |
| **Same-drive rename can silently overwrite** | Smart Move | SMV-003 doesn't specify `NO_REPLACE` flag | **Use `rename_noreplace()` or check existence atomically** |
| **Symlink/junction followed without boundary check** | Scanner, Cache Cleaner | Default `follow_links=false` but no validation if enabled | **Add target-within-root validation on symlink resolution** |

### 14.2 High (Required for v1.0)

| Finding | Engine | Fix |
|---------|--------|-----|
| TOCTOU between duplicate detection tiers | Duplicate | Verify `modified_at` + `size` before each hash operation |
| Move to symlink destination overwrites files | Smart Move | Canonicalize destination; reject if symlink |
| Malicious YAML rules can match arbitrary paths | Cache Cleaner | Schema validation + pattern sandbox + deny-by-default |
| Pre-created `.petabyte_recovery/` as junction | Smart Move | Verify directory integrity at startup |
| Checkpoint integrity not verified | Scanner | Checksum checkpoint data; validate on resume |
| Journal + file operation not in same transaction | Smart Move | Wrap journal + first op in single SQLite transaction |

### 14.3 Medium (Recommended for v1.0)

| Finding | Engine | Fix |
|---------|--------|-----|
| Hash cache cross-session poisoning (theoretical) | Duplicate | Current design is sound; monitor in production |
| Race on file in use during hash | Duplicate | Check `size` before and after read; skip if changed |
| Deep directory bomb exhaustion | Scanner | Configurable max depth; default 100 |
| WAL file unbounded during long scan | Database | `PRAGMA wal_autocheckpoint` on scan completion |
| Batch operation partial failure | Smart Move | All-or-nothing batch semantics |
| Database file permissions open | Database | Use platform `app_data_dir`; set 0600 permissions |

### 14.4 Low (Deferred to v1.1)

| Finding | Engine | Acceptable? |
|---------|--------|-------------|
| Scanner records sensitive path names | Scanner | Local-only; acceptable for v1.0 |
| Undo chain unbounded growth | Smart Move | Add retention policy in v1.1 |
| No file encryption at rest | Database | Acceptable for local-only app; revisit if cloud features added |

---

## Appendix A: STRIDE Mapping Per Component

```
              ┌─────────────────────────────────────────────────────┐
              │  S  │  T  │  R  │  I  │  D  │  E  │  Total         │
├─────────────┼─────┼─────┼─────┼─────┼─────┼─────┼────────────────┤
│ Scanner     │  0  │  3  │  0  │  1  │  2  │  2  │  8             │
│ Duplicate   │  0  │  3  │  0  │  1  │  1  │  0  │  5             │
│ Smart Move  │  0  │  4  │  1  │  0  │  1  │  2  │  8             │
│ Cache Clean │  0  │  3  │  0  │  1  │  1  │  2  │  7             │
│ Health Score│  0  │  1  │  0  │  1  │  1  │  0  │  3             │
│ Database    │  0  │  2  │  0  │  1  │  1  │  0  │  4             │
├─────────────┼─────┼─────┼─────┼─────┼─────┼─────┼────────────────┤
│ Total       │  0  │ 16  │  1  │  5  │  7  │  6  │  35            │
└─────────────┴─────┴─────┴─────┴─────┴─────┴─────┴────────────────┘

Key insight: TAMPERING (16) and ELEVATION OF PRIVILEGE (6) dominate.
This is expected for a file management application.
SPOOFING is not a concern (no authentication in local app).
```

## Appendix B: Security-Sensitive Code Review Rules

| Rule | Description | Tool |
|------|-------------|------|
| S-001 | Every file path MUST be canonicalized before use | Custom lint or code review |
| S-002 | Every `unwrap()`/`expect()` on I/O operations is FORBIDDEN | Custom clippy lint |
| S-003 | Every unsafe block MUST have a safety comment explaining invariants | clippy `unsafe_derive_docs` |
| S-004 | SQL queries MUST use parameters, NEVER string interpolation | Code review |
| S-005 | Journal entries MUST be written BEFORE file operations | Architecture test |
| S-006 | No secret/token/API key may be stored in source code | `cargo-deny` + `git-leaks` |
| S-007 | `rename()` MUST use `NO_REPLACE` / `noreplace` semantics | Code review |
| S-008 | Thread::spawn MUST NOT be used; use rayon/tokio instead | Code review |
| S-009 | All cross-process file operations MUST verify file identity (inode) | Code review |
| S-010 | YAML rule files MUST pass schema validation before loading | Integration test |

## Appendix C: Incident Response Plan

While PetaByte is local-only, a data-loss incident requires:

1. **Immediate stop** — App prevents further file operations
2. **Journal dump** — Export operation_journal table for analysis
3. **Trash check** — If file was trashed, guide user to restore from trash
4. **Recovery attempt** — If journal indicates incomplete move, attempt recovery path
5. **Crash analysis** — Collect logs, journal, and crash dump for root cause
6. **Patch** — Fix root cause; add regression test
7. **Communication** — If open-source, issue security advisory
