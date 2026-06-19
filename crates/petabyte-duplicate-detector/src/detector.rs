use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;

use petabyte_shared_models::entities::{DuplicateGroup, FileEntry};
use petabyte_shared_models::ports::{DuplicateProgress, DuplicateResult, ProgressEmitter};
use rayon::prelude::*;

use crate::config::DuplicateDetectionConfig;
use crate::duplicate_reporter::DuplicateReporter;
use crate::error::{DuplicateError, DuplicateResult as CrateResult};
use crate::extension_grouper::ExtensionGrouper;
use crate::full_hash_verifier::FullHashVerifier;
use crate::hash_cache::HashCache;
use crate::partial_hash_matcher::PartialHashMatcher;
use crate::size_grouper::SizeGrouper;

pub struct Detector {
    config: DuplicateDetectionConfig,
    size_grouper: SizeGrouper,
    extension_grouper: ExtensionGrouper,
    partial_hash_matcher: PartialHashMatcher,
    full_hash_verifier: FullHashVerifier,
    reporter: DuplicateReporter,
    hash_cache: Arc<HashCache>,
    total_candidates: Arc<AtomicU64>,
    partial_hashed: Arc<AtomicU64>,
    full_hashed: Arc<AtomicU64>,
    groups_found: Arc<AtomicU64>,
    start_time: parking_lot::Mutex<Option<Instant>>,
}

impl Detector {
    #[must_use]
    pub fn new(config: DuplicateDetectionConfig) -> Self {
        let partial_hashed = Arc::new(AtomicU64::new(0));
        let full_hashed = Arc::new(AtomicU64::new(0));

        Self {
            size_grouper: SizeGrouper::new(config.min_group_size),
            extension_grouper: ExtensionGrouper::new(),
            partial_hash_matcher: PartialHashMatcher::new(&config, partial_hashed.clone()),
            full_hash_verifier: FullHashVerifier::new(full_hashed.clone()),
            reporter: DuplicateReporter::new(),
            hash_cache: Arc::new(HashCache::new()),
            total_candidates: Arc::new(AtomicU64::new(0)),
            partial_hashed,
            full_hashed,
            groups_found: Arc::new(AtomicU64::new(0)),
            config,
            start_time: parking_lot::Mutex::new(None),
        }
    }

    pub fn with_hash_cache(mut self, cache: Arc<HashCache>) -> Self {
        self.hash_cache = cache;
        self
    }

    pub fn detect(
        &self,
        files: &[FileEntry],
        cancel: &AtomicBool,
    ) -> Result<DuplicateResult, String> {
        self.emit_progress(None, "idle");

        let candidates = self.size_grouper.candidate_count(files);
        self.total_candidates
            .store(candidates as u64, Ordering::Relaxed);
        *self.start_time.lock() = Some(Instant::now());

        let size_groups = self.size_grouper.group_by_size(files);

        if size_groups.is_empty() {
            return Ok(self.build_result());
        }

        self.emit_progress(None, "grouping");
        let groups = self.process_size_groups(&size_groups, cancel)?;

        self.emit_progress(None, "complete");
        Ok(groups)
    }

    fn process_size_groups(
        &self,
        size_groups: &[(u64, Vec<&FileEntry>)],
        cancel: &AtomicBool,
    ) -> Result<DuplicateResult, String> {
        let batch_size = self.config.batch_size;
        let mut all_groups: Vec<DuplicateGroup> = Vec::new();

        for chunk in size_groups.chunks(batch_size) {
            if cancel.load(Ordering::Relaxed) {
                return Err("Detection cancelled".into());
            }

            let chunk_groups: Vec<DuplicateGroup> = chunk
                .par_iter()
                .filter_map(|(size, group)| {
                    if cancel.load(Ordering::Relaxed) {
                        return None;
                    }
                    self.process_single_size_group(*size, group, cancel).ok()
                })
                .flatten()
                .collect();

            all_groups.extend(chunk_groups);
            self.groups_found
                .store(all_groups.len() as u64, Ordering::Relaxed);
        }

        Ok(self.build_result_from(all_groups))
    }

