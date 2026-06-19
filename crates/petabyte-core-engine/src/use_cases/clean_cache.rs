use std::sync::Arc;

use petabyte_shared_models::ports::CacheCleanerPort;

use crate::dto::CleanResultDto;
use crate::error::EngineError;

pub struct CleanCacheUseCase {
    cleaner: Arc<dyn CacheCleanerPort>,
}

impl CleanCacheUseCase {
    pub fn new(cleaner: Arc<dyn CacheCleanerPort>) -> Self {
        Self { cleaner }
    }

    pub fn scan(&self) -> Result<Vec<petabyte_shared_models::entities::CacheEntry>, EngineError> {
        self.cleaner.scan().map_err(EngineError::Port)
    }

    pub fn calculate_total_size(&self) -> Result<u64, EngineError> {
        self.cleaner.calculate_total_size().map_err(EngineError::Port)
    }

    pub fn clean(&self) -> Result<CleanResultDto, EngineError> {
        let result = self.cleaner.clean_all().map_err(EngineError::Port)?;
        Ok(CleanResultDto {
            entries_removed: result.entries_removed,
            total_bytes_freed: result.total_bytes_freed,
            errors: result.errors,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::entities::*;
    use std::sync::Arc;

    struct MockCleaner;
    impl CacheCleanerPort for MockCleaner {
        fn scan(&self) -> Result<Vec<CacheEntry>, String> {
            Ok(vec![CacheEntry {
                path: "/tmp/cache".into(),
                category: CacheCategory::Npm,
                size_bytes: 1000,
                file_count: 10,
                last_accessed: None,
            }])
        }
        fn calculate_total_size(&self) -> Result<u64, String> {
            Ok(1000)
        }
        fn clean(&self, _entries: &[CacheEntry]) -> Result<CacheCleanResult, String> {
            Ok(CacheCleanResult {
                entries_removed: vec!["/tmp/cache".into()],
                total_bytes_freed: 1000,
                errors: vec![],
            })
        }
        fn clean_all(&self) -> Result<CacheCleanResult, String> {
            Ok(CacheCleanResult {
                entries_removed: vec!["/tmp/cache".into()],
                total_bytes_freed: 1000,
                errors: vec![],
            })
        }
        fn estimate(&self, _entries: &[CacheEntry]) -> u64 {
            1000
        }
    }

    #[test]
    fn test_clean_cache_scan() {
        let use_case = CleanCacheUseCase::new(Arc::new(MockCleaner));
        let entries = use_case.scan().unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].size_bytes, 1000);
    }

    #[test]
    fn test_clean_cache_clean() {
        let use_case = CleanCacheUseCase::new(Arc::new(MockCleaner));
        let result = use_case.clean().unwrap();
        assert_eq!(result.total_bytes_freed, 1000);
    }

    #[test]
    fn test_clean_cache_total_size() {
        let use_case = CleanCacheUseCase::new(Arc::new(MockCleaner));
        let size = use_case.calculate_total_size().unwrap();
        assert_eq!(size, 1000);
    }
}
