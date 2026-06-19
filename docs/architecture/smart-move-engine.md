# 📦 PetaByte — Smart Move Engine

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SMART MOVE ENGINE                                              │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           MoveOrchestrator                                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐ │   │
│  │  │  Pre-    │  │  Copy    │  │  Verify  │  │  Meta    │  │  Delete  │  │Commit│ │   │
│  │  │Validate  │─>│  Engine  │─>│  Engine  │─>│  Verify  │─>│  Source  │─>│Success│ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────┘ │   │
│  └───────────────────────────────────┬──────────────────────────────────────────────┘   │
│                                      │                                                    │
│         ┌────────────────────────────┼────────────────────────────┐                      │
│         │                            │                            │                      │
│         ▼                            ▼                            ▼                      │
│  ┌──────────────┐           ┌──────────────────┐          ┌──────────────┐              │
│  │ JournalMgr   │           │   Verifier       │          │  TrashMgr    │              │
│  │ (WAL for     │           │  (checksum +     │          │  (safe       │              │
│  │  operations) │           │   metadata)      │          │   deletion)  │              │
│  └──────────────┘           └──────────────────┘          └──────────────┘              │
│                                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐│
│  │ RecoveryMgr  │  │ Progress     │  │ LockHandler  │  │ StreamCopier                 ││
│  │ (crash       │  │ Tracker      │  │ (in-use file │  │ (chunked copy +              ││
│  │  recovery)   │  │ (ETA, stats) │  │  detection)  │  │  blake3 during copy)         ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────────────┘│
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘

                               CRATE STRUCTURE

  petabyte-smart-move/
       │
       ├── petabyte-shared-models (entities: MoveOperation, MoveJournal, FilePath)
       │                      (ports: FileOpPort, MoveJournalPort, ProgressEmitter)
       │
       ├── petabyte-shared (error types, constants, platform utilities)
       │
       └── [external] blake3, trash, serde, uuid, thiserror
