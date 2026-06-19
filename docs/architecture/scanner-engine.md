# ⚙️ PetaByte — Scanner Engine Design

## 1. Architecture Overview

```
                         ┌──────────────────────────────────────────────────────────┐
                         │                    FRONTEND (React)                      │
                         │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
                         │  │ Dashboard │  │ Scanner  │  │ Progress Bar / Tree   │  │
                         │  │ (stats)   │  │ (config) │  │ (real-time updates)  │  │
                         │  └──────────┘  └──────────┘  └──────────────────────┘  │
                         └──────────────────────┬───────────────────────────────────┘
                                                │ Tauri IPC
                                                │ invoke("start_scan") / listen("scan:*")
                         ┌──────────────────────▼───────────────────────────────────┐
                         │              INTERFACE LAYER (petabyte-app)               │
                         │                                                           │
                         │  ┌────────────────────────────────────────────────────┐  │
                         │  │  scan_commands.rs                                  │  │
                         │  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │  │
                         │  │  │start_scan│  │pause_scan│  │resume_scan     │  │  │
                         │  │  │cancel_scan│ │get_status│  │get_checkpoints │  │  │
                         │  │  └──────────┘  └──────────┘  └────────────────┘  │  │
                         │  └──────────────────────┬─────────────────────────────┘  │
                         │                         │                               │
                         │  ┌──────────────────────▼─────────────────────────────┐  │
                         │  │  wiring.rs (Composition Root)                      │  │
                         │  │  Inject ScannerPort → ScanOrchestrator             │  │
                         │  └────────────────────────────────────────────────────┘  │
                         └──────────────────────┬───────────────────────────────────┘
                                                │ call
                         ┌──────────────────────▼───────────────────────────────────┐
                         │              SCANNER ENGINE (petabyte-scanner)           │
                         │                                                           │
                         │  ┌────────────────────────────────────────────────────┐  │
                         │  │              ScanOrchestrator                      │  │
                         │  │  - Manages pipeline lifecycle                      │  │
                         │  │  - Coordinates all stages                          │  │
                         │  │  - Handles pause/resume/cancel                     │  │
                         │  │  - Error recovery                                  │  │
                         │  └────┬──────┬──────┬──────┬──────┬──────────────────┘  │
                         │       │      │      │      │      │                     │
                         │       ▼      ▼      ▼      ▼      ▼                     │
                         │  ┌─────────────────────────────────────────────────┐    │
                         │  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │    │
                         │  │  │  Walker  │─>│  Filter  │─>│   Mapper     │ │    │
                         │  │  │ (jwalk)  │  │ (engine) │  │ (→FileEntry) │ │    │
                         │  │  └──────────┘  └──────────┘  └──────┬───────┘ │    │
                         │  │                                      │ mpsc    │    │
                         │  │  ┌───────────────────────────────────▼───────┐ │    │
                         │  │  │         BatchAccumulator                  │ │    │
                         │  │  │  (500 entries or 50ms timeout)           │ │    │
                         │  │  └───────────────────┬───────────────────────┘ │    │
                         │  │                      │                         │    │
                         │  │  ┌───────────────────▼───────────────────────┐ │    │
                         │  │  │             Persister                      │ │    │
                         │  │  │  (SQLite batch INSERT in transaction)     │ │    │
                         │  │  └───────────────────────────────────────────┘ │    │
                         │  └─────────────────────────────────────────────────┘    │
                         │                                                           │
                         │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
                         │  │ Progress │  │ Checkpt  │  │   EventEmitter       │  │
                         │  │ Tracker  │  │ Manager  │  │   (emit via Tauri)   │  │
                         │  └──────────┘  └──────────┘  └──────────────────────┘  │
                         └──────────────────────┬───────────────────────────────────┘
                                                │ implements
                         ┌──────────────────────▼───────────────────────────────────┐
                         │              DOMAIN PORTS (petabyte-shared-models)       │
                         │  ┌────────────────────────────────────────────────────┐  │
                         │  │  ScannerPort (trait)                               │  │
                         │  │  ProgressEmitter (trait)                           │  │
                         │  │  ScanRepository (trait)                            │  │
                         │  │  FileRepository (trait)                            │  │
                         │  └────────────────────────────────────────────────────┘  │
                         └──────────────────────┬───────────────────────────────────┘
                                                │
                         ┌──────────────────────▼───────────────────────────────────┐
                         │  petabyte-database (implements repositories)              │
                         │  petabyte-shared-models (entities, value objects)         │
                         │  petabyte-shared (errors, constants, utilities)           │
                         └───────────────────────────────────────────────────────────┘
```

---

## 2. Component Tree

```
petabyte-scanner/
│
├── orchestrator/
│   ├── ScanOrchestrator          # Pipeline lifecycle manager
│   ├── ScanConfig                # Immutable scan parameters
│   └── PipelineBuilder           # Builder pattern for pipeline construction
│
├── walker/
│   ├── ParallelWalker            # jwalk parallel traversal
│   ├── EntryMapper               # DirEntry → FileEntry conversion
│   └── FilterEngine              # Glob/regex exclusion rules
│
├── pipeline/
│   ├── BatchAccumulator          # Collect entries → batches
│   ├── Persister                 # Write batches → SQLite
│   └── PipelineBuilder           # Constructs the processing pipeline
│
├── state/
│   ├── ScanState                 # Shared atomic state (pause/cancel)
│   ├── ProgressTracker           # Files/bytes counted, ETA calculation
│   ├── CheckpointManager         # Save/load checkpoint for resume
│   └── ErrorCollector            # Collect non-fatal errors per file
│
├── events/
│   ├── ScanEvent                 # Enum of all event types
│   └── ScanEventEmitter          # Tauri event emission wrapper
│
├── config.rs                     # Default scan configurations
└── error.rs                      # ScanError, ScanResult
```

### 2.1 orchestrator/ScanOrchestrator

**Responsibilities:**
- Accept scan request with config
- Build pipeline via PipelineBuilder
- Create scan session in database
- Spawn pipeline on worker thread
- Handle pause/resume/cancel commands
- Coordinate post-scan: compute summaries, mark session complete
- Return session_id immediately (async scan)

**Lifecycle States:**

```
                ┌──────────┐
                │  IDLE    │
                └────┬─────┘
                     │ start_scan()
                     ▼
                ┌──────────┐         pause()       ┌──────────┐
                │ PENDING  │ ────────────────────>  │ PAUSED   │
                └────┬─────┘                       └────┬─────┘
                     │ start pipeline                    │ resume()
                     ▼                                  │
                ┌──────────┐                            │
           ┌───>│ SCANNING │<────────────────────────────┘
           │    └────┬─────┘
           │         │
           │         ├────────────────────┐
           │         │ cancel()           │ complete
           │         ▼                    ▼
           │   ┌──────────┐        ┌───────────┐
           │   │CANCELLED │        │ COMPLETED │
           │   └──────────┘        └───────────┘
           │
           └─── resume (new session, incremental)
```

