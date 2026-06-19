use std::sync::Arc;

use petabyte_shared_models::entities::FileEntry;
use petabyte_shared_models::ports::FileRepository;

use crate::connection::ConnectionManager;
use crate::models::FileEntryRow;

pub struct FileRepositoryImpl {
    conn: Arc<ConnectionManager>,
}

impl FileRepositoryImpl {
    pub fn new(conn: Arc<ConnectionManager>) -> Self {
        Self { conn }
    }

    pub fn insert_batch_with_session(
        &self,
        session_id: &str,
        entries: &[FileEntry],
    ) -> Result<u64, String> {
        let mut conn = self.conn.connection();
        let txn = conn
            .transaction()
            .map_err(|e| format!("Failed to begin transaction: {}", e))?;

        let sql = FileEntryRow::insert_sql();
        let mut count = 0u64;

        for entry in entries {
            let params = FileEntryRow::insert_params(session_id, entry);
            let params_refs: Vec<&dyn rusqlite::types::ToSql> =
                params.iter().map(|p| p.as_ref()).collect();
            let affected = txn
                .execute(sql, params_refs.as_slice())
                .map_err(|e| {
                    format!("Failed to insert file entry: {} at {}", e, entry.file_path)
                })?;
            if affected > 0 {
                count += 1;
            }
        }

        txn.commit()
            .map_err(|e| format!("Failed to commit transaction: {}", e))?;
        Ok(count)
    }

    pub fn get_file_paths_for_session(&self, session_id: &str) -> Result<Vec<String>, String> {
        let conn = self.conn.connection();
        let mut stmt = conn
            .prepare("SELECT file_path FROM scan_files WHERE session_id = ?1")
            .map_err(|e| format!("Failed to prepare: {}", e))?;
        let mut rows = stmt
            .query([session_id])
            .map_err(|e| format!("Failed to query: {}", e))?;
        let mut paths = Vec::new();
        loop {
            match rows.next().map_err(|e| format!("Failed to fetch: {}", e))? {
                Some(row) => {
                    paths.push(
                        row.get::<_, String>(0)
                            .map_err(|e| format!("Failed to get path: {}", e))?,
                    );
                }
                None => break,
            }
        }
        Ok(paths)
    }

    pub fn delete_by_session(&self, session_id: &str) -> Result<u64, String> {
        let conn = self.conn.connection();
        let deleted = conn
            .execute(
                "DELETE FROM scan_files WHERE session_id = ?1",
                [session_id],
            )
            .map_err(|e| format!("Failed to delete files: {}", e))?;
        Ok(deleted as u64)
    }
}

impl FileRepository for FileRepositoryImpl {
    fn insert_batch(&self, entries: &[FileEntry]) -> Result<(), String> {
        for entry in entries {
            let conn = self.conn.connection();
            let params = FileEntryRow::insert_params("global", entry);
            let params_refs: Vec<&dyn rusqlite::types::ToSql> =
                params.iter().map(|p| p.as_ref()).collect();
            conn.execute(FileEntryRow::insert_sql(), params_refs.as_slice())
                .map_err(|e| format!("Failed to insert file entry: {}", e))?;
        }
        Ok(())
    }

    fn get_entry_count(&self) -> Result<u64, String> {
        let conn = self.conn.connection();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM scan_files", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count: {}", e))?;
        Ok(count as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connection::ConnectionManager;
    use crate::migrations;
    use petabyte_shared_models::entities::ScanStatus;
    use petabyte_shared_models::value_objects::FilePath;
    use std::sync::Arc;

    fn create_session(conn: &ConnectionManager, sid: &str) {
        let conn = conn.connection();
        conn.execute(
            "INSERT INTO scan_sessions (session_id, root_path, status, started_at)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![sid, "/test", "Pending", chrono::Utc::now().to_rfc3339()],
        )
        .unwrap();
    }

    fn setup() -> (Arc<ConnectionManager>, FileRepositoryImpl) {
        let conn = Arc::new(ConnectionManager::open_in_memory().unwrap());
        migrations::run_all(&conn).unwrap();
        create_session(&conn, "s1");
        create_session(&conn, "s2");
        let repo = FileRepositoryImpl::new(conn.clone());
        (conn, repo)
    }

    fn make_entry(path: &str, size: u64) -> FileEntry {
        FileEntry::new(
            FilePath::new(path).unwrap(),
            None,
            "file.txt".into(),
            Some("txt".into()),
            size,
            false,
            false,
            0o644,
            1_700_000_000,
            1,
        )
    }

    #[test]
    fn test_insert_batch_dedup() {
        let (_, repo) = setup();
        let entries = vec![make_entry("/a/b.txt", 100), make_entry("/a/b.txt", 200)];
        let inserted = repo.insert_batch_with_session("s1", &entries).unwrap();
        assert_eq!(inserted, 1);
    }

    #[test]
    fn test_insert_multiple_sessions() {
        let (_, repo) = setup();
        let e1 = vec![make_entry("/a/1.txt", 10)];
        let e2 = vec![make_entry("/a/1.txt", 20)];
        let c1 = repo.insert_batch_with_session("s1", &e1).unwrap();
        let c2 = repo.insert_batch_with_session("s2", &e2).unwrap();
        assert_eq!(c1, 1);
        assert_eq!(c2, 1);
    }

    #[test]
    fn test_get_file_paths() {
        let (_, repo) = setup();
        let entries = vec![make_entry("/a/x.txt", 10), make_entry("/a/y.txt", 20)];
        repo.insert_batch_with_session("s1", &entries).unwrap();
        let paths = repo.get_file_paths_for_session("s1").unwrap();
        assert_eq!(paths.len(), 2);
        assert!(paths.contains(&"/a/x.txt".to_string()));
        assert!(paths.contains(&"/a/y.txt".to_string()));
    }

    #[test]
    fn test_delete_by_session() {
        let (_, repo) = setup();
        repo.insert_batch_with_session("s1", &[make_entry("/a/x.txt", 10)])
            .unwrap();
        repo.insert_batch_with_session("s2", &[make_entry("/a/y.txt", 20)])
            .unwrap();
        assert_eq!(repo.delete_by_session("s1").unwrap(), 1);
        assert_eq!(repo.get_file_paths_for_session("s1").unwrap().len(), 0);
        assert_eq!(repo.get_file_paths_for_session("s2").unwrap().len(), 1);
    }
}