```

---

## 2. Core Design Principle: Journal-First

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE GOLDEN RULE OF DATA SAFETY                         │
│                                                                              │
│   "Write the journal entry BEFORE touching any file.                         │
│    Never delete source until destination is verified."                       │
│                                                                              │
│   Transaction model:                                                         │
│   ┌───────────────────────────────────────────────────────────────────────┐  │
│   │  BEGIN JOURNAL ──→ VALIDATE ──→ COPY ──→ VERIFY ──→ DELETE ──→ COMMIT │  │
│   │  (WAL entry)                     ║                  ║                  │  │
│   │          ┌───────────────────────╨──────────────────╨────────────┐     │  │
│   │          │  At no point can a crash cause data loss.             │     │  │
│   │          │  Worst case: file exists at BOTH locations.           │     │  │
│   │          │  NEVER: file exists at NEITHER location.              │     │  │
│   │          └───────────────────────────────────────────────────────┘     │  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Six-Phase Pipeline

```
INPUT: MoveRequest { source, destination, files/directories list }

       │
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 0: JOURNAL BEGIN (Write-Ahead Log Entry)                                │
│                                                                                │
│  INSERT INTO operation_journal (                                               │
│      id, operation_type, source_path, destination_path,                       │
│      original_path, checksum_before, status, created_at                       │
│  ) VALUES (uuid, 'move', src, dst, src, NULL, 'pending', now);               │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  ⚡ Journal is written FIRST, before any file operation.             │    │
│  │  If crash occurs after this point, recovery can always determine     │    │
│  │  what was in progress and take corrective action.                    │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: PRE-VALIDATION                                                        │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  CHECKLIST (ALL must pass before any file is touched):               │    │
│  │                                                                       │    │
│  │  ☑ Source exists → path, readable                                     │    │
│  │  ☑ Destination parent exists → if not, create                        │    │
│  │  ☑ Destination doesn't exist OR user confirmed overwrite              │    │
│  │  ☑ Enough disk space at destination → size × 1.1 safety margin       │    │
│  │  ☑ Same volume? → determines strategy (rename vs copy+delete)        │    │
│  │  ☑ Not copying onto itself → same inode check                        │    │
│  │  ☑ Permission check → read source, write dest                        │    │
│  │  ☑ File not locked by another process → Windows only, best effort    │    │
│  │  ☑ Not a system-protected path → skip if configure                    │    │
│  │                                                                       │    │
│  │  If ANY check fails:                                                  │    │
│  │    → Set journal status = 'failed' + error_message                   │    │
│  │    → Move to next file in batch                                       │    │
│  │    → Aggregate errors for final report                                │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                                │
│  RESULT: strategy determined: SameDrive | CrossDrive                          │
│          checksum_before computed (streaming Blake3)                          │
│          journal.checksum_before updated                                      │
│          journal.status = 'copying'                                            │
│                                                                                │
│  Same-drive shortcut:                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  If same volume and not overwriting:                                  │    │
│  │    → Atomic rename. Skip Phase 2-4. Go to Phase 5.                   │    │
│  │    → rename() is instant regardless of file size                     │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: COPY (Cross-Drive Only)                                              │
│                                                                                │
│  journal.status = 'copying'                                                     │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  Stream copy with integrated checksum:                               │    │
│  │                                                                       │    │
│  │  buffer = [64KB] × N (configurable, default: 64KB)                   │    │
│  │  source_hasher = Blake3::new()                                        │    │
│  │  dest_hasher = Blake3::new()                                          │    │
│  │                                                                       │    │
│  │  loop:                                                                │    │
│  │    bytes = source.read(buffer)                                        │    │
│  │    if bytes == 0: break                                               │    │
│  │    source_hasher.update(buffer[..bytes])                              │    │
│  │    dest.write(buffer[..bytes])                                        │    │
│  │    dest_hasher.update(buffer[..bytes])                                │    │
│  │    dest.flush()  ← periodic flush, not every chunk                   │    │
│  │    progress.report(bytes_copied, total_bytes)                         │    │
│  │    check_cancel() → if cancelled, stop                               │    │
│  │                                                                       │    │
│  │  source_hash = source_hasher.finalize()  ← already computed          │    │
│  │  dest_hash = dest_hasher.finalize()      ← already computed          │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                                │
│  ╔══════════════════════════════════════════════════════════════════════╗     │
│  ║  CRASH SAFETY: If crash during copy, destination file may be         ║     │
│  ║  incomplete. Recovery will detect and clean up. Source is UNTOUCHED. ║     │
│  ╚══════════════════════════════════════════════════════════════════════╝     │
│                                                                                │
│  Cancel behavior:                                                              │
│    → Stop reading source                                                      │
│    → Close destination file handle                                             │
│    → Delete partial destination file                                           │
│    → journal.status = 'cancelled'                                              │
│    → Source is UNTOUCHED                                                       │
│                                                                                │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: CHECKSUM VERIFICATION                                                 │
│                                                                                │
│  journal.status = 'verifying'                                                   │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  source_hash == dest_hash?                                            │    │
│  │                                                                       │    │
│  │  YES → MATCH: integrity confirmed.                                   │    │
│  │         journal.checksum_after = dest_hash                            │    │
│  │         journal.status = 'verifying_metadata'                          │    │
│  │                                                                       │    │
│  │  NO → MISMATCH: corruption detected.                                 │    │
│  │        → Delete destination file                                     │    │
│  │        → journal.status = 'failed'                                   │    │
│  │        → error_message = "checksum mismatch: expected X got Y"       │    │
│  │        → Source is UNTOUCHED                                          │    │
│  │        → Retry option: Phase 2 (max 3 retries)                       │    │
│  │        → If still failing after retries: abort this file, report     │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                                │
│  ╔══════════════════════════════════════════════════════════════════════╗     │
│  ║  IMPORTANT: checksum_before was computed in Phase 1 BEFORE any      ║     │
│  ║  copy. checksum_after was computed INCREMENTALLY during Phase 2.    ║     │
│  ║  No need to re-read source or destination for verification.         ║     │
│  ╚══════════════════════════════════════════════════════════════════════╝     │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: METADATA VERIFICATION                                                 │
│                                                                                │
│  Verify that the copied file preserves essential metadata:                     │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  ☑ File size matches (should never fail if checksum passed)          │    │
│  │  ☑ File count matches (for directory moves)                          │    │
│  │  ☑ (Optional) Preserve modification time via filetime copy           │    │
│  │                                                                       │    │
│  │  Note: Permissions, owner, ACL are OS-dependent.                     │    │
│  │  Best effort: copy what we can, warn on failure.                     │    │
│  │  These are NOT critical for data integrity.                          │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                                │
│  If metadata verification fails (non-critical):                                │
│    → Log warning but continue                                                  │
│    → Set warning flag in journal                                               │
│                                                                                │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: DELETE SOURCE (Cross-Drive Only)                                     │
│                                                                                │
│  journal.status = 'deleting'                                                     │
│                                                                                │
│  STRATEGY: Trash-first, never permanent delete immediately.                    │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  1. Attempt: Move source to OS Trash/Recycle Bin                    │    │
│  │     → trash::delete(source_path)                                    │    │
│  │     → If success: journal.original_path = trash_path                │    │
│  │     → Source is now safely in trash, can be restored                │    │
│  │                                                                       │    │
│  │  2. Fallback: If trash fails (permission, no trash on Linux):        │    │
│  │     → Move source to PETABYTE_TEMP_DIR / .petabyte_recovery/         │    │
│  │     → This is a hidden recovery directory                            │    │
│  │     → journal.original_path = recovery_path                          │    │
│  │                                                                       │    │
│  │  3. Last resort: If move fails (cross-device):                       │    │
│  │     → Copy source to recovery, then delete original                  │    │
│  │     → journal.original_path = recovery_path                          │    │
│  │                                                                       │    │
│  │  4. If ALL deletion methods fail (permission locked etc):            │    │
│  │     → journal.status = 'completed_with_warning'                      │    │
│  │     → Report to user: "File moved successfully.                       │    │
│  │        Source could not be deleted automatically."                   │    │
│  │     → User can manually delete later                                 │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                                │
│  ╔══════════════════════════════════════════════════════════════════════╗     │
│  ║  DATA SAFETY: Source is NEVER permanently deleted immediately.       ║     │
│  ║  It goes to Trash or recovery first. User can empty trash later.     ║     │
│  ║  This gives a window for undo even after "completion".              ║     │
│  ╚══════════════════════════════════════════════════════════════════════╝     │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: COMMIT SUCCESS                                                        │
│                                                                                │
│  Mark the operation as complete.                                               │
│                                                                                │
│  │  journal.status = 'completed'                                                │
│  │  journal.completed_at = now                                                  │
│  │                                                                              │
│  │  If this is part of a batch:                                                │
│  │    batch.completed_count += 1                                                │
│  │    if batch.completed_count == batch.total_count:                           │
│  │      batch.status = 'completed'                                             │
│  │      emit move:batch_complete { batch_id, summary }                         │
│  │                                                                              │
│  │  Emit move:file_complete {                                                  │
│  │      source, destination, file_size, duration,                              │
│  │      strategy: "same_drive" | "cross_drive",                               │
│  │      checksum_verified: true                                                │
│  │  }                                                                           │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  SAME-DRIVE SHORTCUT:                                                 │    │
│  │  Journal: pending → copying → verifying → deleting → completed       │    │
│  │  Same-drive:                                                          │    │
│  │  Journal: pending → completed                                         │    │
│  │  (rename() is atomic, no copy/verify needed)                          │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
OUTPUT: File at destination, source in trash/recovery
       operation_journal completed entry
       move:file_complete event emitted