### 2.2 walker/ParallelWalker

**Responsibilities:**
- Parallel directory traversal using `jwalk`
- Configurable thread count (default: num_cpus)
- Support for depth limits
- Skip hidden files (optional)
- Handle symlinks (configurable follow/ignore)
- Check pause/cancel flags between directory entries

**jwalk Configuration:**

| Parameter | Default | Notes |
|-----------|---------|-------|
| `parallelism` | `num_cpus::get()` | Thread pool size |
| `follow_links` | `false` | Follow symlinks (risk of cycles) |
| `skip_hidden` | `false` | Skip `.` prefixed on Unix |
| `max_depth` | `None` | Directory depth limit |
| `process_read_dir` | Custom filter | Skip excluded dirs before descending |

### 2.3 walker/FilterEngine

**Responsibilities:**
- Apply user exclusion patterns (glob)
- Skip system directories (`/proc`, `/sys`, `$Recycle.Bin`)
- Skip inaccessible paths (permission check)
- Pattern matching against file path
- Built-in exclude list + user custom excludes

**Filter pipeline:**

```
Entry → [Built-in excludes] → [User excludes] → [Permission check] → [Depth limit] → Accept
```

**Built-in system excludes (per platform):**

| Windows | Linux | macOS |
|---------|-------|-------|
| `C:\Windows\System32` | `/proc` | `/System` |
| `C:\Program Files` | `/sys` | `/private/var/vm` |
| `$Recycle.Bin` | `/dev` | `/.Spotlight-V100` |
| `System Volume Information` | `/run` | `/.fseventsd` |
| `$WinREAgent` | `/snap` | |
| `config.msi` | | |

### 2.4 pipeline/BatchAccumulator

**Responsibilities:**
- Receive `FileEntry` from channel (produced by walker)
- Accumulate until batch size threshold (500 entries)
- OR until time threshold (50ms since first entry in batch)
- Forward full batch to Persister
- Report batch readiness to ProgressTracker

**Batching strategy:**

```
Time:   ── entry ── entry ── entry ── ... ── entry ── entry ──
                   │                              │
              Accumulating                    Batch full
                   │                              │
                   ▼                              ▼
              Buffer (Vec<FileEntry>)         Send to
              cap: 500 entries                Persister
                                              via mpsc
```

### 2.5 pipeline/Persister

**Responsibilities:**
- Receive batches from accumulator
- Execute `BEGIN TRANSACTION` / batch INSERT / `COMMIT`
- Use prepared statements (compiled once, reused)
- Handle `INSERT OR IGNORE` for existing entries (resume mode)
- Report write confirmation back to accumulator (for flow control)
- Flush remaining batch on scan end

**SQLite write pattern:**

```
BEGIN IMMEDIATE TRANSACTION;
    INSERT INTO scan_entries (...) VALUES (...);  -- x500
    INSERT INTO scan_entries (...) VALUES (...);
    ...
COMMIT;
```

### 2.6 state/ScanState

**Responsibilities:**
- Central shared state accessible from all pipeline stages
- Thread-safe via atomics + Tokio primitives

```rust
// Pseudocode — data structure
pub struct ScanState {
    pub is_paused: AtomicBool,
    pub pause_notify: Notify,         // wakes paused threads on resume
    pub cancel_token: CancellationToken,
    pub metrics: ProgressTracker,     // Atomic counters
}
```

### 2.7 state/ProgressTracker

**Responsibilities:**
- Atomic counter for files processed
- Atomic counter for bytes processed
- Atomic counter for errors/skipped
- Files per second calculation (exponential moving average)
- ETA estimation

**Metrics tracked:**

| Metric | Type | Atomic |
|--------|------|--------|
| `files_processed` | `u64` | `AtomicU64` |
| `bytes_processed` | `u64` | `AtomicU64` |
| `directories_processed` | `u64` | `AtomicU64` |
| `files_skipped` | `u64` | `AtomicU64` |
| `errors_count` | `u64` | `AtomicU64` |
| `current_file_path` | `PathBuf` | `RwLock` |
| `started_at` | `Instant` | immutable after creation |
| `last_report_at` | `Instant` | `RwLock` |

**EMA Calculation:**

```
interval = now - last_report_time
current_fps = files_since_last_report / interval_secs
ema_fps = α × current_fps + (1 - α) × ema_fps    // α = 0.3

remaining_files = estimated_total - files_processed
eta_secs = remaining_files / ema_fps
```

### 2.8 state/CheckpointManager

**Responsibilities:**
- Periodically save scan progress to SQLite
- On resume, load checkpoint and determine start position
- Format: stores `last_committed_path`, `files_processed`, `session_id`

**Checkpoint frequency:** Every 10,000 files OR every 30 seconds (whichever first).

### 2.9 state/ErrorCollector

**Responsibilities:**
- Collect non-fatal errors (permission denied, broken symlinks, IO errors)
- Categorize by error type
- Report in final scan summary
- Don't fail the scan for individual file errors

### 2.10 events/ScanEventEmitter

**Responsibilities:**
- Wraps Tauri `AppHandle.emit()` behind `ProgressEmitter` trait
- Serializes event payloads to JSON
- Batches high-frequency events (throttle progress to every 100ms)

---

## 3. Data Flow — Sequence Diagram

