use std::sync::Arc;

use petabyte_shared_models::entities::ScanSession;
use petabyte_shared_models::ports::ScanRepository;

use crate::connection::ConnectionManager;
use crate::models::ScanSessionRow;

pub struct ScanRepositoryImpl {
    conn: Arc<ConnectionManager>,
}

impl ScanRepositoryImpl {
    pub fn new(conn: Arc<ConnectionManager>) -> Self {
        Self { conn }
    }
}

impl ScanRepository for ScanRepositoryImpl {
    fn create_session(&self, session: &ScanSession) -> Result<(), String> {
        let conn = self.conn.connection();
        let params = ScanSessionRow::insert_params(session);
        let sql = "INSERT INTO scan_sessions
                   (session_id, root_path, status, started_at, completed_at,
                    total_files, total_dirs, total_size, total_errors)
                   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)";
        let params_refs: Vec<&dyn rusqlite::types::ToSql> =
            params.iter().map(std::convert::AsRef::as_ref).collect();
        conn.execute(sql, params_refs.as_slice())
            .map_err(|e| format!("Failed to create session: {e}"))?;
        Ok(())
    }

    fn update_session(&self, session: &ScanSession) -> Result<(), String> {
        let conn = self.conn.connection();
        let params = ScanSessionRow::update_params(session);
        let sql = "UPDATE scan_sessions
                   SET status = ?1, completed_at = ?2,
                       total_files = ?3, total_dirs = ?4,
                       total_size = ?5, total_errors = ?6
                   WHERE session_id = ?7";
        let params_refs: Vec<&dyn rusqlite::types::ToSql> =
            params.iter().map(std::convert::AsRef::as_ref).collect();
        conn.execute(sql, params_refs.as_slice())
            .map_err(|e| format!("Failed to update session: {e}"))?;
        Ok(())
    }

    fn get_session(&self, session_id: &str) -> Result<Option<ScanSession>, String> {
        let conn = self.conn.connection();
        let mut stmt = conn
            .prepare("SELECT * FROM scan_sessions WHERE session_id = ?1")
            .map_err(|e| format!("Failed to prepare: {e}"))?;
        let mut rows = stmt
            .query([session_id])
            .map_err(|e| format!("Failed to query: {e}"))?;
        match rows.next().map_err(|e| format!("Failed to fetch: {e}"))? {
            Some(row) => {
                let session = ScanSessionRow::from_row(row)
                    .map_err(|e| format!("Failed to parse row: {e}"))?;
                Ok(Some(session))
            }
            None => Ok(None),
        }
    }

    fn get_active_session(&self, root_path: &str) -> Result<Option<ScanSession>, String> {
        let conn = self.conn.connection();
        let mut stmt = conn
            .prepare(
                "SELECT * FROM scan_sessions
                 WHERE root_path = ?1
                   AND status IN ('Scanning', 'Paused')
                 ORDER BY started_at DESC LIMIT 1",
            )
            .map_err(|e| format!("Failed to prepare: {e}"))?;
        let mut rows = stmt
            .query([root_path])
            .map_err(|e| format!("Failed to query: {e}"))?;
        match rows.next().map_err(|e| format!("Failed to fetch: {e}"))? {
            Some(row) => {
                let session = ScanSessionRow::from_row(row)
                    .map_err(|e| format!("Failed to parse row: {e}"))?;
                Ok(Some(session))
            }
            None => Ok(None),
        }
    }

    fn list_sessions(&self) -> Result<Vec<ScanSession>, String> {
        let conn = self.conn.connection();
        let mut stmt = conn
            .prepare("SELECT * FROM scan_sessions ORDER BY started_at DESC")
            .map_err(|e| format!("Failed to prepare: {e}"))?;
        let mut rows = stmt
            .query([])
            .map_err(|e| format!("Failed to query: {e}"))?;
        let mut sessions = Vec::new();
        loop {
            match rows.next().map_err(|e| format!("Failed to fetch: {e}"))? {
                Some(row) => {
                    let session = ScanSessionRow::from_row(row)
                        .map_err(|e| format!("Failed to parse row: {e}"))?;
                    sessions.push(session);
                }
                None => break,
            }
        }
        Ok(sessions)
    }

    fn delete_session(&self, session_id: &str) -> Result<(), String> {
        let conn = self.conn.connection();
        conn.execute("DELETE FROM scan_files WHERE session_id = ?1", [session_id])
            .map_err(|e| format!("Failed to delete files: {e}"))?;
        conn.execute(
            "DELETE FROM scan_sessions WHERE session_id = ?1",
            [session_id],
        )
        .map_err(|e| format!("Failed to delete session: {e}"))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connection::ConnectionManager;
    use crate::migrations;
    use petabyte_shared_models::entities::ScanStatus;
    use std::sync::Arc;

    fn setup() -> (Arc<ConnectionManager>, ScanRepositoryImpl) {
        let conn = Arc::new(ConnectionManager::open_in_memory().unwrap());
        migrations::run_all(&conn).unwrap();
        let repo = ScanRepositoryImpl::new(conn.clone());
        (conn, repo)
    }

    #[test]
    fn test_create_and_get_session() {
        let (_, repo) = setup();
        let session = ScanSession::new("/test/path");
        repo.create_session(&session).unwrap();
        let fetched = repo.get_session(&session.session_id).unwrap().unwrap();
        assert_eq!(fetched.session_id, session.session_id);
        assert_eq!(fetched.root_path, session.root_path);
        assert_eq!(fetched.status, session.status);
    }

    #[test]
    fn test_update_session() {
        let (_, repo) = setup();
        let mut session = ScanSession::new("/test/path");
        repo.create_session(&session).unwrap();

        session.status = ScanStatus::Scanning;
        session.total_files = 100;
        session.total_dirs = 10;
        repo.update_session(&session).unwrap();

        let fetched = repo.get_session(&session.session_id).unwrap().unwrap();
        assert_eq!(fetched.status, ScanStatus::Scanning);
        assert_eq!(fetched.total_files, 100);
        assert_eq!(fetched.total_dirs, 10);
    }

    #[test]
    fn test_get_active_session() {
        let (_, repo) = setup();
        let session = ScanSession::new("/test/path");
        repo.create_session(&session).unwrap();

        let active = repo.get_active_session("/test/path").unwrap();
        assert!(active.is_none());

        let mut s = session.clone();
        s.status = ScanStatus::Scanning;
        repo.update_session(&s).unwrap();

        let active = repo.get_active_session("/test/path").unwrap();
        assert!(active.is_some());
        assert_eq!(active.unwrap().status, ScanStatus::Scanning);
    }

    #[test]
    fn test_list_sessions() {
        let (_, repo) = setup();
        assert!(repo.list_sessions().unwrap().is_empty());
        let s1 = ScanSession::new("/path1");
        let s2 = ScanSession::new("/path2");
        repo.create_session(&s1).unwrap();
        repo.create_session(&s2).unwrap();
        assert_eq!(repo.list_sessions().unwrap().len(), 2);
    }

    #[test]
    fn test_delete_session() {
        let (_, repo) = setup();
        let session = ScanSession::new("/test/path");
        repo.create_session(&session).unwrap();
        repo.delete_session(&session.session_id).unwrap();
        assert!(repo.get_session(&session.session_id).unwrap().is_none());
    }
}
