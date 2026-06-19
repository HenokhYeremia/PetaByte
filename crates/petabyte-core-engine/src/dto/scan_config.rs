use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanConfig {
    pub root_path: String,
    pub exclude_patterns: Vec<String>,
    pub exclude_hidden: bool,
    pub max_depth: Option<u32>,
    pub follow_symlinks: bool,
    pub batch_size: Option<usize>,
    pub max_file_size: Option<u64>,
    pub min_file_size: Option<u64>,
}

impl Default for ScanConfig {
    fn default() -> Self {
        Self {
            root_path: String::new(),
            exclude_patterns: Vec::new(),
            exclude_hidden: true,
            max_depth: None,
            follow_symlinks: false,
            batch_size: None,
            max_file_size: None,
            min_file_size: None,
        }
    }
}

impl ScanConfig {
    pub fn new(root_path: impl Into<String>) -> Self {
        Self {
            root_path: root_path.into(),
            ..Default::default()
        }
    }

    pub fn validate(&self) -> Result<(), crate::error::EngineError> {
        if self.root_path.is_empty() {
            return Err(crate::error::EngineError::Validation(
                "root_path must not be empty".into(),
            ));
        }
        if !std::path::Path::new(&self.root_path).exists() {
            return Err(crate::error::EngineError::Validation(format!(
                "root_path does not exist: {}",
                self.root_path
            )));
        }
        Ok(())
    }
}
