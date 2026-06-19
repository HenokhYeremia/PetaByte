use std::sync::Arc;
use thiserror::Error;

#[derive(Debug, Error, Clone)]
pub enum DuplicateError {
    #[error("I/O error: {0}")]
    Io(Arc<std::io::Error>),

    #[error("Hash error: {0}")]
    Hash(String),

    #[error("Cancelled by user")]
    Cancelled,

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<std::io::Error> for DuplicateError {
    fn from(e: std::io::Error) -> Self {
        Self::Io(Arc::new(e))
    }
}

pub type DuplicateResult<T> = std::result::Result<T, DuplicateError>;
