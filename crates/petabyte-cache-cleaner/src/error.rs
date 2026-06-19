use thiserror::Error;

#[derive(Debug, Error)]
pub enum CleanerError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Rule parse error: {0}")]
    RuleParse(String),

    #[error("Trash error: {0}")]
    Trash(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Walk error: {0}")]
    Walk(String),
}

pub type CleanerResult<T> = Result<T, CleanerError>;
