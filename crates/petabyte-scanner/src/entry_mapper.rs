use jwalk::DirEntry;
use petabyte_shared_models::entities::FileEntry;
use petabyte_shared_models::value_objects::FilePath;
use std::time::UNIX_EPOCH;

#[must_use]
pub fn map_dir_entry(entry: &DirEntry<((), ())>, _root_path: &str) -> Option<FileEntry> {
    let path = entry.path();
    let path_str = path.to_string_lossy();
    let file_path = FilePath::new(path_str.as_ref()).ok()?;

    let file_name = entry.file_name.to_string_lossy().to_string();
    let parent = path.parent().map(|p| p.to_string_lossy().to_string());
    let parent_path = parent.and_then(|p| FilePath::new(p).ok());

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(str::to_lowercase);

    let depth = entry.depth as u32;
    let is_dir = entry.file_type.is_dir();
    let is_symlink = entry.file_type.is_symlink();

    let metadata = match std::fs::symlink_metadata(&*path) {
        Ok(m) => m,
        Err(_) => return None,
    };

    let file_size = metadata.len();
    let permissions = 0u32;

    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map_or(0, |d| d.as_secs() as i64);

    Some(FileEntry::new(
        file_path,
        parent_path,
        file_name,
        extension,
        file_size,
        is_dir,
        is_symlink,
        permissions,
        modified_at,
        depth,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use jwalk::WalkDir;

    #[test]
    fn test_map_regular_file() {
        let dir = std::env::temp_dir().join("petabyte_mapper_test");
        let _ = std::fs::create_dir_all(&dir);
        let file_path = dir.join("test.txt");
        std::fs::write(&file_path, b"hello").unwrap();

        let entry = WalkDir::new(&dir)
            .into_iter()
            .filter_map(std::result::Result::ok)
            .find(|e| e.path().ends_with("test.txt"))
            .unwrap();

        let mapped = map_dir_entry(&entry, dir.to_str().unwrap());
        assert!(mapped.is_some());
        let file_entry = mapped.unwrap();
        assert_eq!(file_entry.file_name, "test.txt");
        assert_eq!(file_entry.extension, Some("txt".into()));
        assert_eq!(file_entry.file_size, 5);
        assert!(!file_entry.is_directory);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_map_directory() {
        let dir = std::env::temp_dir().join("petabyte_mapper_test_dir");
        let _ = std::fs::create_dir_all(&dir);
        let sub = dir.join("subdir");
        let _ = std::fs::create_dir_all(&sub);

        let entry = WalkDir::new(&dir)
            .into_iter()
            .filter_map(std::result::Result::ok)
            .find(|e| e.path().to_string_lossy().ends_with("subdir"))
            .unwrap();

        let mapped = map_dir_entry(&entry, dir.to_str().unwrap());
        assert!(mapped.is_some());
        let file_entry = mapped.unwrap();
        assert!(file_entry.is_directory);

        let _ = std::fs::remove_dir_all(&dir);
    }
}
