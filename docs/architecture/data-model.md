# 🗃️ PetaByte — Database Design & Data Model

## 1. Entity Relationship Diagram (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐                    │
│  │   volumes     │     │  scan_sessions   │     │  scan_exclusions │                    │
│  │──────────────│     │──────────────────│     │──────────────────│                    │
│  │PK id         │◄────│FK volume_id       │     │PK id             │                    │
│  │  mount_point │     │PK id             │     │  pattern         │                    │
│  │  label       │     │  scan_path       │     │  is_regex        │                    │
│  │  total_cap   │     │  status          │     │  description     │                    │
│  │  free_space  │     │  total_files     │     │  is_active       │                    │
│  │  is_ready    │     │  total_dirs      │     └──────────────────┘                    │
│  │  first_seen  │     │  total_size      │                                              │
│  │  last_scanned│     │  started_at      │     ┌──────────────────┐                    │
│  └──────────────┘     │  completed_at    │     │  app_settings    │                    │
│                        │  duration_ms     │     │──────────────────│                    │
│                        │  config_json     │     │PK key            │                    │
│                        │  error_message   │     │  value           │                    │
│                        │  parent_id──┐    │     │  updated_at      │                    │
│                        └──────┬───────┘    │     └──────────────────┘                    │
│                               │             │                                            │
│                               │ 1:N         │                                            │
│                               ▼             │                                            │
│  ┌──────────────────────────────────────────────────────┐                               │
│  │                   scan_entries                        │                               │
│  │──────────────────────────────────────────────────────│                               │
│  │PK id                                                  │                               │
│  │FK scan_session_id (NOT NULL)                          │                               │
│  │  file_path TEXT                                       │                               │
│  │  parent_path TEXT                                     │                               │
│  │  file_name TEXT                                       │                               │
│  │  extension TEXT                                       │                               │
│  │  file_size INTEGER                                    │                               │
│  │  is_directory BOOLEAN                                 │                               │
│  │  is_symlink BOOLEAN                                   │                               │
│  │  permissions TEXT                                     │                               │
│  │  owner TEXT                                           │                               │
│  │  created_at TEXT                                      │                               │
│  │  modified_at TEXT                                     │                               │
│  │  depth INTEGER                                        │                               │
│  │  category TEXT                                        │                               │
│  │  is_deleted BOOLEAN                                   │                               │
│  │FK hash_id → file_hashes.id (NULLABLE)                 │                               │
│  └────────┬──────────────────────────────────────────────┘                               │
│           │                                                                              │
│           │ 1:1 (nullable)                                                               │
│           ▼                                                                              │
│  ┌─────────────────────────────────────┐           ┌──────────────────────────┐          │
│  │          file_hashes                 │           │   duplicate_groups      │          │
│  │─────────────────────────────────────│           │──────────────────────────│          │
│  │PK id                                │           │PK id                    │          │
│  │  file_size INTEGER                  │◄──────────│FK scan_session_id       │          │
│  │  partial_hash TEXT                  │    1:N    │  file_size              │          │
│  │  full_hash TEXT (UNIQUE)            │    (via   │FK hash_id               │          │
│  │  hashed_at TEXT                     │    size+  │  file_count             │          │
│  │  hash_version INTEGER               │    hash)  │  total_wasted_bytes     │          │
│  └─────────────────────────────────────┘           │  detected_at            │          │
│                                                     │  is_verified            │          │
│  ┌─────────────────────────────────────┐           └──────────┬───────────────┘          │
│  │    duplicate_group_members          │                      │                          │
│  │─────────────────────────────────────│                      │ 1:N                      │
│  │PK id                                │                      ▼                          │
│  │FK group_id → duplicate_groups       │     ┌────────────────────────────────────┐      │
│  │FK scan_entry_id → scan_entries      │     │  duplicate_group_members           │      │
│  │  file_path (denormalized)           │     │────────────────────────────────────│      │
│  │  file_size (denormalized)           │     │PK id                               │      │
│  │  is_kept BOOLEAN                    │     │FK group_id                         │      │
│  │  is_selected BOOLEAN                │     │FK scan_entry_id                    │      │
│  └─────────────────────────────────────┘     │  file_path (denorm)                │      │
│                                              │  file_size (denorm)                │      │
│  ┌─────────────────────────────┐            │  is_kept                           │      │
│  │  cache_categories           │            │  is_selected_for_removal            │      │
│  │─────────────────────────────│            └────────────────────────────────────┘      │
│  │PK id                       │                                                         │
│  │  name (UNIQUE)             │            ┌──────────────────────────────┐             │
│  │  display_name              │            │   cache_entries              │             │
│  │  description               │            │──────────────────────────────│             │
│  │  risk_level                │◄───────────│FK category_id                │             │
│  │  created_at                │    1:N      │PK id                        │             │
│  └─────────────────────────────┘            │FK scan_session_id            │             │
│                                              │  file_path                   │             │
│  ┌─────────────────────────────┐            │  file_name                   │             │
│  │  operation_journal          │            │  file_size                   │             │
│  │─────────────────────────────│            │  is_directory                │             │
│  │PK id (UUID TEXT)            │            │  matched_rule                │             │
│  │FK scan_session_id           │            │  detected_at                 │             │
│  │  operation_type             │            │  cleaned_at                  │             │
│  │  source_path                │            │  was_cleaned                 │             │
│  │  destination_path           │            └──────────────────────────────┘             │
│  │  original_path              │                                                         │
│  │  file_size                  │            ┌──────────────────────────────┐             │
│  │  checksum_before            │            │   health_snapshots           │             │
│  │  checksum_after             │            │──────────────────────────────│             │
│  │  status                     │            │PK id                         │             │
│  │  created_at                 │◄───────────│FK volume_id                  │             │
│  │  undone_at                  │     1:N     │FK scan_session_id            │             │
│  │  error_message              │            │  overall_score               │             │
│  │  undo_stack_order           │            │  fragmentation_score         │             │
│  └─────────────────────────────┘            │  free_space_score            │             │
│                                              │  duplicate_score             │             │
│  ┌──────────────────────────────┐           │  temp_file_score             │             │
│  │  directory_summaries         │           │  large_file_score            │             │
│  │──────────────────────────────│           │  cache_score                 │             │
│  │PK id                         │           │  total_files                 │             │
│  │FK scan_session_id            │           │  total_size                  │             │
│  │  dir_path                    │           │  free_space                  │             │
│  │  parent_path                 │           │  used_space                  │             │
│  │  dir_name                    │           │  snapshot_at                 │             │
│  │  depth                       │           └──────────────────────────────┘             │
│  │  total_files                 │                                                         │
│  │  total_dirs                  │           ┌──────────────────────────────┐             │
│  │  total_size                  │           │   scan_statistics           │             │
│  │  largest_file_size           │           │──────────────────────────────│             │
│  │  file_count_by_extension     │           │PK id                         │             │
│  │  UNIQUE(session, dir_path)   │           │FK scan_session_id (UNIQUE)   │             │
│  └──────────────────────────────┘           │  file_type_breakdown (JSON)  │             │
│                                              │  size_by_extension (JSON)   │             │
│                                              │  top_directories (JSON)     │             │
│                                              │  top_files (JSON)           │             │
│                                              │  oldest_file_date           │             │
│                                              │  newest_file_date           │             │
│                                              │  average_file_size          │             │
│                                              │  median_file_size           │             │
│                                              │  calculated_at              │             │
│                                              └──────────────────────────────┘             │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Daftar Tabel & Penjelasan

