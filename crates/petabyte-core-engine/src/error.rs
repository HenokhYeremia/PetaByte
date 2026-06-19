use thiserror::Error;

#[derive(Debug, Error)]
pub enum EngineError {
    #[error("Port operation failed: {0}")]
    Port(String),
    #[error("Resource not found: {0}")]
    NotFound(String),
    #[error("Validation failed: {0}")]
    Validation(String),
    #[error("Operation was cancelled")]
    Cancelled,
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
    #[error("{0}")]
    Unknown(String),
}

impl From<String> for EngineError {
    fn from(s: String) -> Self {
        EngineError::Port(s)
    }
}
