use std::sync::Arc;

use petabyte_shared_models::entities::{DuplicateGroup, DuplicateGroupMember};

use crate::connection::ConnectionManager;

pub struct DuplicateRepository {
    conn: Arc<ConnectionManager>,
}

impl DuplicateRepository {
    pub fn new(conn: Arc<ConnectionManager>) -> Self {
        Self { conn }
    }

    pub fn get_candidates_by_size(
        &self,
        session_id: &str,
        min_group_size: u64,
    ) -> Result<Vec<(u64, i64)>, String> {
        let conn = self.conn.connection();
        let sql = "
            SELECT file_size, COUNT(*) as cnt
            FROM scan_files
            WHERE session_id = ?1 AND is_directory = 0
            GROUP BY file_size
            HAVING cnt >= ?2
            ORDER BY file_size
        ";
        let mut stmt = conn
            .prepare(sql)
            .map_err(|e| format!("Failed to prepare: {}", e))?;
        let mut rows = stmt
            .query(rusqlite::params![session_id, min_group_size as i64])
            .map_err(|e| format!("Failed to query: {}", e))?;

        let mut results = Vec::new();
        loop {
            match rows.next().map_err(|e| format!("Failed to fetch: {}", e))? {
                Some(row) => {
                    let size: u64 = row.get(0).map_err(|e| format!("Parse error: {}", e))?;
                    let count: i64 = row.get(1).map_err(|e| format!("Parse error: {}", e))?;
                    results.push((size, count));
                }
                None => break,
            }
        }
        Ok(results)
    }

    pub fn get_files_by_size(
        &self,
        session_id: &str,
        file_size: u64,
    ) -> Result<Vec<(i64, String, String, u64)>, String> {
        let conn = self.conn.connection();
        let sql = "
            SELECT id, file_path, file_name, file_size
            FROM scan_files
            WHERE session_id = ?1 AND file_size = ?2 AND is_directory = 0
            ORDER BY file_path
        ";
        let mut stmt = conn
            .prepare(sql)
            .map_err(|e| format!("Failed to prepare: {}", e))?;
        let mut rows = stmt
            .query(rusqlite::params![session_id, file_size])
            .map_err(|e| format!("Failed to query: {}", e))?;

        let mut results = Vec::new();
        loop {
            match rows.next().map_err(|e| format!("Failed to fetch: {}", e))? {
                Some(row) => {
                    let id: i64 = row.get(0).map_err(|e| format!("Parse error: {}", e))?;
                    let path: String = row.get(1).map_err(|e| format!("Parse error: {}", e))?;
                    let name: String = row.get(2).map_err(|e| format!("Parse error: {}", e))?;
                    let size: u64 = row.get(3).map_err(|e| format!("Parse error: {}", e))?;
                    results.push((id, path, name, size));
                }
                None => break,
            }
        }
        Ok(results)
    }

    pub fn save_duplicate_group(
        &self,
        session_id: &str,
        group: &DuplicateGroup,
    ) -> Result<i64, String> {
        let conn = self.conn.connection();
        let sql = "
            INSERT INTO duplicate_groups
                (scan_session_id, file_size, partial_hash, full_hash,
                 file_count, total_wasted_bytes)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ";
        conn.execute(
            sql,
            rusqlite::params![
                session_id,
                group.file_size as i64,
                group.partial_hash,
                group.full_hash,
                group.file_count as i64,
                group.total_wasted_bytes as i64,
            ],
        )
        .map_err(|e| format!("Failed to insert group: {}", e))?;

        let group_id = conn.last_insert_rowid();
        drop(conn);

        for member in &group.members {
            self.save_group_member(group_id, member)?;
        }

        Ok(group_id)
    }

    pub fn save_group_member(
        &self,
        group_id: i64,
        member: &DuplicateGroupMember,
    ) -> Result<(), String> {
        let conn = self.conn.connection();
        let sql = "
            INSERT INTO duplicate_group_members
                (group_id, file_path, file_name, file_size, is_keep, marked_for_removal)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ";
        conn.execute(
            sql,
            rusqlite::params![
                group_id,
                member.file_path,
                member.file_name,
                member.file_size as i64,
                member.is_keep as i64,
                member.marked_for_removal as i64,
            ],
        )
        .map_err(|e| format!("Failed to insert member: {}", e))?;
        Ok(())
    }

