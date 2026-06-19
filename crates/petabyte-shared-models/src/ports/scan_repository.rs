use crate::entities::ScanSession;

pub trait ScanRepository: Send + Sync {
    fn create_session(&self, session: &ScanSession) -> Result<(), String>;
    fn update_session(&self, session: &ScanSession) -> Result<(), String>;
    fn get_session(&self, session_id: &str) -> Result<Option<ScanSession>, String>;
    fn get_active_session(&self, root_path: &str) -> Result<Option<ScanSession>, String>;
    fn list_sessions(&self) -> Result<Vec<ScanSession>, String>;
    fn delete_session(&self, session_id: &str) -> Result<(), String>;
}
