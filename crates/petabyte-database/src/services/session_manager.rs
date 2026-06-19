use std::sync::Arc;

use chrono::Utc;
use parking_lot::Mutex;
use petabyte_shared_models::entities::{ScanSession, ScanStatus};
use petabyte_shared_models::ports::ScanRepository;

pub struct SessionManager {
    repo: Arc<dyn ScanRepository>,
    session: Mutex<ScanSession>,
}

impl SessionManager {
    pub fn new(repo: Arc<dyn ScanRepository>, session: ScanSession) -> Self {
        Self {
            repo,
            session: Mutex::new(session),
        }
    }

    pub fn session(&self) -> ScanSession {
        self.session.lock().clone()
    }

    pub fn session_id(&self) -> String {
        self.session.lock().session_id.clone()
    }

    pub fn root_path(&self) -> String {
        self.session.lock().root_path.clone()
    }

    pub fn start(&self) -> Result<(), String> {
        let mut session = self.session.lock();
        session.status = ScanStatus::Scanning;
        let s = session.clone();
        self.repo.update_session(&s)
    }

    pub fn checkpoint(&self, files: u64, dirs: u64, size: u64, errors: u64) -> Result<(), String> {
        let mut session = self.session.lock();
        session.total_files = files;
        session.total_dirs = dirs;
        session.total_size = size;
        session.total_errors = errors;
        let s = session.clone();
        self.repo.update_session(&s)
    }

    pub fn complete(&self) -> Result<ScanSession, String> {
        let mut session = self.session.lock();
        session.status = ScanStatus::Completed;
        session.completed_at = Some(Utc::now());
        let s = session.clone();
        self.repo.update_session(&s)?;
        Ok(s)
    }

    pub fn fail(&self) -> Result<ScanSession, String> {
        let mut session = self.session.lock();
        session.status = ScanStatus::Failed;
        session.completed_at = Some(Utc::now());
        let s = session.clone();
        let _ = self.repo.update_session(&s);
        Ok(s)
    }

    pub fn cancel(&self) -> Result<ScanSession, String> {
        let mut session = self.session.lock();
        session.status = ScanStatus::Cancelled;
        session.completed_at = Some(Utc::now());
        let s = session.clone();
        let _ = self.repo.update_session(&s);
        Ok(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connection::ConnectionManager;
    use crate::migrations;
    use crate::repositories::scan_repo::ScanRepositoryImpl;
    use std::sync::Arc;

    fn setup() -> SessionManager {
        let conn = Arc::new(ConnectionManager::open_in_memory().unwrap());
        migrations::run_all(&conn).unwrap();
        let repo: Arc<dyn ScanRepository> = Arc::new(ScanRepositoryImpl::new(conn));
        let session = ScanSession::new("/test");
        repo.create_session(&session).unwrap();
        SessionManager::new(repo, session)
    }

    #[test]
    fn test_start_and_complete() {
        let mgr = setup();
        mgr.start().unwrap();
        assert_eq!(mgr.session().status, ScanStatus::Scanning);

        mgr.checkpoint(100, 10, 5000, 0).unwrap();
        let s = mgr.session();
        assert_eq!(s.total_files, 100);
        assert_eq!(s.total_dirs, 10);

        let completed = mgr.complete().unwrap();
        assert_eq!(completed.status, ScanStatus::Completed);
        assert!(completed.completed_at.is_some());
    }

    #[test]
    fn test_cancel() {
        let mgr = setup();
        mgr.start().unwrap();
        let cancelled = mgr.cancel().unwrap();
        assert_eq!(cancelled.status, ScanStatus::Cancelled);
    }

    #[test]
    fn test_fail() {
        let mgr = setup();
        mgr.start().unwrap();
        let failed = mgr.fail().unwrap();
        assert_eq!(failed.status, ScanStatus::Failed);
    }
}