    pub fn save_hash_cache_entry(
        &self,
        file_size: u64,
        partial_hash: Option<&str>,
        full_hash: &str,
    ) -> Result<i64, String> {
        let conn = self.conn.connection();
        let sql = "
            INSERT INTO file_hashes (file_size, partial_hash, full_hash)
            VALUES (?1, ?2, ?3)
        ";
        conn.execute(
            sql,
            rusqlite::params![file_size as i64, partial_hash, full_hash],
        )
        .map_err(|e| format!("Failed to insert hash: {}", e))?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_hash_cache_for_size(
        &self,
        file_size: u64,
    ) -> Result<Vec<(Option<String>, String)>, String> {
        let conn = self.conn.connection();
        let mut stmt = conn
            .prepare(
                "SELECT partial_hash, full_hash FROM file_hashes WHERE file_size = ?1",
            )
            .map_err(|e| format!("Failed to prepare: {}", e))?;
        let mut rows = stmt
            .query([file_size])
            .map_err(|e| format!("Failed to query: {}", e))?;

        let mut results = Vec::new();
        loop {
            match rows.next().map_err(|e| format!("Failed to fetch: {}", e))? {
                Some(row) => {
                    let partial: Option<String> = row.get(0).map_err(|e| format!("Parse: {}", e))?;
                    let full: String = row.get(1).map_err(|e| format!("Parse: {}", e))?;
                    results.push((partial, full));
                }
                None => break,
            }
        }
        Ok(results)
    }

    pub fn get_duplicate_groups(
        &self,
        session_id: &str,
    ) -> Result<Vec<DuplicateGroup>, String> {
        let rows = {
            let conn = self.conn.connection();
            let mut stmt = conn
                .prepare(
                    "SELECT id, file_size, partial_hash, full_hash, file_count, total_wasted_bytes
                     FROM duplicate_groups
                     WHERE scan_session_id = ?1
                     ORDER BY total_wasted_bytes DESC",
                )
                .map_err(|e| format!("Failed to prepare: {}", e))?;
            let mut rows = stmt
                .query([session_id])
                .map_err(|e| format!("Failed to query: {}", e))?;

            let mut result = Vec::new();
            loop {
                match rows.next().map_err(|e| format!("Failed to fetch: {}", e))? {
                    Some(row) => {
                        let group_id: i64 = row.get(0).map_err(|e| format!("Parse: {}", e))?;
                        let file_size: u64 = row.get(1).map_err(|e| format!("Parse: {}", e))?;
                        let partial_hash: String = row.get(2).map_err(|e| format!("Parse: {}", e))?;
                        let full_hash: String = row.get(3).map_err(|e| format!("Parse: {}", e))?;
                        let file_count: u64 = row.get(4).map_err(|e| format!("Parse: {}", e))?;
                        let wasted: u64 = row.get(5).map_err(|e| format!("Parse: {}", e))?;
                        result.push((group_id, file_size, partial_hash, full_hash, file_count, wasted));
                    }
                    None => break,
                }
            }
            result
        };

        let mut groups = Vec::new();
        for (group_id, file_size, partial_hash, full_hash, file_count, wasted) in rows {
            let members = self.get_group_members(group_id)?;
            groups.push(DuplicateGroup {
                group_id: group_id.to_string(),
                file_size,
                partial_hash,
                full_hash,
                file_count,
                total_wasted_bytes: wasted,
                members,
            });
        }
        Ok(groups)
    }

    pub fn get_group_members(&self, group_id: i64) -> Result<Vec<DuplicateGroupMember>, String> {
        let conn = self.conn.connection();
        let mut stmt = conn
            .prepare(
                "SELECT file_path, file_name, file_size, is_keep, marked_for_removal
                 FROM duplicate_group_members
                 WHERE group_id = ?1
                 ORDER BY file_path",
            )
            .map_err(|e| format!("Failed to prepare: {}", e))?;
        let mut rows = stmt
            .query([group_id])
            .map_err(|e| format!("Failed to query: {}", e))?;

        let mut members = Vec::new();
        loop {
            match rows.next().map_err(|e| format!("Failed to fetch: {}", e))? {
                Some(row) => {
                    let path: String = row.get(0).map_err(|e| format!("Parse: {}", e))?;
                    let name: String = row.get(1).map_err(|e| format!("Parse: {}", e))?;
                    let size: u64 = row.get(2).map_err(|e| format!("Parse: {}", e))?;
                    let is_keep: bool = row.get(3).map_err(|e| format!("Parse: {}", e))?;
                    let marked: bool = row.get(4).map_err(|e| format!("Parse: {}", e))?;
                    members.push(DuplicateGroupMember {
                        file_path: path,
                        file_name: name,
                        file_size: size,
                        is_directory: false,
                        is_keep,
                        marked_for_removal: marked,
                    });
                }
                None => break,
            }
        }
        Ok(members)
    }

    pub fn delete_duplicate_groups(&self, session_id: &str) -> Result<(), String> {
        let conn = self.conn.connection();
        conn.execute(
            "DELETE FROM duplicate_group_members WHERE group_id IN
             (SELECT id FROM duplicate_groups WHERE scan_session_id = ?1)",
            [session_id],
        )
        .map_err(|e| format!("Failed to delete members: {}", e))?;
        conn.execute(
            "DELETE FROM duplicate_groups WHERE scan_session_id = ?1",
            [session_id],
        )
        .map_err(|e| format!("Failed to delete groups: {}", e))?;
        Ok(())
    }

    pub fn get_duplicate_stats(
        &self,
        session_id: &str,
    ) -> Result<(u64, u64, u64), String> {
        let conn = self.conn.connection();
        let mut stmt = conn
            .prepare(
                "SELECT
                    COUNT(*) as group_count,
                    COALESCE(SUM(file_count), 0) as total_files,
                    COALESCE(SUM(total_wasted_bytes), 0) as total_wasted
                 FROM duplicate_groups
                 WHERE scan_session_id = ?1",
            )
            .map_err(|e| format!("Failed to prepare: {}", e))?;
        let mut rows = stmt
            .query([session_id])
            .map_err(|e| format!("Failed to query: {}", e))?;

        match rows.next().map_err(|e| format!("Failed to fetch: {}", e))? {
            Some(row) => {
                let count: u64 = row.get(0).map_err(|e| format!("Parse: {}", e))?;
                let files: u64 = row.get(1).map_err(|e| format!("Parse: {}", e))?;
                let wasted: u64 = row.get(2).map_err(|e| format!("Parse: {}", e))?;
                Ok((count, files, wasted))
            }
            None => Ok((0, 0, 0)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connection::ConnectionManager;
    use crate::migrations;
    use petabyte_shared_models::entities::ScanSession;
    use std::sync::Arc;

    fn setup() -> (Arc<ConnectionManager>, DuplicateRepository) {
        let conn = Arc::new(ConnectionManager::open_in_memory().unwrap());
        migrations::run_all(&conn).unwrap();
        let repo = DuplicateRepository::new(conn.clone());
        (conn, repo)
    }

    fn create_session(conn: &ConnectionManager) -> String {
        let session = ScanSession::new("/test");
        let sid = session.session_id.clone();
        let root = session.root_path.clone();
        let c = conn.connection();
        let params: [&dyn rusqlite::types::ToSql; 2] = [&sid, &root];
        c.execute(
            "INSERT INTO scan_sessions (session_id, root_path, status, started_at)
             VALUES (?1, ?2, 'Completed', datetime('now'))",
            params,
        )
        .unwrap();
        session.session_id
    }

    fn insert_file(conn: &ConnectionManager, session_id: &str, path: &str, size: u64) {
        let c = conn.connection();
        let file_name = path.rsplit('/').next().unwrap_or(path);
        c.execute(
            "INSERT INTO scan_files (session_id, file_path, file_name, file_size, is_directory, permissions, modified_at, depth, category)
             VALUES (?1, ?2, ?3, ?4, 0, 420, 1700000000, 1, 'Other')",
            rusqlite::params![session_id, path, file_name, size as i64],
        )
        .unwrap();
    }

    #[test]
    fn test_get_candidates_by_size() {
        let (conn, repo) = setup();
        let sid = create_session(&conn);

        insert_file(&conn, &sid, "/a.txt", 100);
        insert_file(&conn, &sid, "/b.txt", 100);
        insert_file(&conn, &sid, "/c.txt", 200);
        insert_file(&conn, &sid, "/d.txt", 200);
        insert_file(&conn, &sid, "/e.txt", 100);

        let candidates = repo.get_candidates_by_size(&sid, 2).unwrap();
        assert_eq!(candidates.len(), 2);
        assert_eq!(candidates[0], (100, 3));
        assert_eq!(candidates[1], (200, 2));
    }

    #[test]
    fn test_get_files_by_size() {
        let (conn, repo) = setup();
        let sid = create_session(&conn);

        insert_file(&conn, &sid, "/a.txt", 100);
        insert_file(&conn, &sid, "/b.txt", 100);

        let files = repo.get_files_by_size(&sid, 100).unwrap();
        assert_eq!(files.len(), 2);
    }

    #[test]
    fn test_save_and_get_duplicate_groups() {
        let (conn, repo) = setup();
        let sid = create_session(&conn);

        let group = DuplicateGroup {
            group_id: "test".into(),
            file_size: 100,
            partial_hash: "partial123".into(),
            full_hash: "full123".into(),
            file_count: 2,
            total_wasted_bytes: 100,
            members: vec![
                DuplicateGroupMember {
                    file_path: "/a.txt".into(),
                    file_name: "a.txt".into(),
                    file_size: 100,
                    is_directory: false,
                    is_keep: false,
                    marked_for_removal: false,
                },
                DuplicateGroupMember {
                    file_path: "/b.txt".into(),
                    file_name: "b.txt".into(),
                    file_size: 100,
                    is_directory: false,
                    is_keep: false,
                    marked_for_removal: false,
                },
            ],
        };

        repo.save_duplicate_group(&sid, &group).unwrap();

        let groups = repo.get_duplicate_groups(&sid).unwrap();
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].file_count, 2);
        assert_eq!(groups[0].members.len(), 2);
    }

    #[test]
    fn test_duplicate_stats() {
        let (conn, repo) = setup();
        let sid = create_session(&conn);

        let group = DuplicateGroup {
            group_id: "test".into(),
            file_size: 100,
            partial_hash: "p".into(),
            full_hash: "f".into(),
            file_count: 3,
            total_wasted_bytes: 200,
            members: vec![],
        };
        repo.save_duplicate_group(&sid, &group).unwrap();

        let (count, files, wasted) = repo.get_duplicate_stats(&sid).unwrap();
        assert_eq!(count, 1);
        assert_eq!(files, 3);
        assert_eq!(wasted, 200);
    }

    #[test]
    fn test_delete_duplicate_groups() {
        let (conn, repo) = setup();
        let sid = create_session(&conn);

        let group = DuplicateGroup {
            group_id: "test".into(),
            file_size: 100,
            partial_hash: "p".into(),
            full_hash: "f".into(),
            file_count: 2,
            total_wasted_bytes: 100,
            members: vec![
                DuplicateGroupMember {
                    file_path: "/a.txt".into(),
                    file_name: "a.txt".into(),
                    file_size: 100,
                    is_directory: false,
                    is_keep: false,
                    marked_for_removal: false,
                },
            ],
        };
        repo.save_duplicate_group(&sid, &group).unwrap();
        repo.delete_duplicate_groups(&sid).unwrap();

        let groups = repo.get_duplicate_groups(&sid).unwrap();
        assert!(groups.is_empty());
    }

    #[test]
    fn test_save_hash_cache_entry() {
        let (_, repo) = setup();
        let id = repo.save_hash_cache_entry(100, Some("partial1"), "full1").unwrap();
        assert!(id > 0);

        let entries = repo.get_hash_cache_for_size(100).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].1, "full1");
    }

    #[test]
    fn test_no_candidates_for_unique_sizes() {
        let (conn, repo) = setup();
        let sid = create_session(&conn);

        insert_file(&conn, &sid, "/a.txt", 100);
        insert_file(&conn, &sid, "/b.txt", 200);
        insert_file(&conn, &sid, "/c.txt", 300);

        let candidates = repo.get_candidates_by_size(&sid, 2).unwrap();
        assert!(candidates.is_empty());
    }
}