### 2.1 Tabel Inti (Core)

#### `volumes`
Menyimpan informasi volume/drive yang pernah discan. Memungkinkan user beralih antar drive dan melihat riwayat per volume.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| mount_point | TEXT | NOT NULL UNIQUE | `C:\`, `/home`, `/mnt/data` |
| label | TEXT | | Nama volume (`Windows`, `Data`, etc.) |
| file_system | TEXT | | `NTFS`, `ext4`, `APFS`, `FAT32` |
| total_capacity | INTEGER | | Bytes |
| available_space | INTEGER | | Bytes |
| is_ready | BOOLEAN | DEFAULT 1 | False jika removable drive tidak terhubung |
| first_seen_at | TEXT | NOT NULL | ISO 8601 |
| last_scanned_at | TEXT | | ISO 8601 |

**Alasan:** 1 volume bisa discan berkali-kali. Memisahkan volume dari session memungkinkan tracking historis per drive.

---

#### `scan_sessions`
Setiap eksekusi scan adalah satu session. Menyimpan konfigurasi, status, dan hasil agregat.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| volume_id | INTEGER | FK → volumes.id ON DELETE CASCADE | |
| scan_path | TEXT | NOT NULL | Path spesifik yang discan |
| status | TEXT | NOT NULL DEFAULT 'pending' | `pending`, `scanning`, `completed`, `cancelled`, `failed` |
| total_files | INTEGER | DEFAULT 0 | Jumlah file ditemukan |
| total_directories | INTEGER | DEFAULT 0 | Jumlah direktori ditemukan |
| total_size | INTEGER | DEFAULT 0 | Total bytes |
| duplicates_found | INTEGER | DEFAULT 0 | |
| duplicate_size_wasted | INTEGER | DEFAULT 0 | Bytes terbuang karena duplikat |
| started_at | TEXT | | ISO 8601 |
| completed_at | TEXT | | ISO 8601 |
| duration_ms | INTEGER | | Durasi scan dalam milidetik |
| config_json | TEXT | | Snapshot konfigurasi scan (exclude pattern, depth limit, dll.) |
| error_message | TEXT | | Error message jika failed |
| is_incremental | BOOLEAN | DEFAULT 0 | True jika ini incremental scan |
| parent_session_id | INTEGER | FK → scan_sessions.id | Untuk incremental scan: session yang menjadi basis |

**Alasan:** Session memungkinkan:
- Riwayat scan (kapan, berapa lama, berapa file)
- Incremental scan (bandingkan dengan session sebelumnya)
- Isolasi data — user bisa melihat hasil scan tertentu tanpa campur aduk

---

#### `scan_entries`
**Tabel terbesar.** Menyimpan setiap file dan direktori yang ditemukan saat scan. Target: 1–10 juta+ baris.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| scan_session_id | INTEGER | FK → scan_sessions.id ON DELETE CASCADE | **WAJIB di-index** |
| file_path | TEXT | NOT NULL | Path lengkap, dinormalisasi pakai forward slash |
| parent_path | TEXT | NOT NULL | Path direktori induk (komputasi Rust) |
| file_name | TEXT | NOT NULL | Nama file/direktori |
| extension | TEXT | | Ekstensi lowercase, NULL untuk direktori |
| file_size | INTEGER | NOT NULL DEFAULT 0 | Bytes |
| is_directory | BOOLEAN | NOT NULL DEFAULT 0 | |
| is_symlink | BOOLEAN | NOT NULL DEFAULT 0 | |
| permissions | TEXT | | `rwxr-xr-x`, dll. |
| owner | TEXT | | Nama owner file (jika tersedia) |
| created_at | TEXT | | ISO 8601 — ctime |
| modified_at | TEXT | | ISO 8601 — mtime |
| depth | INTEGER | DEFAULT 0 | Kedalaman dari root scan |
| category | TEXT | | Klasifikasi: `document`, `image`, `video`, `audio`, `archive`, `cache`, `temp`, `system`, `other` |
| hash_id | INTEGER | FK → file_hashes.id ON DELETE SET NULL | Diisi lazy — hanya saat diperlukan |
| is_deleted | BOOLEAN | DEFAULT 0 | Tandai file yang tidak ada di scan selanjutnya |

**Alasan:**
- **`file_path` dipisah jadi `parent_path` + `file_name`**: Memungkinkan query direktori tree yang efisien (`WHERE parent_path = ?`)
- **`extension` dipisah**: Memungkinkan aggregasi per extension tanpa parsing string
- **`category`**: Klasifikasi cepat untuk dashboard
- **`hash_id` nullable**: Hashing dilakukan lazy (hanya untuk duplicate detection), tidak memperlambat scan
- **`is_deleted`**: Memungkinkan deteksi file yang dihapus antar scan tanpa full re-scan

---

### 2.2 Tabel Hashing & Duplicate

#### `file_hashes`
Cache hash file dengan strategi bertingkat (tiered). Satu baris per *konten unik* — bukan per file.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| file_size | INTEGER | NOT NULL | Size file saat di-hash |
| partial_hash | TEXT | | Hex blake3 dari 4KB pertama + 4KB terakhir (64 hex chars) |
| full_hash | TEXT | UNIQUE | Hex blake3 full file (64 hex chars) |
| hashed_at | TEXT | NOT NULL | ISO 8601 |
| hash_version | INTEGER | DEFAULT 1 | Untuk migrasi algoritma di masa depan |

**CHECK:** `partial_hash IS NOT NULL OR full_hash IS NOT NULL`

**Alasan desain:**
- Partial hash dan full hash dalam satu baris — tidak perlu JOIN
- `full_hash UNIQUE` — menjamin tidak ada duplikat baris untuk konten identik
- `hash_version` — antisipasi jika ganti algoritma (SHA256 → Blake3)

---

#### `duplicate_groups`
Group file duplikat. Satu group = satu set file dengan size + hash yang sama.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| scan_session_id | INTEGER | FK → scan_sessions.id ON DELETE CASCADE | |
| file_size | INTEGER | NOT NULL | Size dari file duplikat |
| hash_id | INTEGER | FK → file_hashes.id NOT NULL | Hash yang membuktikan duplikasi |
| file_count | INTEGER | NOT NULL DEFAULT 0 | Jumlah file dalam group |
| total_wasted_bytes | INTEGER | NOT NULL DEFAULT 0 | `(count - 1) * size` |
| detected_at | TEXT | NOT NULL | |
| is_verified | BOOLEAN | DEFAULT 0 | True jika sudah diverifikasi dengan full hash |

**Alasan:** Group independent dari member — memudahkan agregasi statistik dan batch operations.

---

#### `duplicate_group_members`
File-file yang termasuk dalam suatu duplicate group.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| group_id | INTEGER | FK → duplicate_groups.id ON DELETE CASCADE | |
| scan_entry_id | INTEGER | FK → scan_entries.id ON DELETE CASCADE | |
| file_path | TEXT | NOT NULL | Denormalized — untuk fast display tanpa JOIN |
| file_size | INTEGER | NOT NULL | Denormalized |
| is_kept | BOOLEAN | DEFAULT 0 | User menandai "jangan hapus" |
| is_selected_for_removal | BOOLEAN | DEFAULT 0 | User memilih untuk dihapus |

**UNIQUE:** `(group_id, scan_entry_id)`

**Alasan denormalisasi:** Saat user melihat daftar duplikat di UI, tidak perlu JOIN ke `scan_entries` — cukup baca dari `duplicate_group_members` langsung. Untuk dataset besar, ini mengurangi query time dari detik ke milidetik.

---

### 2.3 Tabel Cache Cleaner

#### `cache_categories`
Kategori cache yang dikenal sistem (Node.js, Rust, Python, dll.).

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| name | TEXT | NOT NULL UNIQUE | `node_modules`, `rust_target`, `pip_cache` |
| display_name | TEXT | NOT NULL | `Node.js node_modules`, `Rust target/` |
| description | TEXT | | Deskripsi |
| icon | TEXT | | Nama icon |
| risk_level | TEXT | NOT NULL DEFAULT 'safe' | `safe`, `moderate`, `risky` — panduan user |
| created_at | TEXT | NOT NULL | |

#### `cache_entries`
Cache spesifik yang terdeteksi.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| scan_session_id | INTEGER | FK → scan_sessions.id ON DELETE CASCADE | |
| category_id | INTEGER | FK → cache_categories.id | |
| file_path | TEXT | NOT NULL | |
| file_name | TEXT | NOT NULL | |
| file_size | INTEGER | NOT NULL | |
| is_directory | BOOLEAN | DEFAULT 1 | |
| matched_rule | TEXT | | Rule pattern yang match |
| detected_at | TEXT | NOT NULL | |
| cleaned_at | TEXT | | Ketika dibersihkan |
| was_cleaned | BOOLEAN | DEFAULT 0 | |

**Alasan:** Memisahkan category (definisi) dari entry (instance) memungkinkan:
- Rule set di-version dan di-sync
- Statistik per kategori
- User bisa enable/disable per kategori

---

### 2.4 Tabel Operasi File

#### `operation_journal`
**Write-ahead journal untuk operasi file.** Setiap move/delete/trash dicatat SEBELUM dieksekusi. Ini adalah jantung fitur keamanan PetaByte.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | TEXT | PK | UUID v4 |
| scan_session_id | INTEGER | FK → scan_sessions.id | |
| operation_type | TEXT | NOT NULL | `move`, `trash`, `delete`, `restore` |
| source_path | TEXT | NOT NULL | Path asli |
| destination_path | TEXT | | Path tujuan (NULL untuk delete/trash) |
| original_path | TEXT | | Untuk restore/undo — path sebelum operasi |
| file_size | INTEGER | | |
| checksum_before | TEXT | | Blake3 hash SEBELUM operasi — verifikasi integritas |
| checksum_after | TEXT | | Blake3 hash SESUDAH operasi — verifikasi sukses |
| status | TEXT | NOT NULL DEFAULT 'completed' | `pending`, `completed`, `undone`, `failed` |
| created_at | TEXT | NOT NULL | |
| undone_at | TEXT | | |
| error_message | TEXT | | |
| undo_stack_order | INTEGER | | Urutan undo (stack LIFO) |

**Alasan:** 
- **Data loss prevention:** Setiap operasi tercatat dan bisa di-undo
- **Crash recovery:** Jika app crash di tengah move, journal bisa recovery
- **Audit trail:** Semua perubahan file tercatat
- **Integrity verification:** Checksum before/after memastikan file tidak corrupt

---

### 2.5 Tabel Statistik & Aggregasi

#### `directory_summaries`
Pre-computed aggregasi per direktori. **Dibuat SETELAH scan selesai** untuk performa tree view.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| scan_session_id | INTEGER | FK → scan_sessions.id ON DELETE CASCADE | |
| dir_path | TEXT | NOT NULL | |
| parent_path | TEXT | NOT NULL | Untuk query hirarkis |
| dir_name | TEXT | NOT NULL | |
| depth | INTEGER | DEFAULT 0 | |
| total_files | INTEGER | DEFAULT 0 | |
| total_directories | INTEGER | DEFAULT 0 | |
| total_size | INTEGER | DEFAULT 0 | |
| largest_file_size | INTEGER | | |
| file_count_by_extension | TEXT | | JSON: `{"jpg":150,"mp4":20}` |

**UNIQUE:** `(scan_session_id, dir_path)`

**Alasan:** Tanpa tabel ini, tree view harus `GROUP BY parent_path` + `SUM(file_size)` dari 1M+ baris — terlalu lambat untuk UI real-time. Pre-compute setelah scan.

#### `scan_statistics`
Statistik agregat per scan. Satu baris per session.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| scan_session_id | INTEGER | FK UNIQUE → scan_sessions.id CASCADE | |
| file_type_breakdown | TEXT | | JSON: `{"image":500,"video":20,...}` |
| size_by_extension | TEXT | | JSON: `{"mp4":1073741824,"jpg":524288000}` |
| top_directories_json | TEXT | | JSON: Top 100 direktori terbesar |
| top_files_json | TEXT | | JSON: Top 100 file terbesar |
| oldest_file_date | TEXT | | |
| newest_file_date | TEXT | | |
| average_file_size | REAL | | |
| median_file_size | REAL | | |
| calculated_at | TEXT | NOT NULL | |

**Alasan:** Dashboard perlu statistik ini setiap kali user membuka app. Komputasi ulang dari 1M+ baris setiap kali tidak feasible. Pre-compute sekali, simpan.

---

### 2.6 Tabel Pendukung

#### `health_snapshots`
Riwayat storage health score. Memungkinkan trend analysis.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| volume_id | INTEGER | FK → volumes.id ON DELETE CASCADE | |
| scan_session_id | INTEGER | FK → scan_sessions.id | |
| overall_score | REAL | NOT NULL | 0.0 – 100.0 |
| fragmentation_score | REAL | | |
| free_space_score | REAL | | |
| duplicate_score | REAL | | |
| temp_file_score | REAL | | |
| large_file_score | REAL | | |
| cache_score | REAL | | |
| total_files | INTEGER | | |
| total_size | INTEGER | | |
| free_space | INTEGER | | |
| used_space | INTEGER | | |
| snapshot_at | TEXT | NOT NULL | |

**UNIQUE:** `(volume_id, snapshot_at)`

**Alasan:** User bisa melihat "storage health saya turun 5% minggu ini" — fitur pembeda dari kompetitor.

#### `scan_exclusions`
Pola exclude yang ditentukan user.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| id | INTEGER | PK AUTOINCREMENT | |
| pattern | TEXT | NOT NULL | `**/node_modules`, `*.tmp` |
| is_regex | BOOLEAN | DEFAULT 0 | |
| description | TEXT | | |
| created_at | TEXT | NOT NULL | |
| is_active | BOOLEAN | DEFAULT 1 | |

#### `app_settings`
Key-value store untuk konfigurasi aplikasi.

| Kolom | Type | Constraint | Notes |
|-------|------|-----------|-------|
| key | TEXT | PK | |
| value | TEXT | NOT NULL | JSON-encoded value |
| updated_at | TEXT | NOT NULL | |

---

## 3. Complete SQL Schema

```sql
-- ============================================================
-- PetaByte Database Schema v1
-- SQLite 3.45+ (WAL mode required)
-- ============================================================

