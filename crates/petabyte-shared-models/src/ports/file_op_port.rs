use std::path::Path;

pub trait FileOpPort: Send + Sync {
    fn copy(&self, source: &Path, dest: &Path) -> Result<(), String>;
    fn move_file(&self, source: &Path, dest: &Path) -> Result<(), String>;
    fn delete(&self, path: &Path) -> Result<(), String>;
    fn send_to_trash(&self, path: &Path) -> Result<(), String>;
    fn verify_integrity(&self, source: &Path, dest: &Path) -> Result<bool, String>;
}