```

---

## 4. Sequence Diagram — Single File Move

```
User/UI          MoveOrchestrator     PreValidator     StreamCopier      Verifier      TrashMgr     JournalDB
  │                    │                  │                │                │             │             │
  │ invoke_move()      │                  │                │                │             │             │
  │───────────────────>│                  │                │                │             │             │
  │                    │     Phase 0      │                │                │             │             │
  │                    │──────────────────────────────────────────────────────────────> INSERT      │
  │                    │                  │                │                │             │  (pending)  │
  │                    │                  │                │                │             │             │
  │                    │     Phase 1      │                │                │             │             │
  │                    │─────────────────>│                │                │             │             │
  │                    │                  │── stat(src) ──>│                │             │             │
  │                    │                  │<── metadata ───│                │             │             │
  │                    │                  │── stat(dst) ──>│                │             │             │
  │                    │                  │── space_ck ───>│                │             │             │
  │                    │                  │── perm_ck ────>│                │             │             │
  │                    │                  │── hash(src) ──>│                │             │             │
  │                    │                  │<── checksum ───│                │             │             │
  │                    │                  │                │                │             │             │
  │                    │<── validated ────│                │                │             │             │
  │                    │                  │                │                │             │             │
  │                    │  if same_drive: │                │                │             │             │
  │                    │  ─── rename ────>│                │                │             │             │
  │                    │    skip Phase 2-4                │                │             │             │
  │                    │                  │                │                │             │             │
  │                    │  Phase 2 (cross):│                │                │             │             │
  │                    │─────────────────────────────────>│                │             │             │
  │                    │                  │                │── open(src) ──>│             │             │
  │                    │                  │                │── open(dst) ──>│             │             │
  │                    │                  │                │                │             │             │
  │                    │                  │                │  Loop: read 64KB               │             │
  │                    │                  │                │  ┌─────────────────────┐        │             │
  │                    │                  │                │  │ blake3.update()     │        │             │
  │                    │                  │                │  │ dest.write()        │        │             │
  │                    │                  │                │  │ progress.emit()     │        │             │
  │                    │                  │                │  │ check_cancel()      │        │             │
  │                    │                  │                │  └─────────────────────┘        │             │
  │ progress event ───────────────────────────────────────────── emit("move:progress")      │             │
  │                    │                  │                │                │             │             │
  │                    │                  │                │── close(dst) ─>│             │             │
  │                    │                  │                │<── hash(dst) ──│             │             │
  │                    │                  │                │                │             │             │
  │                    │     Phase 3      │                │                │             │             │
  │                    │─────────────────────────────────────────────────>│             │             │
  │                    │                  │                │                │── compare ──>│             │
  │                    │                  │                │                │  hashes      │             │
  │                    │                  │                │                │             │             │
  │                    │                  │                │  if MISMATCH:  │             │             │
  │                    │                  │                │  ── delete dst ─>│             │             │
  │                    │                  │                │  ── FAIL ──────>│             │             │
  │                    │                  │                │                │             │             │
  │                    │                  │                │  if MATCH:     │             │             │
  │                    │<── verified ─────│                │<── OK ────────│             │             │
  │                    │                  │                │                │             │             │
  │                    │     Phase 4      │                │                │             │             │
  │                    │────────────────────────────────────────────────────────────>     │             │
  │                    │                  │                │                │             │── verify     │
  │                    │                  │                │                │             │  metadata    │
  │                    │<── meta_ok ──────│                │                │             │── OK ───────>│
  │                    │                  │                │                │             │             │
  │                    │     Phase 5      │                │                │             │             │
  │                    │───────────────────────────────────────────────────────────────>│             │
  │                    │                  │                │                │             │── trash(src) │
  │                    │                  │                │                │             │  or          │
  │                    │                  │                │                │             │── move_recovery
  │                    │                  │                │                │             │── OK ───────>│
  │                    │<── source_gone ──│                │                │             │             │
  │                    │                  │                │                │             │             │
  │                    │     Phase 6      │                │                │             │             │
  │                    │──────────────────────────────────────────────────────────────> UPDATE      │
  │                    │                  │                │                │             │  completed  │
  │                    │                  │                │                │             │             │
  │ complete event ────────────────────────────────────────── emit("move:file_complete")             │
  │<── return ────────│                  │                │                │             │             │
```

---

## 5. Component Architecture

### 5.1 Crate Structure

```
petabyte-smart-move/
│
├── src/
│   ├── lib.rs                        # FileOpPort trait implementation
│   │                                  # Facade: MoveOrchestrator
│   │
│   ├── orchestrator.rs               # MoveOrchestrator
│   │   # - Entry point: execute_move(request, cancel_token, emitter)
│   │   # - Coordinates 6-phase pipeline
│   │   # - Manages batch lifecycle
│   │   # - Determines strategy (same-drive vs cross-drive)
│   │
│   ├── pipeline/
│   │   ├── mod.rs
│   │   ├── phase1_validator.rs       # Pre-validation checks
│   │   ├── phase2_copier.rs          # Stream copy with integrated checksum
│   │   ├── phase3_checksum.rs        # Checksum comparison
│   │   ├── phase4_metadata.rs        # Metadata verification
│   │   ├── phase5_deleter.rs         # Safe source deletion
│   │   └── phase6_committer.rs       # Finalize and commit
│   │
│   ├── journal/
│   │   ├── mod.rs
│   │   ├── journal_manager.rs        # CRUD for operation_journal table
│   │   ├── journal_entry.rs          # Journal entry data structure
│   │   └── journal_cleaner.rs        # Cleanup old journals, recovery trash
│   │
│   ├── recovery/
│   │   ├── mod.rs
│   │   ├── crash_recovery.rs         # Startup recovery scan
│   │   ├── resume_manager.rs         # Resume interrupted operations
│   │   └── rollback_engine.rs        # Reverse operations in LIFO order
│   │
│   ├── io/
│   │   ├── mod.rs
│   │   ├── stream_copier.rs          # Buffered copy with progress
│   │   ├── safe_deleter.rs           # Trash-first + fallback
│   │   ├── lock_checker.rs           # Windows: check file locking
│   │   ├── permission_helper.rs      # Cross-platform permission handling
│   │   └── temp_recovery.rs          # .petabyte_recovery/ directory
│   │
│   ├── batch/
│   │   ├── mod.rs
│   │   ├── batch_executor.rs         # Execute batch of moves
│   │   ├── batch_validator.rs        # Pre-validate entire batch
│   │   └── batch_planner.rs          # Optimize order (same-drive first)
│   │
│   ├── state/
│   │   ├── mod.rs
│   │   ├── progress.rs               # Per-file + global progress
│   │   └── cancellable.rs            # Cancel token wrapper
│   │
│   ├── config.rs                     # MoveConfig
│   └── error.rs                      # MoveError, MoveResult
```

### 5.2 Key Data Structures

```rust
// ── Request ──
pub struct MoveRequest {
    pub batch_id: Uuid,
    pub operations: Vec<SingleMoveRequest>,
    pub config: MoveConfig,
}