```
User          React          Tauri Cmd      ScanOrchestrator      Walker/Filter/Mapper    BatchAccum    Persister     SQLite
 │              │               │                  │                     │                   │              │           │
 │  click scan  │               │                  │                     │                   │              │           │
 │─────────────>│               │                  │                     │                   │              │           │
 │              │ invoke()      │                  │                     │                   │              │           │
 │              │──────────────>│                  │                     │                   │              │           │
 │              │               │ start_scan()     │                     │                   │              │           │
 │              │               │─────────────────>│                     │                   │              │           │
 │              │               │                  │                     │                   │              │           │
 │              │               │                  │───┐                 │                   │              │           │
 │              │               │                  │   │ Validate config │                   │              │           │
 │              │               │                  │<──┘                 │                   │              │           │
 │              │               │                  │                     │                   │              │           │
 │              │               │                  │───┐                 │                   │              │           │
 │              │               │                  │   │ Create session  │                   │              │           │
 │              │               │                  │   │ in DB (status:  │                   │              │           │
 │              │               │                  │   │ scanning)       │                   │              │           │
 │              │               │                  │─────────────────────────────────────────────────────>│ INSERT   │
 │              │               │                  │                     │                   │              │ session  │
 │              │               │                  │<──┘                 │                   │              │           │
 │              │               │                  │                     │                   │              │           │
 │              │  return id    │                  │                     │                   │              │           │
 │              │<──────────────│                  │                     │                   │              │           │
 │              │               │                  │                     │                   │              │           │
 │  show UI     │               │                  │                                                     │           │
 │<─────────────│               │                  │  Spawn pipeline                                      │           │
 │              │               │                  │──────────────────────────────────────────────────────│           │
 │              │               │                  │  │                                                    │           │
 │              │               │                  │  │ spawn_blocking()                                   │           │
 │              │               │                  │  │                                                    │           │
 │              │               │                  │  │                                                    │           │
 │              │               │                  │  ▼  Pipeline starts in parallel                       │           │
 │              │               │                  │                                                     │           │
 │              │               │                  │  ┌─────────────────────────────────────────────┐     │           │
 │              │               │                  │  │  LOOP: for each directory entry             │     │           │
 │              │               │                  │  │                                             │     │           │
 │              │               │                  │  │  Walker (jwalk) yields DirEntry             │     │           │
 │              │               │                  │  │     │                                       │     │           │
 │              │               │                  │  │     ▼                                       │     │           │
 │              │               │                  │  │  FilterEngine: exclude?                     │     │           │
 │              │               │                  │  │     │                                       │     │           │
 │              │               │                  │  │     ▼ (if accepted)                         │     │           │
 │              │               │                  │  │  EntryMapper: DirEntry → FileEntry          │     │           │
 │              │               │                  │  │     │                                       │     │           │
 │              │               │                  │  │     ▼                                       │     │           │
 │              │               │                  │  │  Send FileEntry via mpsc channel            │     │           │
 │              │               │                  │  │     │                                       │     │           │
 │              │               │                  │  │     ▼                                       │     │           │
 │              │               │                  │  │  BatchAccumulator: add to buffer            │     │           │
 │              │               │                  │  │     │                                       │     │           │
 │              │               │                  │  │     ▼ (buffer full OR timeout)              │     │           │
 │              │               │                  │  │  Send batch to Persister                    │     │           │
 │              │               │                  │  │     │                                       │     │           │
 │              │               │                  │  │     ▼                                       │     │           │
 │              │               │                  │  │  Persister: BEGIN TRANSACTION               │     │           │
 │              │               │                  │  │     │                                       │     │           │
 │              │               │                  │  │     ▼                                       │     │           │
 │              │               │                  │  │  Insert 500 rows                            │─────────────> │
 │              │               │                  │  │     │                                       │     │           │
 │              │               │                  │  │     ▼                                       │     │           │
 │              │               │                  │  │  COMMIT                                     │─────────────> │
 │              │               │                  │  └─────────────────────────────────────────────┘     │           │
 │              │               │                  │                                                     │           │
 │              │               │                  │  In parallel (every 100ms):                         │           │
 │              │               │                  │  ┌───────────────────────────────────────────────┐   │           │
 │              │               │                  │  │  ProgressTracker: read atomic counters       │   │           │
 │              │               │                  │  │  → calculate FPS + ETA                       │   │           │
 │              │               │                  │  │  → EventEmitter: emit "scan:progress"        │   │           │
 │              │               │                  │  └───────────────────────────────────────────────┘   │           │
 │              │               │                  │                                                     │           │
 │  listen()    │               │                  │                                                     │           │
 │<─────────────│  progress     │                  │                                                     │           │
 │  update UI   │  event        │<══════════════════════════════ emit("scan:progress") ═══════════════    │           │
 │              │               │                  │                                                     │           │
 │              │               │                  │  ┌─────────────────────────────────────────────┐     │           │
 │              │               │                  │  │  On walk complete:                          │     │           │
 │              │               │                  │  │  1. Drain remaining entries from channel    │     │           │
 │              │               │                  │  │  2. Flush final batch to Persister         │     │           │
 │              │               │                  │  │  3. Compute directory_summaries            │─────────────> │
 │              │               │                  │  │  4. Compute scan_statistics                │─────────────> │
 │              │               │                  │  │  5. Update session status → completed      │─────────────> │
 │              │               │                  │  │  6. Emit "scan:complete" with summary      │     │           │
 │              │               │                  │  └─────────────────────────────────────────────┘     │           │
 │              │               │                  │                                                     │           │
 │  update UI   │  complete     │                  │                                                     │           │
 │<─────────────│  event        │<══════════════════════════════ emit("scan:complete") ═══════════════    │           │
 │  show        │               │                  │                                                     │           │
 │  dashboard   │               │                  │                                                     │           │
```

---

## 4. Thread Model

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS MEMORY SPACE                                         │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐     │
│  │                       TOKIO ASYNC RUNTIME (multi-threaded)                    │     │
│  │                                                                               │     │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────┐  │     │
│  │  │  Event Loop        │  │  Command Handlers   │  │  Progress Reporter     │  │     │
│  │  │  (Tauri IPC)       │  │  (async tasks)      │  │  (async task, 100ms)  │  │     │
│  │  └────────────────────┘  └────────────────────┘  └────────────────────────┘  │     │
│  │                                                                               │     │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────┐  │     │
│  │  │  Event Emitter     │  │  Cancel/Pause       │  │  BatchAccumulator     │  │     │
│  │  │  (async task)      │  │  Listeners          │  │  (async, mpsc recv)  │  │     │
│  │  └────────────────────┘  └────────────────────┘  └────────────────────────┘  │     │
│  └─────────────────────────────────────────────────────────────────────────────┘     │
│                                    │                                                   │
│                                    │ spawn_blocking()                                  │
│                                    ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐     │
│  │                    BLOCKING WORKER THREAD (dedicated)                         │     │
│  │                                                                               │     │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────┐  │     │
│  │  │  Pipeline Runner   │  │  SQLite Persister   │  │  Checkpoint Saver     │  │     │
│  │  │  (orchestrates     │  │  (synchronous DB    │  │  (periodic flush)     │  │     │
│  │  │   the flow)        │  │   writes)           │  │                       │  │     │
│  │  └────────────────────┘  └────────────────────┘  └────────────────────────┘  │     │
│  └─────────────────────────────────────────────────────────────────────────────┘     │
│                                    │                                                   │
│                                    │ jwalk internal thread pool                         │
│                                    ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐     │
│  │                    RAYON THREAD POOL (jwalk workers)                         │     │
│  │                                                                               │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │     │
│  │  │  Worker 1    │  │  Worker 2    │  │  Worker 3    │  │  Worker N    │    │     │
│  │  │ (readdir)    │  │ (readdir)    │  │ (readdir)    │  │ (readdir)    │    │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │     │
│  │                                                                               │     │
│  │  Each worker:                                                                 │     │
│  │  1. Read directory entries via OS readdir()                                   │     │
│  │  2. lstat() each entry for metadata                                           │     │
│  │  3. Filter (exclude, permission, depth)                                       │     │
│  │  4. Map to FileEntry                                                          │     │
│  │  5. Send FileEntry to channel (crossbeam)                                     │     │
│  │  6. Recurse into subdirectories                                               │     │
│  └─────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐     │
│  │                    CHANNEL CONNECTIONS                                         │     │
│  │                                                                               │     │
│  │  ┌──────────────┐    mpsc (bounded)    ┌──────────────────┐                  │     │
│  │  │ Rayon Workers│ ──────────────────>  │ BatchAccumulator │ (tokio task)     │     │
│  │  │ (FileEntry)  │   cap: 10_000       │ (Vec<FileEntry>)  │                  │     │
│  │  └──────────────┘                      └────────┬─────────┘                  │     │
│  │                                                  │ mpsc (unbounded)            │     │
│  │                                                  ▼                             │     │
│  │                                         ┌──────────────────┐                  │     │
│  │                                         │ Persister        │ (blocking task)  │     │
│  │                                         │ (SQLite writes)  │                  │     │
│  │                                         └──────────────────┘                  │     │
│  │                                                                               │     │
│  │  ┌──────────────┐                    ┌──────────────────┐                    │     │
│  │  │ Progress     │ (Shared Atomic)    │ EventEmitter     │                    │     │
│  │  │ Tracker      │ ──────────────────> │ (tokio task)     │                    │     │
│  │  └──────────────┘                    └────────┬─────────┘                    │     │
│  │                                               │ Tauri emit()                  │     │
│  │                                               ▼                               │     │
│  │                                        ┌──────────────────┐                  │     │
│  │                                        │ React Frontend   │                  │     │
│  │                                        └──────────────────┘                  │     │
│  └─────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Thread Count Summary

