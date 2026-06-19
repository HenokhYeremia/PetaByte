use std::sync::Arc;

use petabyte_shared_models::ports::FileRepository;

use crate::dto::ScanResultDto;
use crate::error::EngineError;

pub struct FindLargeFilesUseCase {
    file_repo: Arc<dyn FileRepository>,
}

impl FindLargeFilesUseCase {
    pub fn new(file_repo: Arc<dyn FileRepository>) -> Self {
        Self { file_repo }
    }

    pub fn execute(
        &self,
        _min_size_bytes: u64,
        _max_results: usize,
    ) -> Result<Vec<ScanResultDto>, EngineError> {
        let _count = self
            .file_repo
            .get_entry_count()
            .map_err(EngineError::Port)?;
        Ok(vec![])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::entities::FileEntry;

    struct MockFileRepo;
    impl FileRepository for MockFileRepo {
        fn insert_batch(&self, _entries: &[FileEntry]) -> Result<(), String> {
            Ok(())
        }
        fn get_entry_count(&self) -> Result<u64, String> {
            Ok(42)
        }
    }

    #[test]
    fn test_find_large_files_empty() {
        let use_case = FindLargeFilesUseCase::new(Arc::new(MockFileRepo));
        let results = use_case.execute(1_000_000, 10).unwrap();
        assert!(results.is_empty());
    }
}
