pub const CREATE_FILE_HASHES: &str = "
CREATE TABLE IF NOT EXISTS file_hashes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    file_size     INTEGER NOT NULL,
    partial_hash  TEXT,
    full_hash     TEXT NOT NULL,
    algorithm     TEXT NOT NULL DEFAULT 'Blake3',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    access_count  INTEGER NOT NULL DEFAULT 1
);
";

pub const CREATE_DUPLICATE_GROUPS: &str = "
CREATE TABLE IF NOT EXISTS duplicate_groups (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_session_id   TEXT NOT NULL,
    hash_id           INTEGER,
    file_size         INTEGER NOT NULL,
    partial_hash      TEXT,
    full_hash         TEXT NOT NULL,
    file_count        INTEGER NOT NULL DEFAULT 1,
    total_wasted_bytes INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (scan_session_id) REFERENCES scan_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (hash_id) REFERENCES file_hashes(id) ON DELETE SET NULL
);
";

pub const CREATE_DUPLICATE_GROUP_MEMBERS: &str = "
CREATE TABLE IF NOT EXISTS duplicate_group_members (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id          INTEGER NOT NULL,
    scan_entry_id     INTEGER,
    file_path         TEXT NOT NULL,
    file_name         TEXT,
    file_size         INTEGER NOT NULL DEFAULT 0,
    is_keep           INTEGER NOT NULL DEFAULT 0,
    marked_for_removal INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (group_id) REFERENCES duplicate_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (scan_entry_id) REFERENCES scan_files(id) ON DELETE SET NULL
);
";

pub const CREATE_DUPLICATE_INDEXES: &str = "
CREATE INDEX IF NOT EXISTS idx_duplicate_groups_session
    ON duplicate_groups(scan_session_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_group_members_group
    ON duplicate_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_group_members_path
    ON duplicate_group_members(scan_entry_id);
CREATE INDEX IF NOT EXISTS idx_file_hashes_size
    ON file_hashes(file_size);
CREATE INDEX IF NOT EXISTS idx_file_hashes_partial
    ON file_hashes(file_size, partial_hash) WHERE partial_hash IS NOT NULL;
";

pub fn run_duplicate_migration(
    conn: &crate::connection::ConnectionManager,
) -> Result<(), crate::error::DatabaseError> {
    conn.run_migration(CREATE_FILE_HASHES)?;
    conn.run_migration(CREATE_DUPLICATE_GROUPS)?;
    conn.run_migration(CREATE_DUPLICATE_GROUP_MEMBERS)?;
    conn.run_migration(CREATE_DUPLICATE_INDEXES)?;
    Ok(())
}