pub struct SingleMoveRequest {
    pub source: PathBuf,
    pub destination: PathBuf,
    pub overwrite: bool,
    pub preserve_metadata: bool,
}

pub struct MoveConfig {
    pub buffer_size: usize,            // default: 65536 (64KB)
    pub copy_chunk_size: usize,        // default: 65536
    pub verify_checksum: bool,         // default: true
    pub preserve_modified_time: bool,  // default: true
    pub trash_source: bool,            // default: true
    pub max_retries: u32,              // default: 3
    pub concurrent_copies: usize,      // default: 2 (cross-drive IO bound)
}

// ── Journal ──
pub struct MoveJournalEntry {
    pub id: String,                    // UUID
    pub batch_id: Option<String>,      // UUID
    pub operation_type: MoveOpType,    // 'move', 'trash', 'delete', 'restore'
    pub source_path: String,
    pub destination_path: Option<String>,
    pub original_path: Option<String>, // Trash/recovery location for undo
    pub file_size: Option<u64>,
    pub checksum_before: Option<String>, // Blake3 of source before move
    pub checksum_after: Option<String>,  // Blake3 of dest after copy
    pub status: JournalStatus,
    pub phase: JournalPhase,           // Which phase was active
    pub created_at: String,
    pub completed_at: Option<String>,
    pub undone_at: Option<String>,
    pub error_message: Option<String>,
    pub undo_stack_order: i64,
    pub retry_count: u32,
}

pub enum JournalStatus {
    Pending,
    Copying,
    Verifying,
    Deleting,
    Completed,
    CompletedWithWarning,
    Failed,
    Cancelled,
    Undone,
}

pub enum JournalPhase {
    JournalCreated,
    Validated,
    CopyComplete,
    VerificationComplete,
    MetadataVerified,
    SourceDeleted,
    Committed,
}

// ── Progress ──
pub struct MoveProgress {
    pub batch_id: Uuid,
    pub phase: MovePhase,
    pub total_operations: u64,
    pub completed_operations: u64,
    pub failed_operations: u64,
    pub current_file: Option<String>,
    pub current_file_progress: Option<FileProgress>,  // for large files
    pub total_bytes_to_copy: u64,
    pub bytes_copied: u64,
    pub bytes_per_second: f64,
    pub elapsed: Duration,
    pub eta: Option<Duration>,
}

pub struct FileProgress {
    pub bytes_copied: u64,
    pub total_bytes: u64,
    pub percent: f64,
}

// ── Result ──
pub struct MoveSummary {
    pub batch_id: Uuid,
    pub total: u64,
    pub succeeded: u64,
    pub failed: u64,
    pub skipped: u64,
    pub total_bytes_moved: u64,
    pub duration: Duration,
    pub errors: Vec<MoveError>,
}
```

---

## 6. Strategy: Same-Drive vs Cross-Drive

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STRATEGY DETERMINATION                                     │
│                                                                              │
│  Is source volume == destination volume?                                     │
│       │                        │                                             │
│       YES                      NO                                             │
│       │                        │                                             │
│       ▼                        ▼                                             │
│  ┌──────────────┐       ┌──────────────┐                                    │
│  │  SAME-DRIVE  │       │ CROSS-DRIVE  │                                    │
│  │  STRATEGY    │       │  STRATEGY    │                                    │
│  └──────┬───────┘       └──────┬───────┘                                    │
│         │                      │                                              │
│         ▼                      ▼                                              │
│  ┌──────────────────┐   ┌──────────────────────────────────────────────┐    │
│  │ rename()         │   │ 1. Copy (stream + checksum)                  │    │
│  │                  │   │ 2. Verify checksum                           │    │
│  │ Atomic operation │   │ 3. Verify metadata                           │    │
│  │                  │   │ 4. Trash source                              │    │
│  │ O(1) regardless  │   │ 5. Commit journal                            │    │
│  │ of file size     │   │                                              │    │
│  │                  │   │ O(n) proportional to file size               │    │
│  │ No checksum      │   │                                              │    │
│  │ needed (kernel   │   │ Checksum ALWAYS computed                     │    │
│  │ guarantees)      │   │                                              │    │
│  └──────────────────┘   └──────────────────────────────────────────────┘    │
│                                                                              │
│  Edge case: overwrite on same-drive                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  If destination exists AND overwrite=true AND same-volume:            │   │
│  │  1. Move destination to temp recovery path                           │   │
│  │  2. Rename source → destination                                      │   │
│  │  3. If rename succeeds: delete temp recovery                         │   │
│  │  4. If rename fails: move destination back from recovery             │   │
│  │  5. Journal tracks temp recovery path for undo                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Rollback & Undo Strategy

### 7.1 Rollback Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROLLBACK FLOW                                        │
│                                                                              │
│  User clicks "Undo" for a completed move operation                          │
│       │                                                                      │
│       ▼                                                                      │
│  Query journal for operation:                                                │
│    SELECT * FROM operation_journal WHERE batch_id = ?                        │
│    ORDER BY undo_stack_order DESC                                            │
│       │                                                                      │
│       ▼                                                                      │
│  For each journal entry (LIFO):                                              │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  CASE operation_type:                                                 │   │
│  │                                                                        │   │
│  │  'move' (same-drive):                                                 │   │
│  │    1. Validate destination exists                                     │   │
│  │    2. Check original_path (was destination overwritten?)              │   │
│  │    3. If original_path exists → restore it (it was overwritten)      │   │
│  │       Else → rename destination back to source                        │   │
│  │    4. Mark journal: status = 'undone', undone_at = now               │   │
│  │                                                                        │   │
│  │  'move' (cross-drive):                                                │   │
│  │    1. Validate source might or might not exist (in trash)             │   │
│  │    2. If source in trash → restore from trash                         │   │
│  │    3. If source in recovery → restore from recovery                   │   │
│  │    4. If source gone already → copy destination back to source        │   │
│  │    5. Delete destination (if undo is complete)                        │   │
│  │    6. Mark journal: status = 'undone'                                 │   │
│  │                                                                        │   │
│  │  'trash':                                                              │   │
│  │    1. Restore from trash using original path                          │   │
│  │    2. Mark journal: status = 'undone'                                 │   │
│  │                                                                        │   │
│  │  'delete' (permanent):                                                │   │
│  │    ⚠ Cannot undo permanent delete                                     │   │
│  │    → Report to user: "Cannot undo permanent deletion"                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  Emit move:batch_undone { batch_id, undone_count, failed_count }            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Undo Stack Order

```
Each operation gets an incrementing undo_stack_order:
  - First operation in batch: order = 1
  - Second: order = 2
  - ...