| Thread Pool | Size | Purpose |
|------------|------|---------|
| Tokio runtime | `num_cpus` | Async tasks: handlers, events, accumulator |
| jwalk/rayon | `num_cpus` | Parallel filesystem traversal |
| SQLite writer | 1 dedicated | Serialize DB writes (avoid contention) |
| **Total active during scan** | `~2 × num_cpus + 2` | |

---

## 5. Pipeline Architecture

### 5.1 Stage Detail

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SCAN PIPELINE (streaming)                                │
│                                                                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ WALKER   │───>│ FILTER   │───>│ MAPPER   │───>│ BATCH    │───>│ PERSIST  │   │
│  │ (jwalk)  │    │ ENGINE   │    │          │    │ ACCUM    │    │ SQLite   │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │               │               │               │               │          │
│       │ 1             │ 2             │ 3             │ 4             │ 5        │
│       ▼               ▼               ▼               ▼               ▼          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │readdir() │    │ glob     │    │ DirEntry │    │ Vec of   │    │ BEGIN    │   │
│  │lstat()   │    │ match    │    │ →        │    │ FileEntry│    │ tx +     │   │
│  │ symlink  │    │ permission│   │ FileEntry │    │ (500)    │    │ INSERT × │   │
│  │ resolve  │    │ depth    │    │ + deriv. │    │ timeout  │    │ 500 +    │   │
│  │          │    │ category │    │ category  │    │ (50ms)   │    │ COMMIT   │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│                                                                                   │
│  ──── Parallel (rayon) ────    │    ──── Sequential (single thread) ──────────  │
│                                 ▼                                                 │
│                          ┌──────────────┐                                         │
│                          │  PROGRESS    │  (every 100ms, emit to frontend)        │
│                          │  TRACKER     │                                         │
│                          └──────────────┘                                         │
│                          │                                                         │
│                          ▼                                                         │
│                     ┌──────────────┐                                              │
│                     │  CHECKPOINT  │  (every 10K files or 30s)                    │
│                     │  MANAGER     │                                              │
│                     └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Stage 1: Walker (Parallel, rayon)

**Input:** ScanConfig (root path, depth limit, follow symlinks, hidden files)
**Output:** `DirEntry` stream (via mpsc channel)
**Concurrency:** Parallel (rayon thread pool, one task per directory)

```rust
// Pseudocode — Walker algorithm
fn walk(config: ScanConfig, tx: Sender<FileEntry>, state: Arc<ScanState>) {
    let walk = jwalk::WalkDir::new(&config.root_path)
        .follow_links(config.follow_symlinks)
        .skip_hidden(config.skip_hidden)
        .max_depth(config.max_depth)
        .process_read_dir(|_depth, _path, children| {
            // Filter BEFORE descending into subdirectories
            children.retain(|entry| match entry {
                Ok(e) if FilterEngine::is_excluded(e.path()) => false,
                _ => true,
            });
        });

    for result in walk.into_iter() {
        // Check cancellation
        if state.cancel_token.is_cancelled() { break; }

        // Check pause
        while state.is_paused.load(Ordering::Acquire) {
            state.pause_notify.notified().wait();  // block until resume
            if state.cancel_token.is_cancelled() { break; }
        }

        match result {
            Ok(dir_entry) => {
                let file_entry = EntryMapper::map(dir_entry);
                state.metrics.record_file(&file_entry);
                // Send to channel (blocking if full = backpressure)
                tx.blocking_send(file_entry)?;
            }
            Err(e) => {
                state.metrics.record_error(e);
            }
        }
    }
}
```

### 5.3 Stage 2: Filter Engine (Inline with Walker)

**Input:** DirEntry from jwalk
**Output:** Accepted DirEntry or skip

```rust
// Pseudocode — filter priority chain
fn should_include(path: &Path, entry: &DirEntry, config: &ScanConfig) -> FilterDecision {
    // 1. Depth check (fastest check first)
    if entry.depth >= config.max_depth { return FilterDecision::Skip; }

    // 2. Built-in system excludes
    if matches_builtin_exclude(path) { return FilterDecision::Skip; }

    // 3. User glob excludes
    for pattern in &config.exclude_patterns {
        if pattern.matches_path(path) { return FilterDecision::Skip; }
    }

    // 4. Hidden files
    if config.skip_hidden && is_hidden(path) { return FilterDecision::Skip; }

    // 5. Permission check (try lstat)
    match tokio::fs::symlink_metadata(path) {
        Ok(_) => FilterDecision::Include,
        Err(e) if is_permission_error(&e) => {
            FilterDecision::SkipWithWarning(e)
        }
        Err(e) => FilterDecision::SkipWithError(e),
    }
}
```

### 5.4 Stage 3: Mapper (Inline with Walker)

**Input:** DirEntry
**Output:** FileEntry (domain entity)

