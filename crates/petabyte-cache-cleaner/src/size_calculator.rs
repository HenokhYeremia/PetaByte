use crate::error::CleanerResult;
use std::path::Path;

#[derive(Debug, Clone, Default)]
pub struct SizeInfo {
    pub total_bytes: u64,
    pub file_count: u64,
    pub dir_count: u64,
}

pub struct SizeCalculator;

impl SizeCalculator {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn calculate(&self, path: &Path) -> CleanerResult<SizeInfo> {
        let mut info = SizeInfo::default();
        if path.is_file() {
            info.total_bytes = std::fs::metadata(path)?.len();
            info.file_count = 1;
            return Ok(info);
        }

        for entry in walkdir::WalkDir::new(path)
            .follow_links(false)
            .into_iter()
            .filter_map(std::result::Result::ok)
        {
            if entry.file_type().is_dir() {
                info.dir_count += 1;
            } else if entry.file_type().is_file() {
                info.file_count += 1;
                if let Ok(meta) = entry.metadata() {
                    info.total_bytes += meta.len();
                }
            }
        }

        Ok(info)
    }

    pub fn calculate_batch(&self, paths: &[&Path]) -> CleanerResult<Vec<(String, SizeInfo)>> {
        let mut results = Vec::with_capacity(paths.len());
        for path in paths {
            let info = self.calculate(path).unwrap_or_default();
            results.push((path.to_string_lossy().to_string(), info));
        }
        Ok(results)
    }
}

impl Default for SizeCalculator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    fn create_test_dir() -> TempDir {
        let dir = TempDir::new().unwrap();
        let sub = dir.path().join("subdir");
        std::fs::create_dir_all(&sub).unwrap();
        let mut f1 = std::fs::File::create(dir.path().join("f1.txt")).unwrap();
        f1.write_all(b"hello").unwrap();
        let mut f2 = std::fs::File::create(sub.join("f2.txt")).unwrap();
        f2.write_all(b"world").unwrap();
        dir
    }

    #[test]
    fn test_calculate_directory() {
        let dir = create_test_dir();
        let calc = SizeCalculator::new();
        let info = calc.calculate(dir.path()).unwrap();
        assert_eq!(info.file_count, 2);
        assert_eq!(info.total_bytes, 10);
        assert_eq!(info.dir_count, 2);
    }

    #[test]
    fn test_calculate_file() {
        let dir = create_test_dir();
        let calc = SizeCalculator::new();
        let file_path = dir.path().join("f1.txt");
        let info = calc.calculate(&file_path).unwrap();
        assert_eq!(info.file_count, 1);
        assert_eq!(info.total_bytes, 5);
        assert_eq!(info.dir_count, 0);
    }

    #[test]
    fn test_calculate_batch() {
        let dir = create_test_dir();
        let calc = SizeCalculator::new();
        let paths = [dir.path().join("f1.txt"), dir.path().join("subdir")];
        let path_refs: Vec<&Path> = paths.iter().map(std::path::PathBuf::as_path).collect();
        let results = calc.calculate_batch(&path_refs).unwrap();
        assert_eq!(results.len(), 2);
        assert!(results[0].1.total_bytes > 0);
        assert!(results[1].1.total_bytes > 0);
    }

    #[test]
    fn test_nonexistent_path() {
        let calc = SizeCalculator::new();
        let info = calc
            .calculate(Path::new("C:\\nonexistent_path_xyz"))
            .unwrap_or_default();
        assert_eq!(info.total_bytes, 0);
    }
}