Undo reverses in DESCENDING order (LIFO — Last In, First Out):
  - Undo operation with order = N first
  - Then order = N-1
  - ...
  - Finally order = 1

This ensures:
  - If operation B created a directory that operation A placed a file in,
    undoing B before A would leave a dangling file
  - LIFO guarantees dependencies are respected
```

### 7.3 Rollback Safety

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Rollback uses the SAME journal-first safety model as move:                  │
│                                                                              │
│  1. INSERT journal entry: status='pending', type='restore'                  │
│  2. Execute restore operation                                                │
│  3. UPDATE original journal: status='undone'                                │
│  4. UPDATE restore journal: status='completed'                              │
│                                                                              │
│  If crash during rollback:                                                   │
│  → Recovery scans for 'pending' restore operations                          │
│  → Can resume or detect partial undo                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Crash Recovery Strategy

### 8.1 Startup Recovery Scan

```
On application startup:
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Scan operation_journal for incomplete entries:                              │
│                                                                              │
│  SELECT * FROM operation_journal                                             │
│  WHERE status IN ('pending', 'copying', 'verifying', 'deleting')            │
│  ORDER BY created_at ASC                                                     │
│                                                                              │
│  For each incomplete entry:                                                  │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Recovery Decision Matrix:                                             │   │
│  │                                                                        │   │
│  │  src_exists  dst_exists    phase           action                      │   │
│  │  ──────────  ──────────    ─────────────   ──────────────────────────  │   │
│  │  TRUE        TRUE          pending         checksum(dst)==src? →      │   │
│  │                                              YES: completed, no action  │   │
│  │                                              NO: delete dst, mark fail │   │
│  │                                                                        │   │
│  │  TRUE        PARTIAL       copying         delete dst, mark failed    │   │
│  │              (size < expected)              (source untouched)          │   │
│  │                                                                        │   │
│  │  TRUE        TRUE          verifying       checksum(dst)==src? →      │   │
│  │                                              YES: go to deleting       │   │
│  │                                              NO: delete dst, mark fail  │   │
│  │                                                                        │   │
│  │  TRUE        FALSE         deleting        src still exists →         │   │
│  │                                              retry delete               │   │
│  │                                              if can't: mark warning    │   │
│  │                                                                        │   │
│  │  FALSE       TRUE          deleting        dest complete → mark       │   │
│  │                                              completed (src was        │   │
│  │                                              deleted before crash)     │   │
│  │                                                                        │   │
│  │  FALSE       FALSE         deleting        CRITICAL: src gone,         │   │
│  │                                              dest missing              │   │
│  │                                              → check recovery path     │   │
│  │                                              → if found: restore       │   │
│  │                                              → else: mark data_loss    │   │
│  │                                                                        │   │
│  │   TRUE       TRUE          completed       no action (idempotent)     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  For each unresolved entry:                                                  │
│    → Emit move:recovery_alert { source, dest, status, recommended_action }  │
│    → User is notified: "N incomplete operations found from previous         │
│       session. Review and confirm recovery actions."                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Data Loss Prevention Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      DATA AT RISK MATRIX                                        │
├──────────────┬──────────┬──────────┬────────────────────────────────────────────┤
│  TIME        │ SOURCE   │ DEST     │ ACTION IF CRASH                            │
├──────────────┼──────────┼──────────┼────────────────────────────────────────────┤
│ Before move  │ EXISTS   │ —        │ No crash possible (not started)            │
│ Journal done │ EXISTS   │ —        │ No action needed (journal cleanup)         │
│ Validated    │ EXISTS   │ —        │ No action needed (journal cleanup)         │
│ Copy started │ EXISTS   │ PARTIAL  │ Delete partial dest, retry                 │
│ Copy done    │ EXISTS   │ EXISTS   │ Proceed to verify                         │
│ Verify start │ EXISTS   │ EXISTS   │ Re-verify, proceed or retry               │
│ Verify OK    │ EXISTS   │ EXISTS   │ Proceed to delete                         │
│ Delete start │ EXISTS   │ EXISTS   │ Retry delete                              │
│ Delete done  │ IN TRASH │ EXISTS   │ Mark complete (source recoverable)         │
│ Commit done  │ IN TRASH │ EXISTS   │ ✅ DATA SAFE — operation complete         │
│              │          │          │ Source in trash, can be restored           │
├──────────────┴──────────┴──────────┴────────────────────────────────────────────┤
│                                                                                  │
│  DATA LOSS CANNOT HAPPEN because:                                                │
│  1. Source is NEVER deleted before dest is fully verified                        │
│  2. Source is ALWAYS moved to trash/recovery, never permanently deleted         │
│  3. Journal is written BEFORE any file operation begins                         │
│  4. All operations are idempotent or safely retryable                           │
│                                                                                  │
│  Worst case: Source and dest both exist (duplicate)                             │
│  Best case: Source in trash, dest exists (clean operation)                     │
│  Impossible: Source gone AND dest missing (unless disk failure)                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Resume Strategy

### 9.1 Resume Scenarios

| Scenario | What Happened | Resume Action |
|----------|--------------|---------------|
| App crash during copy | Partial dest file exists | Delete partial dest, restart from Phase 2 |
| App crash during verify | Dest exists, checksum not recorded | Re-verify, proceed |
| App crash during delete | Source still exists | Retry delete (Phase 5) |
| User cancelled during copy | Dest deleted on cancel | None (operation fully cancelled) |
| User cancelled during verify | Dest exists, not deleted | Ask user: "Delete partial or resume?" |
| Power outage | All of the above | Recovery scan on startup |

### 9.2 Resume Behavior

```
User re-opens app after crash/cancel during move:
       │
       ▼
  ┌──────────────────────────────────────────┐
  │  "3 incomplete move operations found."    │
  │                                           │
  │  [Resume All]  [Review Each]  [Discard]  │
  └──────────────────────────────────────────┘
       │
       ▼
  Resume:
    → Load failed/cancelled batch
    → Re-validate all remaining operations
    → Re-run Phase 2-6 for each
    → Operations already completed in DB are skipped (idempotent)
    → Emit progress as normal
```