-- ===========================
-- PRAGMA (set via connection)
-- ===========================
-- PRAGMA journal_mode = WAL;
-- PRAGMA busy_timeout = 5000;
-- PRAGMA synchronous = NORMAL;
-- PRAGMA cache_size = -64000;      -- 64MB cache
-- PRAGMA page_size = 4096;
-- PRAGMA temp_store = MEMORY;
-- PRAGMA mmap_size = 268435456;    -- 256MB memory map
-- PRAGMA foreign_keys = ON;

-- ===========================
-- VOLUMES
-- ===========================
CREATE TABLE IF NOT EXISTS volumes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    mount_point     TEXT    NOT NULL UNIQUE,
    label           TEXT,
    file_system     TEXT,
    total_capacity  INTEGER,
    available_space INTEGER,
    is_ready        BOOLEAN NOT NULL DEFAULT 1,
    first_seen_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    last_scanned_at TEXT
);

-- ===========================
-- SCAN SESSIONS
-- ===========================
CREATE TABLE IF NOT EXISTS scan_sessions (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    volume_id              INTEGER NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
    scan_path              TEXT    NOT NULL,
    status                 TEXT    NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','scanning','completed','cancelled','failed')),
    total_files            INTEGER NOT NULL DEFAULT 0,
    total_directories      INTEGER NOT NULL DEFAULT 0,
    total_size             INTEGER NOT NULL DEFAULT 0,
    duplicates_found       INTEGER NOT NULL DEFAULT 0,
    duplicate_size_wasted  INTEGER NOT NULL DEFAULT 0,
    started_at             TEXT,
    completed_at           TEXT,
    duration_ms            INTEGER,
    config_json            TEXT,
    error_message          TEXT,
    is_incremental         BOOLEAN NOT NULL DEFAULT 0,
    parent_session_id      INTEGER REFERENCES scan_sessions(id)
);

