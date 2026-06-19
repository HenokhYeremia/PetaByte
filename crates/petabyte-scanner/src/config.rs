#[derive(Debug, Clone)]
pub struct ScannerConfig {
    pub root_path: String,
    pub exclude_patterns: Vec<String>,
    pub exclude_hidden: bool,
    pub max_depth: Option<u32>,
    pub follow_symlinks: bool,
    pub batch_size: usize,
    pub checkpoint_interval: usize,
    pub thread_count: Option<usize>,
    pub max_file_size: Option<u64>,
    pub min_file_size: Option<u64>,
}

impl Default for ScannerConfig {
    fn default() -> Self {
        Self {
            root_path: String::new(),
            exclude_patterns: Vec::new(),
            exclude_hidden: true,
            max_depth: None,
            follow_symlinks: false,
            batch_size: 500,
            checkpoint_interval: 10_000,
            thread_count: None,
            max_file_size: None,
            min_file_size: None,
        }
    }
}

impl ScannerConfig {
    pub fn new(root_path: impl Into<String>) -> Self {
        Self {
            root_path: root_path.into(),
            ..Default::default()
        }
    }

    pub fn validate(&self) -> Result<(), super::ScannerError> {
        if self.root_path.is_empty() {
            return Err(super::ScannerError::InvalidConfig(
                "root_path must not be empty".into(),
            ));
        }
        if !std::path::Path::new(&self.root_path).exists() {
            return Err(super::ScannerError::InvalidConfig(format!(
                "root_path does not exist: {}",
                self.root_path
            )));
        }
        if self.batch_size == 0 {
            return Err(super::ScannerError::InvalidConfig(
                "batch_size must be > 0".into(),
            ));
        }
        Ok(())
    }
}