---

## 10. Progress Tracking

### 10.1 Event Stream

| Event | Frequency | Payload |
|-------|-----------|---------|
| `move:batch_starting` | Once | `{ batch_id, total_operations, total_bytes }` |
| `move:file_starting` | Per file | `{ source, destination, file_size, strategy }` |
| `move:progress` | Every 100ms | `{ batch_id, completed, total, current_file, bytes_copied, bytes_total, fps, eta }` |
| `move:file_complete` | Per file | `{ source, dest, file_size, duration, checksum, status }` |
| `move:file_failed` | Per file | `{ source, dest, error, phase, retries }` |
| `move:batch_complete` | Once | `{ batch_id, summary }` |
| `move:batch_cancelled` | Once | `{ batch_id, summary }` |
| `move:recovery_needed` | On crash recovery | `{ operations_count, details }` |

### 10.2 Progress Calculation

```

For batch (multi-file):
  progress_percent = completed_operations / total_operations
  bytes_per_second = EMA(bytes_copied_this_interval / interval_secs)
  remaining_bytes = total_bytes - bytes_copied
  eta_secs = remaining_bytes / bytes_per_second

For individual large file:
  file_progress = bytes_copied / total_file_bytes
  (displayed alongside overall batch progress)
```

---

## 11. Multi-Threading Strategy

### 11.1 Thread Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SMART MOVE THREAD MODEL                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    MAIN / ORCHESTRATOR THREAD                            ││
│  │                                                                          ││
│  │  - Validates batch                                                      ││
│  │  - Plans operation order (same-drive first)                             ││
│  │  - Dispatches operations to worker pool                                 ││
│  │  - Collects results                                                     ││
│  │  - Manages rollback                                                     ││
│  └─────────────────────┬───────────────────────────────────────────────────┘│
│                        │                                                    │
│                        │ dispatch file move                                 │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    WORKER THREAD POOL                                    ││
│  │  (rayon, limited concurrency for cross-drive)                           ││
│  │                                                                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  ││
│  │  │  Worker 1    │  │  Worker 2    │  │  Worker 3    │                  ││
│  │  │              │  │              │  │              │                  ││
│  │  │ Executes     │  │ Executes     │  │ Executes     │                  ││
│  │  │ 6-phase      │  │ 6-phase      │  │ 6-phase      │                  ││
│  │  │ pipeline     │  │ pipeline     │  │ pipeline     │                  ││
│  │  │ for ONE file │  │ for ONE file │  │ for ONE file │                  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  ││
│  │                                                                          ││
│  │  Concurrency limits:                                                     ││
│  │  - Same-drive: N = 8 (rename is instant, no I/O)                       ││
│  │  - Cross-drive (SSD): N = 2-4 (I/O bound, many threads thrash)         ││
│  │  - Cross-drive (HDD): N = 1 (seek kills performance)                    ││
│  └──────────────────────────┬──────────────────────────────────────────────┘│
│                             │                                               │
│                             │ channel                                        │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    SINGLE WRITER (Journal + Events)                     ││
│  │                                                                          ││
│  │  - All journal writes serialized via channel                            ││
│  │  - Journal writes are synchronous (sequential)                          ││
│  │  - Events emitted on tokio task                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Concurrency Limits

```
Same-drive moves: High concurrency (8+)
  - rename() is instant, filesystem handles concurrency
  - No I/O bottleneck

Cross-drive moves: Low concurrency (1-4)
  - I/O bound (read source + write destination)
  - Too many threads = disk thrashing = lower throughput
  - SSD: 2-4 concurrent (test sweet spot)
  - HDD: 1 concurrent (seeks dominate)
  - Use adaptive throttle based on measured throughput
```

---

## 12. Error Handling

### 12.1 Error Classification

| Error | Phase | Action | Auto-Retry |
|-------|-------|--------|------------|
| Source not found | Pre-validate | Skip file, report error | No |
| Permission denied (source) | Pre-validate | Skip file, report error | No |
| Permission denied (dest) | Copy | Retry with escalation | Yes (3x) |
| Disk full | Copy | Pause batch, emit alert | No |
| File locked by another process | Copy | Skip, report warning | Yes (3x, with backoff) |
| I/O error (transient) | Copy | Retry with backoff | Yes (3x) |
| Checksum mismatch | Verify | Retry copy | Yes (3x) |
| Destination path too long | Pre-validate | Skip, report error | No |
| Cross-device link (rename fails) | Strategy | Fallback to cross-drive | Auto |
| Trash unavailable | Delete source | Fallback to recovery dir | Auto |
| Source in use (delete) | Delete source | Retry, then warn | Yes (3x) |

### 12.2 Locked File Handling (Windows)

```
Attempt to open source file:
       │
       ├── Success → proceed normally
       │
       └── ERROR_SHARING_VIOLATION (file locked)
            │
            ├── Check lock type:
            │   - Reader lock → can still read for copy
            │   - Writer lock → cannot read
            │
            ├── If can read:
            │   → Copy file (read-only access)
            │   → Warn: "Source copied but could not be deleted.
            │      File is in use by: process_name.exe"
            │
            └── If cannot read:
                → Skip file
                → Report: "Cannot copy: file is locked by process_name.exe"
                → Suggest: "Close the application and try again"
```

### 12.3 Permission Escalation

```
Permission denied (destination):
       │
       ├── If not admin:
       │    → Show UAC dialog via Tauri shell command
       │    → Retry with elevated permissions
       │    → If user declines: skip file
       │
       └── If already admin:
            → Take ownership (Windows: takeown)
            → Grant self permission (icacls)
            → Retry operation
            → Log escalation for audit
```

---

## 13. Batching Strategy

### 13.1 Batch Execution Plan