-- ===========================
-- SCAN ENTRIES (largest table: 1M–10M+ rows)
-- ===========================
CREATE TABLE IF NOT EXISTS scan_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_session_id INTEGER NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
    file_path       TEXT    NOT NULL,
    parent_path     TEXT    NOT NULL,
    file_name       TEXT    NOT NULL,
    extension       TEXT,
    file_size       INTEGER NOT NULL DEFAULT 0,
    is_directory    BOOLEAN NOT NULL DEFAULT 0,
    is_symlink      BOOLEAN NOT NULL DEFAULT 0,
    permissions     TEXT,
    owner           TEXT,
    created_at      TEXT,
    modified_at     TEXT,
    depth           INTEGER NOT NULL DEFAULT 0,
    category        TEXT
                     CHECK (category IN ('document','image','video','audio','archive',
                                         'cache','temp','system','executable','other')),
    hash_id         INTEGER REFERENCES file_hashes(id) ON DELETE SET NULL,
    is_deleted      BOOLEAN NOT NULL DEFAULT 0
);

-- ===========================
-- FILE HASHES (tiered hashing cache)
-- ===========================
CREATE TABLE IF NOT EXISTS file_hashes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    file_size     INTEGER NOT NULL,
    partial_hash  TEXT,
    full_hash     TEXT    UNIQUE,
    hashed_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    hash_version  INTEGER NOT NULL DEFAULT 1,
    CHECK (partial_hash IS NOT NULL OR full_hash IS NOT NULL)
);