```rust
// Pseudocode — mapping logic
fn map_entry(entry: DirEntry) -> FileEntry {
    let path = entry.path();
    let metadata = entry.metadata().unwrap_or_default();

    FileEntry {
        file_path: normalize_path(&path),
        parent_path: normalize_path(path.parent()),
        file_name: path.file_name().to_string(),
        extension: path.extension().map(|e| e.to_string_lossy().to_lowercase()),
        file_size: if metadata.is_file() { metadata.len() } else { 0 },
        is_directory: metadata.is_dir(),
        is_symlink: metadata.is_symlink(),
        permissions: format_permissions(&metadata.permissions()),
        modified_at: metadata.modified().map(to_iso_string),
        created_at: metadata.created().map(to_iso_string),
        depth: entry.depth,
        category: classify_file(path, metadata),
        // hash_id = NULL (populated lazily)
        // is_deleted = false
    }
}
```

### 5.5 Stage 4: Batch Accumulator (Sequential, Tokio task)

**Input:** Individual FileEntry from channel
**Output:** Batch (Vec<FileEntry>) to Persister

```rust
// Pseudocode — accumulator state machine
async fn accumulate(
    mut rx: mpsc::Receiver<FileEntry>,
    batch_tx: mpsc::UnboundedSender<Vec<FileEntry>>,
) {
    let mut batch = Vec::with_capacity(BATCH_SIZE); // 500
    let mut timer = tokio::time::interval(Duration::from_millis(50));
    timer.tick().await;  // skip first immediate tick

    loop {
        tokio::select! {
            // Either a new entry arrives
            entry = rx.recv() => {
                match entry {
                    Some(e) => {
                        batch.push(e);
                        if batch.len() >= BATCH_SIZE {
                            batch_tx.send(std::mem::take(&mut batch)).ok();
                            batch = Vec::with_capacity(BATCH_SIZE);
                            timer.reset();
                        }
                    }
                    None => break, // channel closed = walk complete
                }
            }
            // Or timeout forces flush even if batch not full
            _ = timer.tick() => {
                if !batch.is_empty() {
                    batch_tx.send(std::mem::take(&mut batch)).ok();
                    batch = Vec::with_capacity(BATCH_SIZE);
                }
            }
        }
    }

    // Flush remaining
    if !batch.is_empty() {
        batch_tx.send(batch).ok();
    }
}
```

### 5.6 Stage 5: Persister (Sequential, dedicated blocking thread)

**Input:** Batch (Vec<FileEntry>)
**Output:** SQLite INSERT committed

```rust
// Pseudocode — batch writer
fn persist_batch(
    batch: Vec<FileEntry>,
    repo: &dyn FileRepository,
    metrics: &ProgressTracker,
) -> Result<()> {
    let now = Instant::now();

    repo.batch_insert(&batch)?;  // BEGIN + 500 INSERTs + COMMIT

    metrics.record_batch_written(batch.len(), now.elapsed());
    Ok(())
}
```

---

## 6. Progress Tracking Strategy

### 6.1 Event Stream

Progress events are emitted at a throttled rate (every 100ms) to avoid overwhelming the UI:

```
scan:progress {
    session_id: u64,
    state: {
        phase: "scanning" | "analyzing" | "complete",
        files_processed: u64,
        directories_processed: u64,
        bytes_processed: u64,
        files_per_second: f64,
        bytes_per_second: f64,
        elapsed_secs: f64,
        eta_secs: f64,
        current_file: String,
        errors_count: u64,
        skipped_count: u64,
    }
}
```

### 6.2 ETA Calculation

Since we don't know the total file count upfront (jwalk discovers files as it traverses), we use two strategies:

**Strategy A: Adaptive ETA (during scan)**
- Track files/sec using exponential moving average
- ETA becomes more accurate as scan progresses (law of large numbers)
- Not displayed until >10 seconds of data collected

**Strategy B: Historical baseline (future enhancement)**
- After first scan, store total file count for each path
- Subsequent scans use historical count for instant ETA accuracy

```rust
// EMA calculation
struct EmaFilter {
    alpha: f64,          // smoothing factor (0.3)
    last_value: f64,     // previous FPS
    last_time: Instant,
}

impl EmaFilter {
    fn update(&mut self, count: u64) -> f64 {
        let now = Instant::now();
        let dt = (now - self.last_time).as_secs_f64();
        if dt < 0.05 { return self.last_value; } // skip if < 50ms

        let instant_fps = count as f64 / dt;
        self.last_value = self.alpha * instant_fps + (1.0 - self.alpha) * self.last_value;
        self.last_time = now;
        self.last_value
    }
}
```

### 6.3 Progress Display Strategy

| Time Elapsed | Display |
|-------------|---------|
| 0–3s | "Scanning... preparing" (no ETA) |
| 3–10s | Files/sec only (no ETA, sample too small) |
| 10s+ | Files processed + ETA + files/sec |

---

## 7. Pause / Resume / Cancel Strategy

### 7.1 State Machine

```
                    ┌─────────────┐
                    │  SCANNING   │
                    └──┬──────┬───┘
              pause()  │      │  cancel()
                  ┌────┘      └──────┐
                  ▼                   ▼
           ┌───────────┐      ┌───────────┐
           │  PAUSED   │      │ CANCELLED │
           └─────┬─────┘      └───────────┘
        resume() │
                 ▼
           ┌───────────┐
           │  SCANNING │  (resume from where paused)
           └───────────┘
```

### 7.2 Pause Mechanics

```
User clicks Pause
       │
       ▼
Tauri command: pause_scan(session_id)
       │
       ▼
ScanState.is_paused.store(true, Release)
       │
       ▼
Walker loop checks flag BEFORE processing each entry:
  while is_paused.load(Acquire) {
      // Walker blocks here
      // Channel stops filling
      // Backpressure propagates to all rayon workers
      // BatchAccumulator finishes current batch
      // Persister commits current transaction
      pause_notify.blocking_wait();  // blocks until resume
  }
       │
       ▼
Event emitted: scan:paused { session_id, progress_snapshot }
       │
       ▼
UI shows "Paused" state with current progress
```

### 7.3 Resume Mechanics

```
User clicks Resume
       │
       ▼
Tauri command: resume_scan(session_id)
       │
       ▼
ScanState.is_paused.store(false, Release)
ScanState.pause_notify.notify_waiters()  // wakes ALL blocked threads
       │
       ▼
Walker resumes processing from where it was blocked
       │
       ▼
Event emitted: scan:resumed { session_id }
       │
       ▼
UI shows "Scanning" state again
```

### 7.4 Cancel Mechanics

