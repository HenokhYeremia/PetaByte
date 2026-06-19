pub const CREATE_SCAN_SESSIONS: &str = "
CREATE TABLE IF NOT EXISTS scan_sessions (
    session_id     TEXT PRIMARY KEY,
    root_path      TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'Pending',
    started_at     TEXT NOT NULL,
    completed_at   TEXT,
    total_files    INTEGER NOT NULL DEFAULT 0,
    total_dirs     INTEGER NOT NULL DEFAULT 0,
    total_size     INTEGER NOT NULL DEFAULT 0,
    total_errors   INTEGER NOT NULL DEFAULT 0
);
";

pub const CREATE_SCAN_FILES: &str = "
CREATE TABLE IF NOT EXISTS scan_files (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT NOT NULL,
    file_path     TEXT NOT NULL,
    parent_path   TEXT,
    file_name     TEXT NOT NULL,
    extension     TEXT,
    file_size     INTEGER NOT NULL DEFAULT 0,
    is_directory  INTEGER NOT NULL DEFAULT 0,
    is_symlink    INTEGER NOT NULL DEFAULT 0,
    permissions   INTEGER NOT NULL DEFAULT 0,
    modified_at   INTEGER NOT NULL DEFAULT 0,
    depth         INTEGER NOT NULL DEFAULT 0,
    category      TEXT NOT NULL DEFAULT 'Other',
    FOREIGN KEY (session_id) REFERENCES scan_sessions(session_id) ON DELETE CASCADE
);
";

pub const CREATE_INDEXES: &str = "
CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_files_session_path
    ON scan_files(session_id, file_path);
CREATE INDEX IF NOT EXISTS idx_scan_files_session
    ON scan_files(session_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_status
    ON scan_sessions(status);
";

pub const INITIAL_MIGRATION: &str = "";

pub fn run_initial_migration(
    conn: &crate::connection::ConnectionManager,
) -> Result<(), crate::error::DatabaseError> {
    conn.run_migration(CREATE_SCAN_SESSIONS)?;
    conn.run_migration(CREATE_SCAN_FILES)?;
    conn.run_migration(CREATE_INDEXES)?;
    Ok(())
}