```
Input: List of { source, destination } pairs

Step 1: PRE-VALIDATE ALL — fail fast
  ┌──────────────────────────────────────────┐
  │  For each operation:                      │
  │    - Check source exists                  │
  │    - Check parent dest exists or creatable│
  │    - Check disk space (aggregate total)  │
  │    - Determine strategy (same/cross)     │
  │  Aggregate results:                       │
  │    - Valid: 950                           │
  │    - Failed validation: 50                │
  │    → Report all 50 errors at once         │
  └──────────────────────────────────────────┘

Step 2: ORDER operations
  ┌──────────────────────────────────────────┐
  │  1. Same-drive moves first (fast, safe)   │
  │  2. Small cross-drive files (< 10MB)     │
  │  3. Medium cross-drive files (10MB-1GB)  │
  │  4. Large cross-drive files (> 1GB)      │
  │  Rationale: quick wins → user sees       │
  │  progress immediately                    │
  └──────────────────────────────────────────┘

Step 3: EXECUTE with concurrency
  ┌──────────────────────────────────────────┐
  │  Dispatch to worker pool:                 │
  │  - Same-drive: 8 concurrent              │
  │  - Cross-drive: 2 concurrent             │
  │  - Progress tracked per-file, per-batch  │
  └──────────────────────────────────────────┘

Step 4: REPORT summary
  ┌──────────────────────────────────────────┐
  │  Total: 1000                             │
  │  Succeeded: 980                          │
  │  Failed: 20                              │
  │  Skipped: 0                              │
  │  Duration: 5m 32s                        │
  │  Errors: [list of 20 with details]      │
  └──────────────────────────────────────────┘
```

### 13.2 Disk Space Check

```
For batch operations, pre-check disk space:

total_bytes_to_copy = SUM(file_size for cross-drive operations)
required_space = total_bytes_to_copy × 1.1  (10% safety margin)

if destination.free_space < required_space:
    → Report: "Insufficient space. Need X, have Y."
    → Suggest: "Free up space or select fewer files."
    → Option: Continue with files that fit, skip rest
```

---

## 14. Logging Strategy

### 14.1 Log Events

```
INFO  [move] Batch started            | batch_id=xxx files=1000 total_size=1.2TB
INFO  [move] Pre-validation           | passed=995 failed=5
WARN  [move] Validation error         | file=secret.docx error=locked_by_winword.exe
INFO  [move] Strategy determined      | file=video.mp4 strategy=cross_drive
DEBUG [move] Copy progress            | file=video.mp4 bytes=500MB/5GB (10%)
DEBUG [move] Copy progress            | file=video.mp4 bytes=2.5GB/5GB (50%)
INFO  [move] Checksum verify          | file=video.mp4 MATCH (a1b2...)
INFO  [move] Delete source            | file=video.mp4 → trash
INFO  [move] File completed           | file=video.mp4 duration=32s
WARN  [move] Metadata warning         | file=readme.txt perm=src:644,dst:755
ERROR [move] File failed              | file=budget.xlsx error=disk_full
       │                              |   phase=copying retries=3
INFO  [move] Batch completed          | batch_id=xxx success=994 failed=3 skipped=3
INFO  [move] Rollback started         | batch_id=xxx operations=3
INFO  [move] Rollback completed       | batch_id=xxx success=3 failed=0
```

### 14.2 Journal Table

```sql
-- Core table (already defined in data model)
CREATE TABLE operation_journal (
    id                TEXT    PRIMARY KEY,     -- UUID v4
    batch_id          TEXT,                     -- UUID, groups operations
    scan_session_id   INTEGER REFERENCES scan_sessions(id),
    operation_type    TEXT    NOT NULL CHECK (...),
    source_path       TEXT    NOT NULL,
    destination_path  TEXT,
    original_path     TEXT,                    -- trash/recovery path
    file_size         INTEGER,
    checksum_before   TEXT,                    -- Blake3 hex
    checksum_after    TEXT,                    -- Blake3 hex
    phase             TEXT,                    -- which phase was active
    status            TEXT    NOT NULL DEFAULT 'pending',
    retry_count       INTEGER DEFAULT 0,
    created_at        TEXT    NOT NULL,
    completed_at      TEXT,
    undone_at         TEXT,
    error_message     TEXT,
    undo_stack_order  INTEGER
);
```

---

## 15. Performance Analysis

### 15.1 Bottleneck Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BOTTLENECK HEAT MAP                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1 (Pre-validate):                                                    │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% I/O (file metadata only, cached)      │
│    ██████░░░░░░░░░░░░░░░░░░░░░░  20% CPU (stat, checksum compute)           │
│                                                                              │
│  PHASE 2 (Copy) — CROSS-DRIVE:                                              │
│    ████████████████████████████  100% I/O (read source + write dest)        │
│    ████████░░░░░░░░░░░░░░░░░░░░  25% CPU (Blake3 while streaming)           │
│    ⚠ PRIMARY BOTTLENECK ⚠                                                   │
│    → Throughput = MIN(source_read_speed, dest_write_speed)                  │
│    → Same disk R+W: ~50% of sequential read speed                          │
│    → Different disks: ~100% of slower disk                                  │
│                                                                              │
│  PHASE 3 (Verify):                                                          │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% I/O (hashes already computed)         │
│    ██░░░░░░░░░░░░░░░░░░░░░░░░░░   5% CPU (string comparison)                │
│                                                                              │
│  PHASE 4 (Metadata):                                                        │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% I/O                                   │
│    ██░░░░░░░░░░░░░░░░░░░░░░░░░░   5% CPU (stat)                             │
│                                                                              │
│  PHASE 5 (Delete):                                                          │
│    ████░░░░░░░░░░░░░░░░░░░░░░░░  15% I/O (trash move)                      │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% CPU                                    │
│                                                                              │
│  PHASE 6 (Commit):                                                          │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% I/O                                   │
│    ██░░░░░░░░░░░░░░░░░░░░░░░░░░   5% CPU (SQLite)                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.2 Estimated Throughput

```
Same-drive (rename):
  - Unlimited (instant, filesystem-level)
  - 10,000 files/sec+ (bounded by metadata operation rate)

Cross-drive, same physical disk:
  - Read 50MB/s + Write 50MB/s (head contention)
  - Effective throughput: ~50MB/s
  - 1GB file: ~20 seconds
  - 1000 × 10MB files: ~3.5 minutes (with 2 workers)

Cross-drive, different physical disks:
  - Read 500MB/s (SSD) + Write 500MB/s (SSD)
  - Effective throughput: ~500MB/s
  - 1GB file: ~2 seconds
  - 1000 × 10MB files: ~20 seconds (with 2 workers)
```