```
User clicks Cancel
       │
       ▼
Tauri command: cancel_scan(session_id)
       │
       ▼
ScanState.cancel_token.cancel()
       │
       ├── If paused → also resume (cancel wins over pause)
       │    ScanState.is_paused.store(false, Release)
       │    ScanState.pause_notify.notify_waiters()
       │
       ▼
Walker loop:
  if cancel_token.is_cancelled() { break; }

BatchAccumulator:
  if cancel_token.is_cancelled() { break; }  // flush current batch

Persister:
  if cancel_token.is_cancelled() {
      flush();  // write remaining batch
  }

Post-cancel:
  1. Mark scan session status = "cancelled" in DB
  2. Save final checkpoint (for potential resume)
  3. Emit scan:cancelled { session_id, summary }
  4. Clean up resources
```

### 7.5 Race Condition Handling

| Scenario | Mitigation |
|----------|-----------|
| Cancel during pause | Cancel sets `is_paused = false` + `notify_waiters()` — cancel wins |
| Pause during cancel | `is_cancelled()` check at start of each loop iteration |
| Resume after cancel | `cancel_token.is_cancelled()` → resume is no-op, emit error |
| Double pause | `is_paused.compare_exchange(false, true)` — idempotent |
| Double cancel | `cancel_token.cancel()` — idempotent |
| Cancel during DB write | Transaction completes before checking cancel (cannot rollback mid-transaction) |

---

## 8. Error Handling Strategy

### 8.1 Error Classification

| Category | Examples | Action |
|----------|----------|--------|
| **Recoverable** | Permission denied, broken symlink, file deleted during scan | Log, skip file, increment counter |
| **Retryable** | Temp IO error, network path unavailable | Retry 3x with exponential backoff |
| **Fatal** | Invalid scan path, DB corruption, out of disk space | Abort entire scan, emit error |

### 8.2 Error Recovery Flow

```
Entry processing error
       │
       ▼
┌──────────────────────────────────────┐
│  ClassifyError(error)                 │
│                                      │
│  if Recoverable:                     │
│      ErrorCollector.record(path, e)   │
│      metrics.record_skip(e)          │
│      continue (skip this file)       │
│                                      │
│  if Retryable:                       │
│      for attempt in 0..MAX_RETRIES:  │
│          match try_again() {          │
│              Ok(v) => process(v),     │
│              Err(e) if attempt < 3 => │
│                  sleep(backoff),      │
│              Err(e) =>                │
│                  classify as Fatal    │
│          }                            │
│                                      │
│  if Fatal:                           │
│      cancel_token.cancel()           │
│      emit scan:failed { error }      │
│      abort pipeline                  │
└──────────────────────────────────────┘
```

### 8.3 Error Reporting

```
During scan:
  - Errors collected in ErrorCollector (concurrent HashMap)
  - Summary counters updated atomically

On scan complete:
  - If errors > 0:
      emit scan:complete {
          summary: { ... },
          warnings: {
              permission_denied: 42,
              broken_symlinks: 5,
              io_errors: 1,
          }
      }
  - UI shows warning banner with "42 files skipped (view details)"
  - On click: show error detail modal
```

### 8.4 Partial Failure Guarantees

```
Property: "No scan fails entirely due to individual file errors"

- 1M files, 1000 permission errors → scan succeeds, 999k files recorded
- Single corrupt directory → that directory skipped, rest of drive scanned
- Mid-scan power failure → checkpoint saved, resume available
```

---

## 9. Batching Strategy

### 9.1 Batch Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `BATCH_SIZE` | 500 entries | Optimizes SQLite INSERT throughput |
| `FLUSH_TIMEOUT` | 50ms | Prevents UI lag on slow directories |
| `CHANNEL_CAPACITY` | 10,000 entries | Backpressure buffer, ~5MB memory |
| `CHECKPOINT_INTERVAL_FILES` | 10,000 | Resume granularity |
| `CHECKPOINT_INTERVAL_SECS` | 30s | Guaranteed checkpoint even on slow scans |

### 9.2 SQLite Insert Performance

```
Benchmark: INSERT 500 rows per transaction on modern SSD

Batch size     Time per batch     Time per 1M files
   100              8ms                 80s
   500             12ms                 24s
  1000             18ms                 18s
  5000             60ms                 12s

Conclusion: BATCH_SIZE = 500 is sweet spot
(balance between throughput and latency/memory)
```

### 9.3 Batch Flow Control

```
Walker (fast)           BatchAccumulator          Persister (slow)
    │                         │                        │
    │─── FileEntry ──────────>│                        │
    │─── FileEntry ──────────>│                        │
    │─── FileEntry ──────────>│                        │
    │                         │─── Batch (500) ───────>│
    │─── FileEntry ──────────>│                        │─── BEGIN ───> SQLite
    │─── FileEntry ──────────>│                        │─── INSERT ──>
    │                         │                        │─── COMMIT ──>
    │                         │<── Ack ────────────────│
    │                         │─── Batch (500) ───────>│
    │                         │                        │─── ...

Backpressure:
  - If Persister is slow, channel fills up
  - When channel is full, Walker's blocking_send() blocks
  - Backpressure propagates to jwalk workers
  - jwalk workers stop producing → OS readdir() calls pause
  - Natural flow control without complex signaling
```

---

## 10. Checkpoint Strategy

### 10.1 Checkpoint Data

```sql
CREATE TABLE scan_checkpoints (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_session_id   INTEGER NOT NULL REFERENCES scan_sessions(id),
    files_processed   INTEGER NOT NULL,
    bytes_processed   INTEGER NOT NULL,
    directories_seen  INTEGER NOT NULL,
    last_file_path    TEXT,    -- last file written to DB (for display only)
    checkpoint_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

### 10.2 Save Frequency

```
After every BATCH write (500 entries):
  - Increment files_processed counter

Every 10,000 files OR 30 seconds (whichever first):
  - INSERT OR UPDATE scan_checkpoints
  - Atomic: write checkpoint + file batch in SAME transaction
  - Ensures consistency: checkpoint never ahead of actual data

Note: Checkpoint is saved in the SAME transaction as file inserts.
If crash occurs between the last checkpoint and current position:
  - Worst case: replay last 10,000 files
  - All on INSERT OR IGNORE → idempotent, safe
```

### 10.3 Resume Flow

```
User opens app
       │
       ▼
Check for incomplete scan sessions:
  SELECT id, scan_path, status, total_files, started_at
  FROM scan_sessions
  WHERE status IN ('scanning', 'cancelled')
  ORDER BY started_at DESC
  LIMIT 1
       │
       ▼
