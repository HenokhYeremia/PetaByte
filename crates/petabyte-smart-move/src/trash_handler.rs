use petabyte_shared_models::ports::FileOpPort;
use std::path::Path;

pub struct TrashHandler;

impl TrashHandler {
    #[must_use]
    pub fn new() -> Self {
        Self
    }
}

impl Default for TrashHandler {
    fn default() -> Self {
        Self::new()
    }
}

impl FileOpPort for TrashHandler {
    fn copy(&self, source: &Path, dest: &Path) -> Result<(), String> {
        std::fs::copy(source, dest).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn move_file(&self, source: &Path, dest: &Path) -> Result<(), String> {
        std::fs::rename(source, dest).map_err(|e| e.to_string())
    }

    fn delete(&self, path: &Path) -> Result<(), String> {
        if path.is_dir() {
            std::fs::remove_dir_all(path).map_err(|e| e.to_string())
        } else {
            std::fs::remove_file(path).map_err(|e| e.to_string())
        }
    }

    fn send_to_trash(&self, path: &Path) -> Result<(), String> {
        trash::delete(path).map_err(|e| e.to_string())
    }

    fn verify_integrity(&self, source: &Path, dest: &Path) -> Result<bool, String> {
        let src_meta = std::fs::metadata(source).map_err(|e| e.to_string())?;
        let dst_meta = std::fs::metadata(dest).map_err(|e| e.to_string())?;

        if src_meta.len() != dst_meta.len() {
            return Ok(false);
        }

        let src_data = std::fs::read(source).map_err(|e| e.to_string())?;
        let dst_data = std::fs::read(dest).map_err(|e| e.to_string())?;

        Ok(blake3::hash(&src_data) == blake3::hash(&dst_data))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_copy_file() {
        let handler = TrashHandler::new();
        let mut src = NamedTempFile::new().unwrap();
        src.write_all(b"test content").unwrap();
        let dest_path = src.path().parent().unwrap().join("copy_test.dat");

        assert!(handler.copy(src.path(), &dest_path).is_ok());
        assert!(dest_path.exists());
        std::fs::remove_file(&dest_path).ok();
    }

    #[test]
    fn test_delete_file() {
        let handler = TrashHandler::new();
        let dir = std::env::temp_dir().join("__petabyte_trash_delete_test");
        std::fs::create_dir_all(&dir).ok();
        let path = dir.join("to_delete.txt");
        std::fs::write(&path, b"delete me").unwrap();
        assert!(path.exists());
        assert!(handler.delete(&path).is_ok());
        assert!(!path.exists());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_verify_same_content() {
        let handler = TrashHandler::new();
        let mut f1 = NamedTempFile::new().unwrap();
        f1.write_all(b"same data").unwrap();
        let mut f2 = NamedTempFile::new().unwrap();
        f2.write_all(b"same data").unwrap();
        assert!(handler.verify_integrity(f1.path(), f2.path()).unwrap());
    }

    #[test]
    fn test_verify_different_content() {
        let handler = TrashHandler::new();
        let mut f1 = NamedTempFile::new().unwrap();
        f1.write_all(b"data A").unwrap();
        let mut f2 = NamedTempFile::new().unwrap();
        f2.write_all(b"data B").unwrap();
        assert!(!handler.verify_integrity(f1.path(), f2.path()).unwrap());
    }

    #[test]
    fn test_move_file() {
        let handler = TrashHandler::new();
        let mut src = NamedTempFile::new().unwrap();
        src.write_all(b"move test").unwrap();
        let dest_path = src.path().parent().unwrap().join("moved_file.dat");

        assert!(handler.move_file(src.path(), &dest_path).is_ok());
        assert!(dest_path.exists());
        assert!(!src.path().exists());
        std::fs::remove_file(&dest_path).ok();
    }
}
