#[derive(Clone)]
pub struct DuplicateDetectionConfig {
    pub partial_hash_size: u64,
    pub min_group_size: usize,
    pub enable_extension_grouping: bool,
    pub max_concurrent_hashes: usize,
    pub batch_size: usize,
}

impl Default for DuplicateDetectionConfig {
    fn default() -> Self {
        Self {
            partial_hash_size: 8_192,
            min_group_size: 2,
            enable_extension_grouping: true,
            max_concurrent_hashes: 4,
            batch_size: 500,
        }
    }
}

impl DuplicateDetectionConfig {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    #[must_use]
    pub fn with_partial_hash_size(mut self, bytes: u64) -> Self {
        self.partial_hash_size = bytes;
        self
    }

    #[must_use]
    pub fn with_extension_grouping(mut self, enabled: bool) -> Self {
        self.enable_extension_grouping = enabled;
        self
    }

    #[must_use]
    pub fn with_max_concurrent_hashes(mut self, n: usize) -> Self {
        self.max_concurrent_hashes = n;
        self
    }

    #[must_use]
    pub fn with_batch_size(mut self, n: usize) -> Self {
        self.batch_size = n;
        self
    }
}