If found:
  Ask user: "Incomplete scan found. Resume?"
    │                    │
    Yes                  No
    │                    │
    ▼                    ▼
  Create new session   Start fresh scan
  with:
    parent_session_id
    is_incremental = true
    scan_path = same

  Walker starts from root path
  For each file:
    - Check if exists in parent session
      with same file_size + modified_at
    - If yes → copy metadata, skip insert
    - If no  → insert as new

  Finalize:
    - Mark parent files not found as is_deleted
    - Compute delta summary
```

---

## 11. Event Catalog

### 11.1 All Events

| Event Name | Direction | Trigger | Payload | Frequency |
|-----------|-----------|---------|---------|-----------|
| `scan:starting` | Backend → UI | Scan requested, session created | `{ session_id, scan_path, config }` | Once |
| `scan:progress` | Backend → UI | Every 100ms during scan | `{ files_processed, bytes, fps, eta, current_file }` | ~10/sec |
| `scan:paused` | Backend → UI | User pause | `{ session_id, progress_snapshot }` | At most once per pause |
| `scan:resumed` | Backend → UI | User resume | `{ session_id }` | At most once per resume |
| `scan:cancelled` | Backend → UI | User cancel | `{ session_id, summary }` | Once |
| `scan:failed` | Backend → UI | Fatal error | `{ session_id, error, recoverable_count }` | Once |
| `scan:complete` | Backend → UI | Scan done | `{ session_id, summary }` | Once |
| `scan:warning` | Backend → UI | Non-fatal batch | `{ count, category, first_error_path }` | Throttled |
| `ui:pause` | UI → Backend | User pause click | `{ session_id }` | Command |
| `ui:resume` | UI → Backend | User resume click | `{ session_id }` | Command |
| `ui:cancel` | UI → Backend | User cancel click | `{ session_id }` | Command |

### 11.2 Event Payload Schemas

```typescript
// ── Scan Starting ──
interface ScanStartingEvent {
    session_id: number;
    scan_path: string;
    started_at: string;
}

// ── Scan Progress (emitted every 100ms) ──
interface ScanProgressEvent {
    session_id: number;
    phase: "scanning" | "analyzing" | "finalizing";
    files_processed: number;
    directories_processed: number;
    bytes_processed: number;
    files_per_second: number;
    bytes_per_second: number;
    elapsed_secs: number;
    eta_secs: number | null;  // null if insufficient data
    current_file: string | null;
    errors_count: number;
    skipped_count: number;
}

// ── Scan Complete ──
interface ScanCompleteEvent {
    session_id: number;
    summary: {
        status: "completed" | "cancelled" | "failed";
        total_files: number;
        total_directories: number;
        total_size: number;
        duration_ms: number;
        errors_count: number;
        skipped_count: number;
        files_per_second: number;
    };
}
```

### 11.3 Event Flow Diagram

```
UI                         Backend
 │                           │
 │── invoke("start_scan") ──>│
 │                           │── emit("scan:starting") ──┐
 │<─── listen("scan:starting") ──────────────────────────┘
 │                           │
 │                           │ [scan loop]
 │                           │── emit("scan:progress") ──┐  (every 100ms)
 │<─── listen("scan:progress") ──────────────────────────┘
 │                           │
 │── invoke("pause_scan") ──>│
 │                           │── emit("scan:paused") ────┐
 │<─── listen("scan:paused") ────────────────────────────┘
 │                           │
 │── invoke("resume_scan") ─>│
 │                           │── emit("scan:resumed") ───┐
 │<─── listen("scan:resumed") ───────────────────────────┘
 │                           │
 │                           │── emit("scan:progress") ──┐  (resumed)
 │<─── listen("scan:progress") ──────────────────────────┘
 │                           │
 │                           │ [scan done]
 │                           │── emit("scan:complete") ──┐
 │<─── listen("scan:complete") ──────────────────────────┘
```

---

## 12. Logging Strategy

### 12.1 Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `ERROR` | Fatal errors that abort scan | "Database connection failed: disk full" |
| `WARN` | Recoverable errors, unexpected state | "Permission denied: /proc/1/mem" |
| `INFO` | Major lifecycle events | "Scan started: path=C:\, session_id=42" |
| `DEBUG` | Pipeline state for debugging | "Batch flushed: 500 entries, 12ms" |
| `TRACE` | Per-entry details (only for dev) | "Entry mapped: /home/user/file.txt" |

### 12.2 Log Targets

| Target | Format | Retention |
|--------|--------|-----------|
| `stdout` (Tauri console) | Human-readable | Session lifetime |
| File (rotating) | JSON structured | 7 days, max 100MB |
| In-memory ring buffer | Binary | Last 1000 entries (for crash reports) |
| Per-scan log | JSONL | Until session deleted |

### 12.3 Logged Events per Scan

```
INFO  [scanner] Scan started   | session=42 path="C:\Users" files=0
DEBUG [scanner] Batch written  | session=42 entries=500 time=12ms fps=41666
DEBUG [scanner] Batch written  | session=42 entries=500 time=14ms fps=35714
WARN  [scanner] Permission     | session=42 path="C:\System\pagefile.sys" err=AccessDenied
INFO  [scanner] Checkpoint     | session=42 files=10000 at="2026-06-20T10:30:00Z"
DEBUG [scanner] Paused         | session=42 files=45231
INFO  [scanner] Resumed        | session=42 files=45231
...
INFO  [scanner] Scan completed | session=42 files=123456 dirs=5432 size=1.2TB time=187s
```

### 12.4 User-Facing vs Internal

```
User-facing logs (in UI log panel):
  - Scan started / paused / resumed / cancelled / completed
  - Warnings: "42 files skipped due to permission"
  - Fatal errors

Internal logs (file only, for debugging):
  - Batch timing
  - Thread pool utilization
  - Channel backpressure events
  - SQLite transaction timing
```

---

## 13. Performance Analysis

### 13.1 Bottleneck Identification

```
Bottleneck Hierarchy (fastest to slowest):
                                │
  CPU: Entry mapping ──────────>│  < 1μs per entry
                                │
  Memory: Channel copy ────────>│  ~0.5μs per entry (arc/clone)
                                │
  OS: readdir() ───────────────>│  ~10μs per entry (SSD)
                                │       ~50μs per entry (HDD)
                                │
  OS: lstat() ─────────────────>│  ~10μs per entry (SSD, cached)
                                │       ~100μs per entry (HDD)
                                │
  DB: SQLite INSERT ───────────>│  ~24μs per entry (batch of 500)
                                │  = 12ms per batch
                                │
  ⚠ BOTTLENECK ⚠               │
  FS: Directories with 10K+    │  Single-threaded directory
      files in one dir         │  enumeration bottleneck
