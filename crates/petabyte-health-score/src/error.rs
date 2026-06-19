use thiserror::Error;

#[derive(Debug, Error)]
pub enum HealthScoreError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("No data available for scoring")]
    NoData,
}

pub type HealthScoreResult<T> = Result<T, HealthScoreError>;