-- ===========================
-- DUPLICATE GROUPS
-- ===========================
CREATE TABLE IF NOT EXISTS duplicate_groups (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_session_id     INTEGER NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
    file_size           INTEGER NOT NULL,
    hash_id             INTEGER NOT NULL REFERENCES file_hashes(id),
    file_count          INTEGER NOT NULL DEFAULT 0,
    total_wasted_bytes  INTEGER NOT NULL DEFAULT 0,
    detected_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    is_verified         BOOLEAN NOT NULL DEFAULT 0
);

-- ===========================
-- DUPLICATE GROUP MEMBERS
-- ===========================
CREATE TABLE IF NOT EXISTS duplicate_group_members (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id                  INTEGER NOT NULL REFERENCES duplicate_groups(id) ON DELETE CASCADE,
    scan_entry_id             INTEGER NOT NULL REFERENCES scan_entries(id) ON DELETE CASCADE,
    file_path                 TEXT    NOT NULL,
    file_size                 INTEGER NOT NULL,
    is_kept                   BOOLEAN NOT NULL DEFAULT 0,
    is_selected_for_removal   BOOLEAN NOT NULL DEFAULT 0,
    UNIQUE(group_id, scan_entry_id)
);

-- ===========================
-- CACHE CLEANER
-- ===========================
CREATE TABLE IF NOT EXISTS cache_categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL UNIQUE,
    display_name  TEXT    NOT NULL,
    description   TEXT,
    icon          TEXT,
    risk_level    TEXT    NOT NULL DEFAULT 'safe'
                      CHECK (risk_level IN ('safe','moderate','risky')),
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS cache_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_session_id INTEGER NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
    category_id     INTEGER NOT NULL REFERENCES cache_categories(id),
    file_path       TEXT    NOT NULL,
    file_name       TEXT    NOT NULL,
    file_size       INTEGER NOT NULL DEFAULT 0,
    is_directory    BOOLEAN NOT NULL DEFAULT 1,
    matched_rule    TEXT,
    detected_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    cleaned_at      TEXT,
    was_cleaned     BOOLEAN NOT NULL DEFAULT 0
);

-- ===========================
-- OPERATION JOURNAL (undo/audit trail)
-- ===========================
CREATE TABLE IF NOT EXISTS operation_journal (
    id                TEXT    PRIMARY KEY,  -- UUID v4
    scan_session_id   INTEGER REFERENCES scan_sessions(id),
    operation_type    TEXT    NOT NULL
                        CHECK (operation_type IN ('move','trash','delete','restore')),
    source_path       TEXT    NOT NULL,
    destination_path  TEXT,
    original_path     TEXT,
    file_size         INTEGER,
    checksum_before   TEXT,
    checksum_after    TEXT,
    status            TEXT    NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('pending','completed','undone','failed')),
    created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    undone_at         TEXT,
    error_message     TEXT,
    undo_stack_order  INTEGER
);

-- ===========================
-- DIRECTORY SUMMARIES (pre-computed tree view)
-- ===========================
CREATE TABLE IF NOT EXISTS directory_summaries (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_session_id          INTEGER NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
    dir_path                 TEXT    NOT NULL,
    parent_path              TEXT    NOT NULL,
    dir_name                 TEXT    NOT NULL,
    depth                    INTEGER NOT NULL DEFAULT 0,
    total_files              INTEGER NOT NULL DEFAULT 0,
    total_directories        INTEGER NOT NULL DEFAULT 0,
    total_size               INTEGER NOT NULL DEFAULT 0,
    largest_file_size        INTEGER DEFAULT 0,
    file_count_by_extension  TEXT,
    UNIQUE(scan_session_id, dir_path)
);

-- ===========================
-- HEALTH SNAPSHOTS
-- ===========================
CREATE TABLE IF NOT EXISTS health_snapshots (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    volume_id            INTEGER NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
    scan_session_id      INTEGER REFERENCES scan_sessions(id),
    overall_score        REAL    NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    fragmentation_score  REAL,
    free_space_score     REAL,
    duplicate_score      REAL,
    temp_file_score      REAL,
    large_file_score     REAL,
    cache_score          REAL,
    total_files          INTEGER,
    total_size           INTEGER,
    free_space           INTEGER,
    used_space           INTEGER,
    snapshot_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(volume_id, snapshot_at)
);

-- ===========================
-- SCAN STATISTICS (pre-computed per session)
-- ===========================
CREATE TABLE IF NOT EXISTS scan_statistics (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_session_id      INTEGER NOT NULL UNIQUE REFERENCES scan_sessions(id) ON DELETE CASCADE,
    file_type_breakdown  TEXT,
    size_by_extension    TEXT,
    top_directories_json TEXT,
    top_files_json       TEXT,
    oldest_file_date     TEXT,
    newest_file_date     TEXT,
    average_file_size    REAL,
    median_file_size     REAL,
    calculated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ===========================
-- SCAN EXCLUSIONS (user-defined ignore patterns)
-- ===========================
CREATE TABLE IF NOT EXISTS scan_exclusions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern     TEXT    NOT NULL,
    is_regex    BOOLEAN NOT NULL DEFAULT 0,
    description TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    is_active   BOOLEAN NOT NULL DEFAULT 1
);

-- ===========================
-- APP SETTINGS (key-value config)
-- ===========================
CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

---

## 4. Index Recommendation

### 4.1 Wajib (Query Performance)

