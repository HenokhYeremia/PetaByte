use thiserror::Error;

#[derive(Debug, Error)]
pub enum HashError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Hashing was cancelled")]
    Cancelled,

    #[error("File is empty: {0}")]
    EmptyFile(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

pub type HashResult<T> = Result<T, HashError>;
