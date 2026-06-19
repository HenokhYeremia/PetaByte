use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use petabyte_shared_models::ports::DuplicateDetector;

use crate::dto::{DuplicateGroupDto, DuplicateMemberDto, DuplicateResultDto};
use crate::error::EngineError;

pub struct FindDuplicatesUseCase {
    detector: Arc<dyn DuplicateDetector>,
}

impl FindDuplicatesUseCase {
    pub fn new(detector: Arc<dyn DuplicateDetector>) -> Self {
        Self { detector }
    }

    pub fn execute(
        &self,
        files: &[petabyte_shared_models::entities::FileEntry],
        cancel: &AtomicBool,
    ) -> Result<DuplicateResultDto, EngineError> {
        let result = self
            .detector
            .detect(files, cancel)
            .map_err(EngineError::Port)?;

        let groups = result
            .groups
            .into_iter()
            .map(|g| DuplicateGroupDto {
                group_id: g.group_id,
                file_size: g.file_size,
                file_count: g.file_count,
                total_wasted_bytes: g.total_wasted_bytes,
                members: g
                    .members
                    .into_iter()
                    .map(|m| DuplicateMemberDto {
                        file_path: m.file_path,
                        file_name: m.file_name,
                        file_size: m.file_size,
                    })
                    .collect(),
            })
            .collect();

        Ok(DuplicateResultDto {
            total_groups: result.stats.total_groups,
            total_duplicate_files: result.stats.total_duplicate_files,
            total_wasted_bytes: result.stats.total_wasted_bytes,
            total_unique_size: result.stats.total_unique_size,
            largest_group_size: result.stats.largest_group_size,
            largest_group_wasted: result.stats.largest_group_wasted,
            groups,
            partial_hashed: result.progress.partial_hashed,
            full_hashed: result.progress.full_hashed,
            hash_cache_hits: result.progress.hash_cache_hits,
            hash_cache_misses: result.progress.hash_cache_misses,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::entities::*;
    use petabyte_shared_models::ports::{DuplicateProgress, DuplicateResult};
    use std::sync::Arc;

    struct MockDetector;
    impl DuplicateDetector for MockDetector {
        fn detect(
            &self,
            _files: &[FileEntry],
            _cancel: &AtomicBool,
        ) -> Result<DuplicateResult, String> {
            Ok(DuplicateResult {
                groups: vec![DuplicateGroup {
                    group_id: "g1".into(),
                    file_size: 100,
                    partial_hash: "abc".into(),
                    full_hash: "def".into(),
                    file_count: 2,
                    total_wasted_bytes: 100,
                    members: vec![
                        DuplicateGroupMember {
                            file_path: "/a.txt".into(),
                            file_name: "a.txt".into(),
                            file_size: 100,
                            is_directory: false,
                            is_keep: true,
                            marked_for_removal: false,
                        },
                        DuplicateGroupMember {
                            file_path: "/b.txt".into(),
                            file_name: "b.txt".into(),
                            file_size: 100,
                            is_directory: false,
                            is_keep: false,
                            marked_for_removal: true,
                        },
                    ],
                }],
                stats: DuplicateStats {
                    total_groups: 1,
                    total_duplicate_files: 2,
                    total_wasted_bytes: 100,
                    total_unique_size: 100,
                    largest_group_size: 100,
                    largest_group_wasted: 100,
                    largest_group_count: 2,
                },
                progress: DuplicateProgress {
                    total_candidates: 2,
                    partial_hashed: 2,
                    full_hashed: 2,
                    groups_found: 1,
                    elapsed_secs: 1,
                    stage: "done".into(),
                    hash_cache_hits: 0,
                    hash_cache_misses: 2,
                },
            })
        }

        fn detect_with_emitter(
            &self,
            files: &[FileEntry],
            cancel: &AtomicBool,
            _emitter: Option<Arc<dyn petabyte_shared_models::ports::ProgressEmitter>>,
        ) -> Result<DuplicateResult, String> {
            self.detect(files, cancel)
        }

        fn progress(&self) -> DuplicateProgress {
            DuplicateProgress {
                total_candidates: 0,
                partial_hashed: 0,
                full_hashed: 0,
                groups_found: 0,
                elapsed_secs: 0,
                stage: "idle".into(),
                hash_cache_hits: 0,
                hash_cache_misses: 0,
            }
        }
    }

    #[test]
    fn test_find_duplicates() {
        let use_case = FindDuplicatesUseCase::new(Arc::new(MockDetector));
        let cancel = AtomicBool::new(false);
        let result = use_case.execute(&[], &cancel).unwrap();
        assert_eq!(result.total_groups, 1);
        assert_eq!(result.groups.len(), 1);
        assert_eq!(result.groups[0].members.len(), 2);
    }
}