```sql
-- ===========================
-- SCAN ENTRIES INDEXES (KRITIS)
-- ===========================

-- 1. Browse file tree by parent directory (paling sering dipakai)
CREATE INDEX IF NOT EXISTS idx_scan_entries_parent
    ON scan_entries(scan_session_id, parent_path, file_name);

-- 2. Find large files (dashboard, large file feature)
CREATE INDEX IF NOT EXISTS idx_scan_entries_size
    ON scan_entries(scan_session_id, file_size DESC)
    WHERE is_directory = 0;

-- 3. Group by extension (file type breakdown)
CREATE INDEX IF NOT EXISTS idx_scan_entries_extension
    ON scan_entries(scan_session_id, extension)
    WHERE extension IS NOT NULL;

-- 4. Group by file size (tier 1 duplicate detection)
CREATE INDEX IF NOT EXISTS idx_scan_entries_size_group
    ON scan_entries(scan_session_id, file_size)
    WHERE is_directory = 0;

-- 5. Lookup by hash_id (lazy hash assignment)
CREATE INDEX IF NOT EXISTS idx_scan_entries_hash
    ON scan_entries(hash_id)
    WHERE hash_id IS NOT NULL;

-- 6. Filter by category (dashboard)
CREATE INDEX IF NOT EXISTS idx_scan_entries_category
    ON scan_entries(scan_session_id, category)
    WHERE category IS NOT NULL;

-- 7. For incremental scan: find deleted files
CREATE INDEX IF NOT EXISTS idx_scan_entries_deleted
    ON scan_entries(scan_session_id, is_deleted)
    WHERE is_deleted = 1;

-- 8. Search by file name (user search)
CREATE INDEX IF NOT EXISTS idx_scan_entries_name_search
    ON scan_entries(file_name COLLATE NOCASE);
```

### 4.2 Pendukung (Non-Critical but Helpful)

```sql
-- Duplicate detection pipeline
CREATE INDEX IF NOT EXISTS idx_duplicate_groups_session
    ON duplicate_groups(scan_session_id, file_size);

-- Fast lookup: which group is a file in?
CREATE INDEX IF NOT EXISTS idx_dup_member_entry
    ON duplicate_group_members(scan_entry_id);

-- Directory summaries tree navigation
CREATE INDEX IF NOT EXISTS idx_dir_summaries_parent
    ON directory_summaries(scan_session_id, parent_path);

-- Health score history per volume
CREATE INDEX IF NOT EXISTS idx_health_snapshots_volume
    ON health_snapshots(volume_id, snapshot_at DESC);

-- Operation journal: undo stack per session
CREATE INDEX IF NOT EXISTS idx_journal_session
    ON operation_journal(scan_session_id, undo_stack_order);

-- Cache entries per session
CREATE INDEX IF NOT EXISTS idx_cache_entries_session
    ON cache_entries(scan_session_id, category_id);

-- Scan sessions history per volume
CREATE INDEX IF NOT EXISTS idx_sessions_volume_date
    ON scan_sessions(volume_id, started_at DESC);
```

### 4.3 Partial Indexes (Optimasi Spesifik)

```sql
-- Hanya file, bukan direktori (untuk large file & duplicate queries)
CREATE INDEX IF NOT EXISTS idx_scan_entries_files_only
    ON scan_entries(scan_session_id, file_size DESC, file_name)
    WHERE is_directory = 0;

-- File yang belum di-hash (untuk batch hashing)
CREATE INDEX IF NOT EXISTS idx_scan_entries_unhashed
    ON scan_entries(scan_session_id, file_size)
    WHERE hash_id IS NULL AND is_directory = 0;
```

### 4.4 Index Usage Strategy

| Use Case | Index | Type |
|----------|-------|------|
| Tree view (expand folder) | `idx_scan_entries_parent` | B-tree (scan_session, parent, name) |
| Large file list | `idx_scan_entries_size` | Partial B-tree DESC |
| File type breakdown | `idx_scan_entries_extension` | Partial B-tree |
| Duplicate detection tier 1 | `idx_scan_entries_size_group` | B-tree |
| File search | `idx_scan_entries_name_search` | B-tree COLLATE NOCASE |
| Dashboard stats | `idx_scan_entries_files_only` | Partial B-tree cover |

---

## 5. Strategi Hash File (Tiered Hashing)

### 5.1 Alur Hashing

```
                 ┌─────────────────────────────────────┐
                 │        scan_entries (1M+ rows)       │
                 │  Setiap baris: hash_id = NULL         │
                 └────────────────┬────────────────────┘
                                  │
                  Step 1: Group by file_size
                  ┌───────────────┴────────────────┐
                  │  SELECT file_size, COUNT(*)     │
                  │  FROM scan_entries              │
                  │  WHERE session=? AND NOT dir    │
                  │  GROUP BY file_size             │
                  │  HAVING COUNT(*) > 1            │
                  └───────────────┬────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Only size groups with    │
                    │   duplicates proceed       │
                    └─────────────┬─────────────┘
                                  │
                  Step 2: Partial Hash (fast)
                  ┌───────────────┴────────────────┐
                  │  Hash first 4KB + last 4KB     │
                  │  (Blake3, streaming, O(1) I/O) │
                  │                                │
                  │  INSERT INTO file_hashes       │
                  │    (file_size, partial_hash)   │
                  │                                │
                  │  UPDATE scan_entries            │
                  │    SET hash_id = ?             │
                  │    WHERE id = ?                │
                  └───────────────┬────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Group by partial_hash    │
                    │   Eliminates ~95% of       │
                    │   false positives          │
                    └─────────────┬─────────────┘
                                  │
                  Step 3: Full Hash (CPU-bound)
                  ┌───────────────┴────────────────┐
                  │  Only for remaining candidates │
                  │  Full Blake3 hash              │
                  │                                │
                  │  UPDATE file_hashes            │
                  │    SET full_hash = ?           │
                  │    WHERE id = ?                │
                  └───────────────┬────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Full hash match = 100%   │
                    │   confirmed duplicate      │
                    │                            │
                    │   INSERT INTO              │
                    │   duplicate_groups         │
                    └───────────────────────────┘
```

### 5.2 Hash Table Design

```sql
-- file_hashes: Satu baris PER KONTEN UNIK, bukan per file
-- Multiple scan_entries bisa指向 hash_id yang sama

-- Contoh data:
-- id | file_size | partial_hash                    | full_hash                        | hash_version
-- 1  | 1024      | a1b2c3d4... (64 hex chars)     | NULL                             | 1
-- 2  | 1048576   | e5f6g7h8...                     | 9a8b7c6d5e4f3a2b1c... (64 hex)  | 1
-- 3  | 1024      | a1b2c3d4...                     | 9a8b7c6d5e4f3a2b1c...           | 1
```

**Partial hash vs Full hash:**
- Partial: 8 KB data (4+4), ~1ms per file, elimininasi ~95% false positives
- Full: seluruh file, ~50-500ms per file (tergantung ukuran), hanya untuk kandidat serius