```

### 13.2 Theoretical Throughput

```
Scenario: Modern SSD, 1M files, 8 cores

    jwalk parallel traversal:  1,000,000 files ÷ 8 threads ÷ 5,000 files/sec/thread
                              = ~25 seconds

    SQLite batch insert:      1,000,000 files ÷ 41,666 files/sec (500/12ms)
                              = ~24 seconds

    Total (pipelined):        MAX(25s, 24s) + pipeline overhead
                              = ~28 seconds

    Memory:                   Channel buffer (10,000 × ~200 bytes) = ~2MB
                              + Batch buffer (500 × ~200 bytes) = ~100KB
                              + jwalk internal = ~10MB
                              = ~12MB peak memory during scan
```

### 13.3 Real-World Estimates

| Storage Type | Files/sec | 1M files | 5M files | 10M files |
|-------------|-----------|----------|----------|-----------|
| NVMe SSD | 35,000 | 35s | 2.9 min | 5.7 min |
| SATA SSD | 20,000 | 60s | 5 min | 10 min |
| HDD 7200RPM | 4,000 | 5 min | 25 min | 50 min |
| Network share | 1,000 | 20 min | 1.6 hrs | 3.3 hrs |

### 13.4 Memory Budget Breakdown

```
┌──────────────────────────────────────┐
│          MEMORY BUDGET               │
├──────────────────────────────────────┤
│ jwalk internal state       ~5 MB     │
│ Channel buffer (10,000)    ~2 MB     │
│ Batch buffer (500)         ~100 KB   │
│ SQLite page cache (64MB)   ~64 MB    │
│ Progress tracker           ~1 KB     │
│ Event emitter buffer       ~10 KB    │
│ Logger ring buffer         ~1 MB     │
├──────────────────────────────────────┤
│ Total (during scan)       ~72 MB     │
│ Steady state (idle)       ~65 MB     │
└──────────────────────────────────────┘
```

---

## 14. Risk Analysis

| Risk | Probability | Impact | Severity | Mitigation |
|------|------------|--------|----------|------------|
| **OOM on 10M files** | Low | High | **HIGH** | Streaming pipeline, bounded channels, no full collection |
| **SQLite write contention** | Medium | Medium | **MEDIUM** | Single writer thread, WAL mode, batch writes |
| **jwalk hangs on cyclic symlink** | Low | High | **HIGH** | `follow_links = false` by default, max depth limit |
| **Permission loop (Windows)** | Low | Medium | **MEDIUM** | Graceful skip, configurable system exclude list |
| **App crash mid-scan** | Medium | High | **HIGH** | Checkpoint every 10K files, resume support |
| **UI freeze from flood of events** | Low | Medium | **MEDIUM** | Throttle events to 100ms, batch in event emitter |
| **Path too long (Windows 260 char)** | Medium | Low | **LOW** | Use `\\?\` prefix, jwalk handles extended paths |
| **Removable drive removed during scan** | Low | High | **HIGH** | Check `is_ready` before each batch, graceful abort |
| **Antivirus interference (Windows)** | Medium | Low | **LOW** | Expect slower scan, retry on access denied |
| **SQLite journal file fills disk** | Low | Medium | **MEDIUM** | Monitor free space before scan, abort if < 1GB free |

---

## 15. Integration with Other Features

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      POST-SCAN ANALYSIS PIPELINE                        │
│                                                                          │
│  Scanner completes                                                       │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                 1. directory_summaries computation               │    │
│  │  Walk scan_entries aggregated by parent_path                    │    │
│  │  INSERT INTO directory_summaries (...)                          │    │
│  │  Time: ~5s for 1M files                                        │    │
│  └────────────────────────────────┬────────────────────────────────┘    │
│                                   │                                     │
│  ┌────────────────────────────────┼────────────────────────────────┐    │
│  │         2. scan_statistics     │    3. duplicate candidate       │    │
│  │  Compute file type breakdown   │    detection (tier 1)           │    │
│  │  Top directories, top files    │    Group by file_size           │    │
│  │  Average/median file size      │    HAVING COUNT(*) > 1          │    │
│  │  Time: ~3s for 1M files        │    Time: < 1s (SQL index)      │    │
│  └────────────────────────────────┘                                 │    │
│                                                                      │    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │         4. cache_entries detection (if enabled)                 │    │
│  │  Apply rule engine against scan_entries paths                  │    │
│  │  Match glob patterns, categorize                               │    │
│  │  INSERT INTO cache_entries                                     │    │
│  │  Time: ~2s for 1M files                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │         5. health_snapshot (if enabled)                          │    │
│  │  Read from scan_statistics + volumes table                      │    │
│  │  Calculate weighted score                                       │    │
│  │  INSERT INTO health_snapshots                                   │    │
│  │  Time: < 100ms                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Scanner finalizes: mark session complete, emit scan:complete           │
│                                                                          │
│  Total post-scan time for 1M files: ~10s                                │
│  (All pipelined where possible)                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 16. Communication Diagram

```
┌─────────┐  invoke()   ┌──────────┐   trait call   ┌──────────────────┐
│  React  │<═══════════>│ petabyte │<──────────────>│ petabyte-scanner │
│  UI     │  events     │ -app     │                │ (ScannerPort)    │
└─────────┘             └──────────┘                └────────┬─────────┘
                                                             │
                                              ┌──────────────┼──────────────┐
                                              │              │              │
                                         trait call     trait call     trait call
                                              │              │              │
                                         ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
                                         │petabyte │  │petabyte │  │petabyte │
                                         │-database│  │-shared  │  │-shared  │
                                         │         │  │-models  │  │         │
                                         └─────────┘  └─────────┘  └─────────┘
```

---

## 17. Summary (30 seconds)

| Aspek | Keputusan |
|-------|-----------|
| **Traversal** | `jwalk` parallel, `num_cpus` threads, depth-limited, filter BEFORE descend |
| **Pipeline** | Walker → Filter → Mapper → BatchAccum → Persister (streaming, bounded channels) |
| **Concurrency model** | Rayon (walker) + Tokio async (accumulator/events) + dedicated blocking thread (persister) |
| **Backpressure** | Bounded mpsc channel (cap 10,000), `blocking_send` blocks when full |
| **Pause/Resume** | `AtomicBool` + `Notify`, blocks walker thread, propagates via channel backpressure |
| **Cancel** | Tokio `CancellationToken`, graceful drain + checkpoint |
| **Checkpoint** | Every 10K files or 30s, same transaction as batch, resume via incremental scan |
| **Batch size** | 500 entries or 50ms timeout (whichever first) |
| **Events** | 7 event types, throttled to 100ms, Tauri emit |
| **Memory** | ~72MB peak during scan for 1M files (mostly SQLite cache) |
| **Throughput (SSD)** | ~35K files/sec, ~28s for 1M files |
| **Fault tolerance** | Recoverable errors skip, retryable retry 3x, fatal abort + checkpoint |