    fn process_single_size_group(
        &self,
        size: u64,
        group: &[&FileEntry],
        cancel: &AtomicBool,
    ) -> CrateResult<Vec<DuplicateGroup>> {
        if cancel.load(Ordering::Relaxed) {
            return Err(DuplicateError::Cancelled);
        }

        let ext_groups = if self.config.enable_extension_grouping {
            self.extension_grouper.group_by_extension(group)
        } else {
            vec![(None, group.to_vec())]
        };

        let mut result = Vec::new();

        for (_ext, ext_group) in &ext_groups {
            if cancel.load(Ordering::Relaxed) {
                return Err(DuplicateError::Cancelled);
            }

            if ext_group.len() < self.config.min_group_size {
                continue;
            }

            let hashed = self.partial_hash_matcher.compute_partial_hashes(
                ext_group,
                cancel,
                &self.hash_cache,
            )?;

            let partial_groups = self.partial_hash_matcher.group_by_partial_hash(hashed);

            for (partial_hash, partial_group) in &partial_groups {
                if cancel.load(Ordering::Relaxed) {
                    return Err(DuplicateError::Cancelled);
                }

                let verified = self.full_hash_verifier.verify(
                    partial_hash,
                    partial_group,
                    cancel,
                    &self.hash_cache,
                )?;

                let full_hash_groups = self.full_hash_verifier.group_by_full_hash(verified);

                for (full_hash, full_group) in &full_hash_groups {
                    let partial_key = format!("{size}_{partial_hash}");
                    let full_key = format!("{size}_{full_hash}");

                    let groups = self
                        .reporter
                        .build_groups(vec![(&full_key, full_group.clone())]);
                    let groups_with_partial: Vec<DuplicateGroup> = groups
                        .into_iter()
                        .map(|mut g| {
                            g.partial_hash = partial_key.clone();
                            g.full_hash = full_key.clone();
                            g
                        })
                        .collect();
                    result.extend(groups_with_partial);
                    self.groups_found.fetch_add(1, Ordering::Relaxed);
                }
            }
        }

        Ok(result)
    }

    fn build_result(&self) -> DuplicateResult {
        DuplicateResult {
            groups: Vec::new(),
            stats: self.reporter.compute_stats(&[]),
            progress: self.current_progress(),
        }
    }

    fn build_result_from(&self, groups: Vec<DuplicateGroup>) -> DuplicateResult {
        let stats = self.reporter.compute_stats(&groups);
        DuplicateResult {
            stats,
            groups,
            progress: self.current_progress(),
        }
    }

    fn current_progress(&self) -> DuplicateProgress {
        let start = self.start_time.lock();
        let elapsed = start.map(|s| s.elapsed().as_secs()).unwrap_or(0);
        let (hits, misses) = self.hash_cache.stats();

        DuplicateProgress {
            total_candidates: self.total_candidates.load(Ordering::Relaxed),
            partial_hashed: self.partial_hashed.load(Ordering::Relaxed),
            full_hashed: self.full_hashed.load(Ordering::Relaxed),
            groups_found: self.groups_found.load(Ordering::Relaxed),
            elapsed_secs: elapsed,
            stage: "detecting".into(),
            hash_cache_hits: hits,
            hash_cache_misses: misses,
        }
    }

    fn emit_progress(&self, emitter: Option<&dyn ProgressEmitter>, stage: &str) {
        if let Some(emitter) = emitter {
            let progress = self.current_progress();
            let payload = petabyte_shared_models::ports::ProgressPayload {
                scanned_files: progress.partial_hashed,
                scanned_dirs: 0,
                scanned_size: 0,
                error_count: progress.hash_cache_misses,
                elapsed_secs: progress.elapsed_secs,
                status: stage.to_string(),
            };
            emitter.on_progress(&payload);
        }
    }

    pub fn hash_cache(&self) -> &Arc<HashCache> {
        &self.hash_cache
    }
}

impl petabyte_shared_models::ports::DuplicateDetector for Detector {
    fn detect(&self, files: &[FileEntry], cancel: &AtomicBool) -> Result<DuplicateResult, String> {
        self.detect(files, cancel)
    }