---

## 16. Risk Analysis

| Risk | Probability | Impact | Severity | Mitigation |
|------|------------|--------|----------|------------|
| **Power outage mid-copy** | Medium | Medium | **MEDIUM** | Partial dest → recovery deletes it. Source untouched. |
| **Power outage mid-delete** | Low | Low | **LOW** | Source in trash or recovery. Recoverable. |
| **Disk full during copy** | Medium | High | **HIGH** | Pre-check space ×1.1. Check during copy. Pause batch. |
| **Source file deleted externally during copy** | Low | Low | **LOW** | Copy fails, report error. Dest might be partial → delete. |
| **Source file modified during copy** | Low | Low | **LOW** | Checksum mismatch → retry up to 3x. Skip if still mismatch. |
| **Trash unavailable (permissions, no trash bin)** | Medium | Low | **LOW** | Fallback to `.petabyte_recovery/` directory. |
| **Recovery directory fills disk** | Low | Medium | **MEDIUM** | Limit recovery size. Auto-purge old items. Warn user. |
| **Batch undo of 10K files interrupted** | Low | Medium | **MEDIUM** | Same journal-safety. Undo is also journaled. |
| **Cross-drive race condition (same file moved twice)** | Low | High | **HIGH** | Lock file per operation. Atomic check in journal. |
| **User moves file while app is also moving it** | Low | Medium | **MEDIUM** | Check file existence before each phase. Handle gracefully. |
| **Extremely long path (>260 chars on Windows)** | Medium | Low | **LOW** | Use `\\?\` prefix. Warn in pre-validation. |
| **SSD wear from excessive writes** | Low | Low | **LOW** | Single move is one write regardless. |

---

## 17. Failure Recovery Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE FAILURE RECOVERY PLAN                            │
│                                                                              │
│  SCENARIO 1: App crash during copy                                          │
│  ─────────────────────────────────────                                       │
│  State:  Journal = { status: "copying" }                                    │
│          Source exists, dest file partial                                    │
│  Recovery:                                                                   │
│    1. Read journal entry → detect "copying" phase                          │
│    2. Stat dest file → size < expected → partial                           │
│    3. Delete dest file                                                       │
│    4. Mark journal: status = "failed", error = "incomplete copy"           │
│    5. ✅ Source untouched, no data loss                                     │
│                                                                              │
│  SCENARIO 2: Power outage during checksum verification                      │
│  ────────────────────────────────────────────────                            │
│  State:  Journal = { status: "verifying" }                                  │
│          Source exists, dest exists                                          │
│  Recovery:                                                                   │
│    1. Read journal entry → detect "verifying" phase                        │
│    2. Compute new checksum of dest                                           │
│    3. Compare with journal.checksum_before                                  │
│    4. If match: proceed to Phase 5 (delete source)                          │
│    5. If mismatch: delete dest, mark failed, source untouched              │
│    6. ✅ Source untouched, dest verified or removed                         │
│                                                                              │
│  SCENARIO 3: Crash immediately after source deletion                        │
│  ────────────────────────────────────────────────                            │
│  State:  Journal = { status: "deleting" }                                   │
│          Source may be in trash or gone, dest exists                         │
│  Recovery:                                                                   │
│    1. Check if source exists at original path                               │
│    2. Check if source exists in trash (recovery path in journal)            │
│    3. If source in trash: operation is effective complete                   │
│       → Mark journal: status = "completed"                                  │
│    4. If source still at original path: retry delete                        │
│    5. If source truly gone (deleted before crash, trash not available):     │
│       → Mark journal: status = "completed" (dest is valid)                  │
│    6. ✅ Dest exists, data is safe                                          │
│                                                                              │
│  SCENARIO 4: Power outage during journal write                              │
│  ───────────────────────────────────────────                                │
│  State:  Journal may not have been written yet                              │
│          No file operations started yet                                      │
│  Recovery:                                                                   │
│    1. No journal entry → no operation was started                          │
│    2. ✅ No data loss, operation never began                                │
│                                                                              │
│  SCENARIO 5: Database corruption                                             │
│  ──────────────────────────────                                              │
│  State:  Journal lost or corrupted                                           │
│          Files may have been partially moved                                 │
│  Recovery:                                                                   │
│    1. Detect corruption via PRAGMA integrity_check                          │
│    2. Attempt to restore from backup journal                                │
│    3. If cannot restore: manual recovery needed                             │
│    4. Scan file system for orphaned moves (files at dest but not in log)   │
│    5. Present findings to user for manual resolution                        │
│    6. ⚠ Potential data ambiguity — user must decide                        │
│                                                                              │
│  SCENARIO 6: Destination disk fails during copy                             │
│  ──────────────────────────────────────                                      │
│  State:  Dest disk hardware failure                                          │
│          Source still intact                                                  │
│  Recovery:                                                                   │
│    1. Copy fails with I/O error on write                                    │
│    2. Journal: status = "failed"                                             │
│    3. ✅ Source untouched                                                    │
│    4. User needs to replace disk before retrying                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 18. Summary (30 seconds)

| Aspek | Keputusan |
|-------|-----------|
| **Pipeline** | 6-phase: Journal → Validate → Copy → Checksum → Metadata → Delete → Commit |
| **Safety model** | **Journal-first WAL.** Journal written BEFORE any file operation. Source NEVER deleted before dest verified. |
| **Move strategy** | Same-drive: atomic `rename()` (instant). Cross-drive: copy + verify + trash source (I/O bound). |
| **Delete safety** | Trash-first → `.petabyte_recovery/` fallback → never permanent delete initially |
| **Checksum** | Blake3 computed INCREMENTALLY during copy (zero additional I/O). Verify is string comparison only. |
| **Rollback** | LIFO via `undo_stack_order`. Each undo is also journaled for crash safety. |
| **Crash recovery** | Startup scan of `operation_journal`. Decision matrix handles all phase+state combinations. |
| **Concurrency** | Same-drive: 8 workers. Cross-drive: 2 (SSD) / 1 (HDD). Journal writes serialized. |
| **Locked files** | Detect via OS, skip with warning if writer-locked, can still copy if reader-locked. |
| **Data loss guarantee** | **Impossible in normal operation.** Worst case: file exists at BOTH locations (duplicate). |
