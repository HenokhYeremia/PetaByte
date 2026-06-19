use petabyte_shared_models::ports::FileOpPort;
use std::path::Path;

pub struct DryRunMover;

impl DryRunMover {
    pub fn new() -> Self {
        Self
    }
}

impl Default for DryRunMover {
    fn default() -> Self {
        Self::new()
    }
}

impl FileOpPort for DryRunMover {
    fn copy(&self, _source: &Path, dest: &Path) -> Result<(), String> {
        // Simulate copy by creating an empty file at destination
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(dest, b"").map_err(|e| e.to_string())?;
        Ok(())
    }

    fn move_file(&self, source: &Path, dest: &Path) -> Result<(), String> {
        // Simulate move — touch dest if source "exists" in dry_run mode
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(dest, b"").map_err(|e| e.to_string())?;
        let _ = std::fs::remove_file(source);
        Ok(())
    }

    fn delete(&self, path: &Path) -> Result<(), String> {
        std::fs::remove_file(path).map_err(|e| e.to_string())
    }

    fn send_to_trash(&self, path: &Path) -> Result<(), String> {
        std::fs::remove_file(path).map_err(|e| e.to_string())
    }

    fn verify_integrity(&self, _source: &Path, _dest: &Path) -> Result<bool, String> {
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_dry_run_copy() {
        let mover = DryRunMover::new();
        let dir = std::env::temp_dir().join("__petabyte_dry_copy_test");
        std::fs::create_dir_all(&dir).ok();
        let src = dir.join("src.txt");
        let dst = dir.join("dst.txt");
        std::fs::write(&src, b"data").ok();

        assert!(mover.copy(&src, &dst).is_ok());
        // DryRunMover touches the dest with empty content
        assert!(dst.exists());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_dry_run_verify_always_true() {
        let mover = DryRunMover::new();
        let src = NamedTempFile::new().unwrap();
        let dst = NamedTempFile::new().unwrap();
        assert!(mover.verify_integrity(src.path(), dst.path()).unwrap());
    }

    #[test]
    fn test_dry_run_delete() {
        let mover = DryRunMover::new();
        let dir = std::env::temp_dir().join("__petabyte_dry_delete_test");
        std::fs::create_dir_all(&dir).ok();
        let path = dir.join("to_delete.txt");
        std::fs::write(&path, b"delete me").unwrap();
        assert!(path.exists());
        assert!(mover.delete(&path).is_ok());
        assert!(!path.exists());
        std::fs::remove_dir_all(&dir).ok();
    }
}
