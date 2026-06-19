use thiserror::Error;

#[derive(Debug, Error)]
pub enum PetaByteError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    #[error("Operation cancelled")]
    Cancelled,
    #[error("Database error: {0}")]
    Database(String),
    #[error("Internal error: {0}")]
    Internal(String),
}
