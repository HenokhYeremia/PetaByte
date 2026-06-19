use thiserror::Error;

#[derive(Debug, Error)]
pub enum MoveError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Source path does not exist: {0}")]
    SourceNotFound(String),

    #[error("Destination already exists: {0}")]
    DestinationExists(String),

    #[error("Verification failed — source and destination differ: {0}")]
    VerificationFailed(String),

    #[error("Journal error: {0}")]
    Journal(String),

    #[error("Trash error: {0}")]
    Trash(String),

    #[error("Undo not available: {0}")]
    UndoNotAvailable(String),

    #[error("Operation cancelled")]
    Cancelled,

    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

pub type MoveResult<T> = Result<T, MoveError>;
