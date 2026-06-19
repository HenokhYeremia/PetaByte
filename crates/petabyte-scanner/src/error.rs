use thiserror::Error;

#[derive(Debug, Error)]
pub enum ScannerError {
    #[error("I/O error at {path}: {source}")]
    Io { path: String, source: std::io::Error },

    #[error("Path canonicalization error: {0}")]
    Canonicalize(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Walk error at {path}: {message}")]
    WalkError { path: String, message: String },

    #[error("Symlink loop detected at: {0}")]
    SymlinkLoop(String),

    #[error("Scan cancelled")]
    Cancelled,

    #[error("Batch handler error: {0}")]
    Handler(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),
}
