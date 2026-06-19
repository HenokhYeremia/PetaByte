use petabyte_shared_models::entities::{
    DuplicateGroup, DuplicateGroupMember, DuplicateStats, FileEntry,
};

pub struct DuplicateReporter;

impl DuplicateReporter {
    pub fn new() -> Self {
        Self
    }

    pub fn build_groups(
        &self,
        full_hash_groups: Vec<(&str, Vec<&FileEntry>)>,
    ) -> Vec<DuplicateGroup> {
        full_hash_groups
            .into_iter()
            .enumerate()
            .map(|(idx, (full_hash_key, members))| {
                let file_size = members[0].file_size;
                let file_count = members.len() as u64;
                let total_wasted = file_size * (file_count - 1);

                let group_members: Vec<DuplicateGroupMember> = members
                    .into_iter()
                    .map(|entry| DuplicateGroupMember {
                        file_path: entry.file_path.to_string_lossy().to_string(),
                        file_name: entry.file_name.clone(),
                        file_size: entry.file_size,
                        is_directory: entry.is_directory,
                        is_keep: false,
                        marked_for_removal: false,
                    })
                    .collect();

                DuplicateGroup {
                    group_id: format!("dup_{}", idx),
                    file_size,
                    partial_hash: String::new(),
                    full_hash: full_hash_key.to_string(),
                    file_count,
                    total_wasted_bytes: total_wasted,
                    members: group_members,
                }
            })
            .collect()
    }

    pub fn compute_stats(&self, groups: &[DuplicateGroup]) -> DuplicateStats {
        let total_groups = groups.len() as u64;
        let total_duplicate_files: u64 = groups.iter().map(|g| g.file_count).sum();
        let total_wasted_bytes: u64 = groups.iter().map(|g| g.total_wasted_bytes).sum();
        let total_unique_size: u64 = groups.iter().map(|g| g.file_size).sum();

        let (largest_group_size, largest_group_wasted, largest_group_count) = groups
            .iter()
            .map(|g| (g.file_size, g.total_wasted_bytes, g.file_count))
            .max_by_key(|(_, wasted, _)| *wasted)
            .unwrap_or((0, 0, 0));

        DuplicateStats {
            total_groups,
            total_duplicate_files,
            total_wasted_bytes,
            total_unique_size,
            largest_group_size,
            largest_group_wasted,
            largest_group_count,
        }
    }

    pub fn build_result(
        &self,
        groups: Vec<DuplicateGroup>,
    ) -> (Vec<DuplicateGroup>, DuplicateStats) {
        let stats = self.compute_stats(&groups);
        (groups, stats)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::value_objects::FilePath;

    fn make_entry(path: &str, size: u64) -> FileEntry {
        FileEntry::new(
            FilePath::new(path).unwrap(),
            None,
            path.rsplit('/').next().unwrap_or(path).into(),
            path.rsplit('.').next().map(|e| e.to_string()),
            size,
            false,
            false,
            0o644,
            1_700_000_000,
            1,
        )
    }

    #[test]
    fn test_empty_groups() {
        let reporter = DuplicateReporter::new();
        let groups = reporter.build_groups(vec![]);
        assert!(groups.is_empty());
    }

    #[test]
    fn test_single_group() {
        let reporter = DuplicateReporter::new();
        let f1 = make_entry("/a.txt", 100);
        let f2 = make_entry("/b.txt", 100);

        let groups = reporter.build_groups(vec![("hash1", vec![&f1, &f2])]);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].file_size, 100);
        assert_eq!(groups[0].file_count, 2);
        assert_eq!(groups[0].total_wasted_bytes, 100);
        assert_eq!(groups[0].members.len(), 2);
    }

    #[test]
    fn test_multiple_groups() {
        let reporter = DuplicateReporter::new();
        let f1 = make_entry("/a.txt", 100);
        let f2 = make_entry("/b.txt", 100);
        let f3 = make_entry("/c.txt", 200);
        let f4 = make_entry("/d.txt", 200);
        let f5 = make_entry("/e.txt", 200);

        let groups = reporter.build_groups(vec![
            ("hash1", vec![&f1, &f2]),
            ("hash2", vec![&f3, &f4, &f5]),
        ]);
        assert_eq!(groups.len(), 2);
        assert_eq!(groups[1].file_count, 3);
        assert_eq!(groups[1].total_wasted_bytes, 400);
    }

    #[test]
    fn test_compute_stats() {
        let reporter = DuplicateReporter::new();
        let f1 = make_entry("/a.txt", 100);
        let f2 = make_entry("/b.txt", 100);

        let groups = reporter.build_groups(vec![("hash1", vec![&f1, &f2])]);
        let stats = reporter.compute_stats(&groups);

        assert_eq!(stats.total_groups, 1);
        assert_eq!(stats.total_duplicate_files, 2);
        assert_eq!(stats.total_wasted_bytes, 100);
        assert_eq!(stats.total_unique_size, 100);
    }

    #[test]
    fn test_member_fields() {
        let reporter = DuplicateReporter::new();
        let f1 = make_entry("/a.txt", 100);

        let groups = reporter.build_groups(vec![("hash1", vec![&f1])]);
        assert_eq!(groups[0].members[0].file_path, "/a.txt");
        assert_eq!(groups[0].members[0].file_name, "a.txt");
        assert!(!groups[0].members[0].is_keep);
        assert!(!groups[0].members[0].marked_for_removal);
    }

    #[test]
    fn test_largest_group_stats() {
        let reporter = DuplicateReporter::new();
        let f1 = make_entry("/a.txt", 100);
        let f2 = make_entry("/b.txt", 100);
        let f3 = make_entry("/c.txt", 100);
        let f4 = make_entry("/d.txt", 50);

        let groups = reporter.build_groups(vec![
            ("hash1", vec![&f4]),
            ("hash2", vec![&f1, &f2, &f3]),
        ]);
        let stats = reporter.compute_stats(&groups);
        assert_eq!(stats.largest_group_wasted, 200);
        assert_eq!(stats.largest_group_count, 3);
    }
}
