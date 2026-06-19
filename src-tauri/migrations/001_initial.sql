-- ============================================================
-- PetaByte Database Schema v1
-- SQLite 3.45+ (WAL mode required)
-- ============================================================
-- Migration 001: Initial Schema
-- Applied on first launch
-- ============================================================

-- ===========================
-- PRAGMA (applied by Rust code)
-- ===========================
-- PRAGMA journal_mode = WAL;
-- PRAGMA busy_timeout = 5000;
-- PRAGMA synchronous = NORMAL;
-- PRAGMA cache_size = -64000;
-- PRAGMA page_size = 4096;
-- PRAGMA temp_store = MEMORY;
-- PRAGMA mmap_size = 268435456;
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
-- SCAN ENTRIES (largest table)
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
-- OPERATION JOURNAL
-- ===========================
CREATE TABLE IF NOT EXISTS operation_journal (
    id                TEXT    PRIMARY KEY,
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
-- DIRECTORY SUMMARIES
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
-- SCAN STATISTICS
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
-- SCAN EXCLUSIONS
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
-- APP SETTINGS
-- ===========================
CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
