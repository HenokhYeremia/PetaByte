-- ============================================================
-- PetaByte Database Schema v1
-- Migration 002: Performance Indexes
-- Applied after data starts flowing (or on first scan)
-- ============================================================

-- ===========================
-- SCAN ENTRIES — Critical Indexes
-- ===========================

-- 1. Tree navigation: browse by parent directory
--    Query: WHERE scan_session_id = ? AND parent_path = ?
CREATE INDEX IF NOT EXISTS idx_scan_entries_parent
    ON scan_entries(scan_session_id, parent_path, file_name);

-- 2. Large file listing (non-directories only)
--    Query: WHERE scan_session_id = ? AND is_directory = 0 ORDER BY file_size DESC
CREATE INDEX IF NOT EXISTS idx_scan_entries_size_desc
    ON scan_entries(scan_session_id, file_size DESC)
    WHERE is_directory = 0;

-- 3. File type breakdown by extension
--    Query: WHERE scan_session_id = ? AND extension = ?
CREATE INDEX IF NOT EXISTS idx_scan_entries_extension
    ON scan_entries(scan_session_id, extension)
    WHERE extension IS NOT NULL;

-- 4. Size grouping (tier 1 duplicate detection)
--    Query: WHERE scan_session_id = ? AND is_directory = 0 GROUP BY file_size
CREATE INDEX IF NOT EXISTS idx_scan_entries_size_group
    ON scan_entries(scan_session_id, file_size)
    WHERE is_directory = 0;

-- 5. Category filtering (dashboard)
--    Query: WHERE scan_session_id = ? AND category = ?
CREATE INDEX IF NOT EXISTS idx_scan_entries_category
    ON scan_entries(scan_session_id, category)
    WHERE category IS NOT NULL;

-- 6. Hash lookup (lazy hash assignment)
--    Query: WHERE hash_id = ?
CREATE INDEX IF NOT EXISTS idx_scan_entries_hash
    ON scan_entries(hash_id)
    WHERE hash_id IS NOT NULL;

-- 7. Deleted file tracking (incremental scan)
--    Query: WHERE scan_session_id = ? AND is_deleted = 1
CREATE INDEX IF NOT EXISTS idx_scan_entries_deleted
    ON scan_entries(scan_session_id, is_deleted)
    WHERE is_deleted = 1;

-- 8. Unhashed files (batch hashing)
--    Query: WHERE scan_session_id = ? AND hash_id IS NULL AND is_directory = 0
CREATE INDEX IF NOT EXISTS idx_scan_entries_unhashed
    ON scan_entries(scan_session_id, file_size)
    WHERE hash_id IS NULL AND is_directory = 0;

-- 9. File name search (case-insensitive)
--    Query: WHERE file_name LIKE '%query%'
CREATE INDEX IF NOT EXISTS idx_scan_entries_name_search
    ON scan_entries(file_name COLLATE NOCASE);

-- ===========================
-- DIRECTORY SUMMARIES
-- ===========================

-- Tree navigation: get children of a directory
CREATE INDEX IF NOT EXISTS idx_dir_summaries_parent
    ON directory_summaries(scan_session_id, parent_path);

-- Sorted listing for dashboard
CREATE INDEX IF NOT EXISTS idx_dir_summaries_size
    ON directory_summaries(scan_session_id, total_size DESC);

-- ===========================
-- DUPLICATE GROUPS
-- ===========================

-- Per-session duplicate listing
CREATE INDEX IF NOT EXISTS idx_duplicate_groups_session
    ON duplicate_groups(scan_session_id, total_wasted_bytes DESC);

-- ===========================
-- DUPLICATE GROUP MEMBERS
-- ===========================

-- Fast member lookup: which group does a file belong to?
CREATE INDEX IF NOT EXISTS idx_dup_member_entry
    ON duplicate_group_members(scan_entry_id);

-- Member listing per group
CREATE INDEX IF NOT EXISTS idx_dup_member_group
    ON duplicate_group_members(group_id, file_path);

-- ===========================
-- HEALTH SNAPSHOTS
-- ===========================

-- Historical trend per volume
CREATE INDEX IF NOT EXISTS idx_health_snapshots_volume
    ON health_snapshots(volume_id, snapshot_at DESC);

-- ===========================
-- OPERATION JOURNAL
-- ===========================

-- Undo stack per session (LIFO order)
CREATE INDEX IF NOT EXISTS idx_journal_session
    ON operation_journal(scan_session_id, undo_stack_order DESC);

-- Active operations (for crash recovery)
CREATE INDEX IF NOT EXISTS idx_journal_status
    ON operation_journal(status, created_at)
    WHERE status IN ('pending', 'completed');

-- ===========================
-- CACHE ENTRIES
-- ===========================

-- Per-session, per-category listing
CREATE INDEX IF NOT EXISTS idx_cache_entries_session
    ON cache_entries(scan_session_id, category_id);

-- ===========================
-- SCAN SESSIONS
-- ===========================

-- History timeline per volume
CREATE INDEX IF NOT EXISTS idx_sessions_volume_date
    ON scan_sessions(volume_id, started_at DESC);

-- ===========================
-- ANALYZE
-- ==========================
-- Update query planner statistics
ANALYZE;