**Hash cache strategy:**
```sql
-- Cek apakah hash sudah pernah dibuat (untuk scan ulang)
SELECT id FROM file_hashes
WHERE file_size = ? AND partial_hash = ? AND full_hash IS NOT NULL
LIMIT 1;

-- Jika ditemukan, reuse hash_id — tidak perlu hash ulang
```

**Keuntungan terpisahnya partial_hash dan full_hash:**
- Partial hash bisa dihitung saat scan (lazy, minimal overhead)
- Full hash hanya dihitung untuk kandidat duplikat
- Partial hash bisa menjadi signature untuk deteksi perubahan file antar scan

---

## 6. Strategi Duplicate Grouping

### 6.1 Alur Lengkap

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DUPLICATE DETECTION PIPELINE                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TIER 1: Size Grouping (SQL, < 1 detik untuk 10M files)                │
│  ───────────────────────────────────────────────────────────────         │
│                                                                          │
│  SELECT file_size, COUNT(*) as cnt, ARRAY_AGG(id) as file_ids           │
│  FROM scan_entries                                                       │
│  WHERE scan_session_id = ? AND is_directory = 0                         │
│  GROUP BY file_size                                                      │
│  HAVING cnt > 1                                                          │
│                                                                          │
│  Result: hanya size groups dengan potensi duplikat                      │
│  Biasanya < 5% dari total file masuk tier 2                            │
│                                                                          │
│  TIER 2: Partial Hash (Rust, I/O bound)                                │
│  ───────────────────────────────────────────────────────────────         │
│                                                                          │
│  For each size group from Tier 1:                                       │
│    1. Hash first 4KB + last 4KB setiap file                            │
│    2. Simpan di file_hashes(partial_hash)                              │
│    3. Kelompokkan berdasarkan (file_size, partial_hash)                │
│    4. Hanya group dengan COUNT > 1 lanjut ke Tier 3                    │
│                                                                          │
│  Eliminasi: ~95% dari Tier 1 tidak lanjut ke Tier 3                    │
│                                                                          │
│  TIER 3: Full Hash (Rust, CPU bound)                                   │
│  ───────────────────────────────────────────────────────────────         │
│                                                                          │
│  For each remaining candidate:                                          │
│    1. Full Blake3 hash seluruh file                                    │
│    2. Update file_hashes(full_hash)                                    │
│    3. INSERT INTO duplicate_groups                                     │
│    4. INSERT INTO duplicate_group_members                              │
│                                                                          │
│  Hasil: duplicate groups terverifikasi 100%                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Query Examples

```sql
-- Get all duplicate groups for a session (dashboard view)
SELECT
    dg.id,
    dg.file_size,
    dg.file_count,
    dg.total_wasted_bytes,
    dg.is_verified,
    fh.partial_hash,
    fh.full_hash
FROM duplicate_groups dg
JOIN file_hashes fh ON fh.id = dg.hash_id
WHERE dg.scan_session_id = ?
ORDER BY dg.total_wasted_bytes DESC;

-- Get members of a specific duplicate group
SELECT
    dgm.id,
    dgm.file_path,
    dgm.file_size,
    dgm.is_kept,
    dgm.is_selected_for_removal,
    se.modified_at,
    se.category
FROM duplicate_group_members dgm
JOIN scan_entries se ON se.id = dgm.scan_entry_id
WHERE dgm.group_id = ?
ORDER BY dgm.file_path;

-- Total waste calculation per session
SELECT
    COUNT(*) as total_groups,
    SUM(file_count) as total_duplicate_files,
    SUM(total_wasted_bytes) as total_wasted_bytes
FROM duplicate_groups
WHERE scan_session_id = ?;

-- Cleanup: remove a duplicate group (user action)
DELETE FROM duplicate_groups WHERE id = ?;
-- CASCADE will delete members automatically
```

---

## 7. Strategi Scan History

### 7.1 Model Data Riwayat

```
volumes
    │
    ├── scan_sessions (v1.0 — full scan)
    │   ├── scan_entries (jutaan baris)
    │   ├── directory_summaries
    │   ├── scan_statistics
    │   └── duplicate_groups
    │
    ├── scan_sessions (v1.1 — incremental)
    │   ├── parent_session_id → v1.0
    │   └── scan_entries (hanya file yang berubah)
    │
    └── scan_sessions (v1.2 — incremental)
        └── ...
```

### 7.2 Incremental Scan Strategy

```sql
-- 1. Bandingkan file list dengan session sebelumnya
SELECT
    s1.file_path,
    s1.file_size,
    s1.modified_at
FROM scan_entries s1
WHERE s1.scan_session_id = ?  -- session baru
  AND s1.file_path NOT IN (
      SELECT file_path
      FROM scan_entries
      WHERE scan_session_id = ?  -- session lama
        AND is_deleted = 0
  );

-- 2. Tandai file yang tidak ada di session baru sebagai is_deleted
UPDATE scan_entries
SET is_deleted = 1
WHERE scan_session_id = ?  -- session lama
  AND file_path NOT IN (
      SELECT file_path
      FROM scan_entries
      WHERE scan_session_id = ?  -- session baru
  );
```

### 7.3 Riwayat Tampilan

```sql
-- Get scan history for a volume (UI: scan history list)
SELECT
    id,
    scan_path,
    status,
    total_files,
    total_size,
    started_at,
    completed_at,
    duration_ms,
    is_incremental,
    config_json
FROM scan_sessions
WHERE volume_id = ?
ORDER BY started_at DESC
LIMIT 20;

-- Compare two scans (UI: what changed)
SELECT
    COALESCE(new.file_path, old.file_path) as file_path,
    CASE
        WHEN new.id IS NULL THEN 'deleted'
        WHEN old.id IS NULL THEN 'new'
        WHEN new.file_size != old.file_size THEN 'modified'
        WHEN new.modified_at != old.modified_at THEN 'touched'
        ELSE 'unchanged'
    END as change_type,
    old.file_size as old_size,
    new.file_size as new_size
FROM scan_entries old
FULL OUTER JOIN scan_entries new
    ON old.file_path = new.file_path
    AND old.scan_session_id = ?
    AND new.scan_session_id = ?
WHERE old.id IS NOT NULL OR new.id IS NOT NULL;
```

### 7.4 Retensi Data