    fn detect_with_emitter(
        &self,
        files: &[FileEntry],
        cancel: &AtomicBool,
        emitter: Option<Arc<dyn ProgressEmitter>>,
    ) -> Result<DuplicateResult, String> {
        let emitter_ref = emitter.as_ref().map(std::convert::AsRef::as_ref);
        self.emit_progress(emitter_ref, "idle");

        let candidates = self.size_grouper.candidate_count(files);
        self.total_candidates
            .store(candidates as u64, Ordering::Relaxed);
        *self.start_time.lock() = Some(Instant::now());

        let size_groups = self.size_grouper.group_by_size(files);

        if size_groups.is_empty() {
            self.emit_progress(emitter_ref, "complete");
            return Ok(self.build_result());
        }

        self.emit_progress(emitter_ref, "grouping");
        let result = self.process_size_groups_with_emitter(&size_groups, cancel, emitter_ref)?;

        self.emit_progress(emitter_ref, "complete");
        Ok(result)
    }

    fn progress(&self) -> DuplicateProgress {
        self.current_progress()
    }
}

impl Detector {
    fn process_size_groups_with_emitter(
        &self,
        size_groups: &[(u64, Vec<&FileEntry>)],
        cancel: &AtomicBool,
        emitter: Option<&dyn ProgressEmitter>,
    ) -> Result<DuplicateResult, String> {
        let batch_size = self.config.batch_size;
        let mut all_groups: Vec<DuplicateGroup> = Vec::new();

        for chunk in size_groups.chunks(batch_size) {
            if cancel.load(Ordering::Relaxed) {
                return Err("Detection cancelled".into());
            }

            let chunk_groups: Vec<DuplicateGroup> = chunk
                .par_iter()
                .filter_map(|(size, group)| {
                    if cancel.load(Ordering::Relaxed) {
                        return None;
                    }
                    self.process_single_size_group(*size, group, cancel).ok()
                })
                .flatten()
                .collect();

            all_groups.extend(chunk_groups);
            self.groups_found
                .store(all_groups.len() as u64, Ordering::Relaxed);
            self.emit_progress(emitter, "processing");
        }

        Ok(self.build_result_from(all_groups))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::ports::DuplicateDetector;
    use petabyte_shared_models::value_objects::FilePath;
    use std::io::Write;

    fn make_entry(path: &str, size: u64) -> FileEntry {
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

    fn create_temp_file(content: &[u8]) -> (tempfile::TempDir, String) {
        let dir = tempfile::TempDir::new().unwrap();
        let path = dir.path().join("test.dat");
        let mut f = std::fs::File::create(&path).unwrap();
        f.write_all(content).unwrap();
        let path_str = path.to_string_lossy().to_string();
        (dir, path_str)
    }

    fn create_temp_files(count: usize, content: &[u8], dir: &tempfile::TempDir) -> Vec<String> {
        let mut paths = Vec::with_capacity(count);
        for i in 0..count {
            let path = dir.path().join(format!("test_{i}.dat"));
            let mut f = std::fs::File::create(&path).unwrap();
            f.write_all(content).unwrap();
            paths.push(path.to_string_lossy().to_string());
        }
        paths
    }

    #[test]
    fn test_no_duplicates() {
        let config = DuplicateDetectionConfig::default();
        let detector = Detector::new(config);
        let cancel = AtomicBool::new(false);

        let (_d1, p1) = create_temp_file(b"unique content a");
        let (_d2, p2) = create_temp_file(b"unique content b");
        let files = vec![make_entry(&p1, 16), make_entry(&p2, 17)];

        let result = detector.detect(&files, &cancel).unwrap();
        assert!(result.groups.is_empty());
    }

    #[test]
    fn test_finds_duplicates() {
        let config = DuplicateDetectionConfig::default();
        let detector = Detector::new(config);
        let cancel = AtomicBool::new(false);

        let dir = tempfile::TempDir::new().unwrap();
        let content = b"duplicate content for testing";
        let paths = create_temp_files(3, content, &dir);

        let files: Vec<FileEntry> = paths
            .iter()
            .map(|p| make_entry(p, content.len() as u64))
            .collect();

        let result = detector.detect(&files, &cancel).unwrap();
        assert_eq!(result.groups.len(), 1);
        assert_eq!(result.groups[0].file_count, 3);
        assert_eq!(
            result.groups[0].total_wasted_bytes,
            content.len() as u64 * 2
        );
    }

    #[test]
    fn test_cancellation() {
        let config = DuplicateDetectionConfig::default();
        let detector = Detector::new(config);
        let cancel = AtomicBool::new(true);

        let files = vec![];
        let result = detector.detect(&files, &cancel);
        assert!(result.is_ok());
    }

    #[test]
    fn test_different_sizes_not_duplicates() {
        let config = DuplicateDetectionConfig::default();
        let detector = Detector::new(config);
        let cancel = AtomicBool::new(false);

        let content_a = b"exact content for a";
        let content_b = b"exact content but longer for b";

        let dir = tempfile::TempDir::new().unwrap();
        let path_a = dir.path().join("a.txt");
        let mut f = std::fs::File::create(&path_a).unwrap();
        f.write_all(content_a).unwrap();

        let path_b = dir.path().join("b.txt");
        let mut f = std::fs::File::create(&path_b).unwrap();
        f.write_all(content_b).unwrap();

        let files = vec![
            make_entry(&path_a.to_string_lossy(), content_a.len() as u64),
            make_entry(&path_b.to_string_lossy(), content_b.len() as u64),
        ];

        let result = detector.detect(&files, &cancel).unwrap();
        assert!(result.groups.is_empty());
    }

    #[test]
    fn test_multiple_duplicate_groups() {
        let config = DuplicateDetectionConfig::default();
        let detector = Detector::new(config);
        let cancel = AtomicBool::new(false);

        let dir = tempfile::TempDir::new().unwrap();

        let content_a = b"group A content exactly";
        let content_b = b"group B content diff";

        let mut files: Vec<FileEntry> = Vec::new();

        for i in 0..2 {
            let path = dir.path().join(format!("a_{i}.dat"));
            std::fs::write(&path, content_a).unwrap();
            files.push(make_entry(&path.to_string_lossy(), content_a.len() as u64));
        }

        for i in 0..3 {
            let path = dir.path().join(format!("b_{i}.dat"));
            std::fs::write(&path, content_b).unwrap();
            files.push(make_entry(&path.to_string_lossy(), content_b.len() as u64));
        }

        let result = detector.detect(&files, &cancel).unwrap();
        assert_eq!(result.groups.len(), 2);
    }

    #[test]
    fn test_progress_query() {
        let config = DuplicateDetectionConfig::default();
        let detector = Detector::new(config);
        let progress = detector.progress();
        assert_eq!(progress.total_candidates, 0);
    }

    #[test]
    fn test_single_file_no_group() {
        let config = DuplicateDetectionConfig::default();
        let detector = Detector::new(config);
        let cancel = AtomicBool::new(false);

        let (_d, path) = create_temp_file(b"alone file content");
        let files = vec![make_entry(&path, 18)];

        let result = detector.detect(&files, &cancel).unwrap();
        assert!(result.groups.is_empty());
    }

    #[test]
    fn test_extension_grouping_filters_different_ext() {
        let config = DuplicateDetectionConfig::default().with_extension_grouping(true);
        let detector = Detector::new(config);
        let cancel = AtomicBool::new(false);

        let dir = tempfile::TempDir::new().unwrap();

        let content = b"same content different extension";

        let txt_path = dir.path().join("a.txt");
        let mut f = std::fs::File::create(&txt_path).unwrap();
        f.write_all(content).unwrap();

        let jpg_path = dir.path().join("a.jpg");
        let mut f = std::fs::File::create(&jpg_path).unwrap();
        f.write_all(content).unwrap();

        let files = vec![
            make_entry(&txt_path.to_string_lossy(), content.len() as u64),
            make_entry(&jpg_path.to_string_lossy(), content.len() as u64),
        ];

        let result = detector.detect(&files, &cancel).unwrap();
        assert!(result.groups.is_empty());
    }

    #[test]
    fn test_duplicate_detector_trait() {
        let config = DuplicateDetectionConfig::default();
        let detector = Detector::new(config);
        let cancel = AtomicBool::new(false);

        let dir = tempfile::TempDir::new().unwrap();
        let content = b"trait test content";
        let paths = create_temp_files(2, content, &dir);
        let files: Vec<FileEntry> = paths
            .iter()
            .map(|p| make_entry(p, content.len() as u64))
            .collect();

        let result = DuplicateDetector::detect(&detector, &files, &cancel).unwrap();
        assert_eq!(result.groups.len(), 1);
    }
}
