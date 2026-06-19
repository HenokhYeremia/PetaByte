use std::collections::HashMap;

use petabyte_shared_models::entities::FileEntry;

pub struct ExtensionGrouper;

impl ExtensionGrouper {
    pub fn new() -> Self {
        Self
    }

    pub fn group_by_extension<'a>(
        &self,
        files: &[&'a FileEntry],
    ) -> Vec<(Option<String>, Vec<&'a FileEntry>)> {
        let mut groups: HashMap<Option<String>, Vec<&'a FileEntry>> = HashMap::new();

        for file in files {
            let ext = file.extension.as_ref().map(|e| e.to_lowercase());
            groups.entry(ext).or_default().push(file);
        }

        let mut result: Vec<(Option<String>, Vec<&'a FileEntry>)> =
            groups.into_iter().filter(|(_, files)| files.len() > 1).collect();

        result.sort_by(|a, b| a.0.cmp(&b.0));
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::value_objects::FilePath;

    fn make_file(path: &str, size: u64) -> FileEntry {
        let parts: Vec<&str> = path.rsplitn(2, '.').collect();
        let ext = if parts.len() == 2 { Some(parts[0].to_string()) } else { None };
        FileEntry::new(
            FilePath::new(path).unwrap(),
            None,
            path.rsplit('/').next().unwrap_or(path).into(),
            ext,
            size,
            false,
            false,
            0o644,
            1_700_000_000,
            1,
        )
    }

    #[test]
    fn test_empty_input() {
        let grouper = ExtensionGrouper::new();
        let result = grouper.group_by_extension(&[]);
        assert!(result.is_empty());
    }

    #[test]
    fn test_all_same_extension() {
        let grouper = ExtensionGrouper::new();
        let files = vec![
            make_file("/a.txt", 100),
            make_file("/b.txt", 100),
            make_file("/c.txt", 100),
        ];
        let refs: Vec<&FileEntry> = files.iter().collect();
        let result = grouper.group_by_extension(&refs);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0.as_deref(), Some("txt"));
        assert_eq!(result[0].1.len(), 3);
    }

    #[test]
    fn test_multiple_extensions() {
        let grouper = ExtensionGrouper::new();
        let files = vec![
            make_file("/a.txt", 100),
            make_file("/b.txt", 100),
            make_file("/c.jpg", 100),
            make_file("/d.jpg", 100),
            make_file("/e.png", 100),
        ];
        let refs: Vec<&FileEntry> = files.iter().collect();
        let result = grouper.group_by_extension(&refs);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].0.as_deref(), Some("jpg"));
        assert_eq!(result[1].0.as_deref(), Some("txt"));
    }

    #[test]
    fn test_no_extension() {
        let grouper = ExtensionGrouper::new();
        let files = vec![
            make_file("/a", 100),
            make_file("/b", 100),
        ];
        let refs: Vec<&FileEntry> = files.iter().collect();
        let result = grouper.group_by_extension(&refs);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, None);
    }

    #[test]
    fn test_single_file_per_extension_skipped() {
        let grouper = ExtensionGrouper::new();
        let files = vec![
            make_file("/a.txt", 100),
            make_file("/b.jpg", 100),
        ];
        let refs: Vec<&FileEntry> = files.iter().collect();
        let result = grouper.group_by_extension(&refs);
        assert!(result.is_empty());
    }

    #[test]
    fn test_case_insensitive_grouping() {
        let grouper = ExtensionGrouper::new();
        let files = vec![
            make_file("/a.TXT", 100),
            make_file("/b.txt", 100),
        ];
        let refs: Vec<&FileEntry> = files.iter().collect();
        let result = grouper.group_by_extension(&refs);
        assert_eq!(result.len(), 1);
    }
}