```sql
-- Hapus session lama (otomatis cascade ke scan_entries)
DELETE FROM scan_sessions
WHERE volume_id = ?
  AND started_at < date('now', '-90 days')
  AND id NOT IN (
      SELECT MAX(id) FROM scan_sessions
      WHERE volume_id = ?
      GROUP BY scan_path
  );
```

---

## 8. Optimasi SQLite untuk Dataset Besar

### 8.1 Connection Configuration

```sql
-- WAJIB: Setiap kali buka koneksi
PRAGMA journal_mode = WAL;           -- Write-Ahead Logging: concurrent read+write
PRAGMA busy_timeout = 5000;          -- 5 detik timeout, jangan langsung SQLITE_BUSY
PRAGMA synchronous = NORMAL;         -- Cepat + aman (WAL mode)
PRAGMA foreign_keys = ON;            -- Enforce referential integrity
PRAGMA cache_size = -64000;          -- 64MB page cache
PRAGMA page_size = 4096;             -- 4KB pages (optimal untuk SSD)
PRAGMA temp_store = MEMORY;          -- Temp tables di memory
PRAGMA mmap_size = 268435456;        -- 256MB memory-mapped I/O
PRAGMA threads = 4;                  -- Parallel query (SQLite 3.38+)
```

### 8.2 Batch Insert Strategy

```rust
// Pseudocode — batch insert pattern
// JANGAN insert satu per satu → 1000x lebih lambat

BEGIN TRANSACTION;
    INSERT INTO scan_entries (scan_session_id, file_path, parent_path, file_name, ...)
    VALUES (?, ?, ?, ?, ...);  -- row 1
    INSERT INTO scan_entries (scan_session_id, file_path, parent_path, file_name, ...)
    VALUES (?, ?, ?, ?, ...);  -- row 2
    -- ... 500-1000 rows per transaction
COMMIT;
```

```sql
-- Lebih cepat: batch INSERT dengan UNION ALL
INSERT INTO scan_entries
    (scan_session_id, file_path, parent_path, file_name, extension, file_size, ...)
SELECT * FROM (
    SELECT 1 AS scan_session_id, '/path/file1.txt' AS file_path, '/path' AS parent_path, 'file1.txt' AS file_name, 'txt' AS extension, 1024 AS file_size, ...
    UNION ALL
    SELECT 1, '/path/file2.txt', '/path', 'file2.txt', 'txt', 2048, ...
    UNION ALL
    -- ... 500 rows
);
```

**Target:** 500–1000 rows per transaction, commit every 50K rows untuk menjaga WAL size.

### 8.3 Query Optimization Rules

```sql
-- 1. SELALU gunakan covering index untuk query umum
-- ❌ BURUK: harus baca baris untuk dapat file_size
SELECT file_name FROM scan_entries
WHERE scan_session_id = 1 AND parent_path = '/home';

-- ✅ BAIK: index sudah mencakup semua kolom yang di-SELECT
-- idx_scan_entries_parent mencakup (scan_session_id, parent_path, file_name)
-- Tapi file_size tidak di index → masih perlu baca baris
-- Optimal: tambahkan INCLUDE columns
```

**Untuk SQLite < 3.40 (tanpa INCLUDE):**
```sql
-- Buat index yang mencakup kolom yang sering di-query bersama
CREATE INDEX idx_scan_entries_parent_cover
    ON scan_entries(scan_session_id, parent_path, file_name, file_size, is_directory);
```

**SQLite 3.40+ dengan INCLUDE:**
```sql
CREATE INDEX idx_scan_entries_parent
    ON scan_entries(scan_session_id, parent_path, file_name)
    INCLUDE (file_size, is_directory, extension, file_path);
```

### 8.4 EXPLAIN QUERY PLAN Analysis

```sql
-- Test query plan sebelum deploy
EXPLAIN QUERY PLAN
SELECT file_name, file_size
FROM scan_entries
WHERE scan_session_id = 1 AND parent_path = '/home/user'
ORDER BY file_size DESC;

-- Target output:
-- |--SEARCH scan_entries USING INDEX idx_scan_entries_parent (...)
-- |--USE TEMP B-TREE FOR ORDER BY   ← ⚠️ Berarti perlu index sorted
```

### 8.5 Statistik Query

```sql
-- Update statistik untuk query planner (setelah scan besar)
ANALYZE;

-- Atau auto-analyze threshold
PRAGMA analysis_limit = 1000;
PRAGMA auto_analyze = 1;
```

### 8.6 Maintenance

```sql
-- Setelah hapus data besar (scan session)
VACUUM;

-- Atau incremental vacuum (tanpa lock exclusive)
PRAGMA incremental_vacuum = 10;  -- 10% dari pages

-- Reindex setelah perubahan besar
REINDEX;

-- Integrity check (mingguan)
PRAGMA integrity_check;
```

### 8.7 Performance Budget

| Operasi | Target (1M files) | Target (10M files) |
|---------|-------------------|--------------------|
| Batch insert (500 rows) | < 10ms | < 15ms |
| Tree view (expand folder) | < 50ms | < 200ms |
| Large file query (top 100) | < 20ms | < 50ms |
| Duplicate size grouping | < 100ms | < 1s |
| Full scan insert (all files) | < 30s | < 5 menit |
| Database file size | ~120 MB | ~1.2 GB |

---

## 9. Ringkasan (30 Detik)

| Aspek | Keputusan |
|-------|-----------|
| **Jumlah tabel** | 13 tabel (6 inti + 3 cache/cleaner + 2 journal + 2 statistik) |
| **Tabel terbesar** | `scan_entries` — 1M-10M+ baris, ~120 MB per 1M files |
| **Primary key strategy** | `INTEGER PRIMARY KEY AUTOINCREMENT` (clustered index SQLite) |
| **Index wajib** | 7 index utama + 4 partial index untuk query kritis |
| **Hash strategy** | 3-tier: size → partial (4KB×2) → full (Blake3), lazy population |
| **Duplicate detection** | SQL grouping (size) → Rust partial hash → Rust full hash |
| **Optimasi utama** | WAL mode, batch insert, covering indexes, pre-computed summaries |
| **Safety net** | `operation_journal` — write-ahead journal + checksum verification |
| **Scan history** | `scan_sessions` dengan parent chain untuk incremental scan |
