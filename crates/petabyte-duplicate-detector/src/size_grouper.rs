use std::collections::HashMap;

use petabyte_shared_models::entities::FileEntry;

pub struct SizeGrouper {
    min_group_size: usize,
}

impl SizeGrouper {
    #[must_use]
    pub fn new(min_group_size: usize) -> Self {
        Self { min_group_size }
    }

    #[must_use]
    pub fn group_by_size<'a>(&self, files: &'a [FileEntry]) -> Vec<(u64, Vec<&'a FileEntry>)> {
        let mut groups: HashMap<u64, Vec<&'a FileEntry>> = HashMap::new();

        for file in files {
            if file.is_directory {
                continue;
            }
            groups.entry(file.file_size).or_default().push(file);
        }

        let mut result: Vec<(u64, Vec<&'a FileEntry>)> = groups
            .into_iter()
            .filter(|(_, files)| files.len() >= self.min_group_size)
            .collect();

        result.sort_by_key(|a| a.0);
        result
    }

    #[must_use]
    pub fn candidate_count(&self, files: &[FileEntry]) -> usize {
        let mut groups: HashMap<u64, usize> = HashMap::new();
        for file in files {
            if file.is_directory {
                continue;
            }
            *groups.entry(file.file_size).or_insert(0) += 1;
        }
        groups
            .into_iter()
            .filter(|(_, count)| *count >= self.min_group_size)
            .map(|(_, count)| count)
            .sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::value_objects::FilePath;

    fn make_file(path: &str, size: u64) -> FileEntry {
        FileEntry::new(
            FilePath::new(path).unwrap(),
            None,
            path.rsplit('/').next().unwrap_or(path).into(),
            path.rsplit('.')
                .next()
                .map(std::string::ToString::to_string),
            size,
            false,
            false,
            0o644,
            1_700_000_000,
            1,
        )
    }

    fn make_dir(path: &str) -> FileEntry {
        FileEntry::new(
            FilePath::new(path).unwrap(),
            None,
            path.rsplit('/').next().unwrap_or(path).into(),
            None,
            0,
            true,
            false,
            0o755,
            1_700_000_000,
            1,
        )
    }

    #[test]
    fn test_empty_input() {
        let grouper = SizeGrouper::new(2);
        let result = grouper.group_by_size(&[]);
        assert!(result.is_empty());
    }

    #[test]
    fn test_no_duplicates() {
        let grouper = SizeGrouper::new(2);
        let files = vec![
            make_file("/a.txt", 100),
            make_file("/b.txt", 200),
            make_file("/c.txt", 300),
        ];
        let result = grouper.group_by_size(&files);
        assert!(result.is_empty());
    }

    #[test]
    fn test_basic_grouping() {
        let grouper = SizeGrouper::new(2);
        let files = vec![
            make_file("/a.txt", 100),
            make_file("/b.txt", 100),
            make_file("/c.txt", 200),
            make_file("/d.txt", 100),
        ];
        let result = grouper.group_by_size(&files);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, 100);
        assert_eq!(result[0].1.len(), 3);
    }

    #[test]
    fn test_directories_skipped() {
        let grouper = SizeGrouper::new(2);
        let files = vec![
            make_dir("/dir1"),
            make_dir("/dir2"),
            make_file("/a.txt", 100),
            make_file("/b.txt", 100),
        ];
        let result = grouper.group_by_size(&files);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, 100);
        assert_eq!(result[0].1.len(), 2);
    }

    #[test]
    fn test_candidate_count() {
        let grouper = SizeGrouper::new(2);
        let files = vec![
            make_file("/a.txt", 100),
            make_file("/b.txt", 100),
            make_file("/c.txt", 200),
            make_file("/d.txt", 100),
            make_file("/e.txt", 200),
        ];
        assert_eq!(grouper.candidate_count(&files), 5);
    }

    #[test]
    fn test_multiple_size_groups() {
        let grouper = SizeGrouper::new(2);
        let files = vec![
            make_file("/a.txt", 100),
            make_file("/b.txt", 100),
            make_file("/c.txt", 200),
            make_file("/d.txt", 200),
            make_file("/e.txt", 300),
        ];
        let result = grouper.group_by_size(&files);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].0, 100);
        assert_eq!(result[1].0, 200);
    }

    #[test]
    fn test_min_group_size_respected() {
        let grouper = SizeGrouper::new(3);
        let files = vec![
            make_file("/a.txt", 100),
            make_file("/b.txt", 100),
            make_file("/c.txt", 200),
            make_file("/d.txt", 200),
            make_file("/e.txt", 200),
        ];
        let result = grouper.group_by_size(&files);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, 200);
    }
}
