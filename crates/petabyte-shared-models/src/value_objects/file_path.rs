use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct FilePath(PathBuf);

impl FilePath {
    pub fn new(path: impl Into<PathBuf>) -> Result<Self, FilePathError> {
        let path = path.into();
        if path.as_os_str().is_empty() {
            return Err(FilePathError::Empty);
        }
        Ok(Self(path))
    }

    pub fn from_canonical(path: impl Into<PathBuf>) -> Self {
        Self(path.into())
    }

    pub fn as_path(&self) -> &Path {
        &self.0
    }

    pub fn into_inner(self) -> PathBuf {
        self.0
    }

    pub fn as_str(&self) -> std::borrow::Cow<'_, str> {
        self.0.to_string_lossy()
    }

    pub fn parent(&self) -> Option<FilePath> {
        self.0.parent().map(|p| FilePath(p.to_path_buf()))
    }

    pub fn file_name(&self) -> Option<&str> {
        self.0.file_name().and_then(|n| n.to_str())
    }

    pub fn extension(&self) -> Option<&str> {
        self.0.extension().and_then(|e| e.to_str())
    }

    pub fn starts_with(&self, other: &FilePath) -> bool {
        self.0.starts_with(&other.0)
    }

    pub fn to_string_lossy(&self) -> std::borrow::Cow<'_, str> {
        self.0.to_string_lossy()
    }
}

impl AsRef<Path> for FilePath {
    fn as_ref(&self) -> &Path {
        &self.0
    }
}

impl fmt::Display for FilePath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0.display())
    }
}

#[derive(Debug, Clone, thiserror::Error)]
pub enum FilePathError {
    #[error("File path is empty")]
    Empty,
    #[error("Invalid path: {0}")]
    Invalid(String),
}
