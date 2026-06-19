use serde::{Deserialize, Serialize};
use std::fmt;
use std::ops::{Add, AddAssign};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize, Hash)]
pub struct FileSize(u64);

impl FileSize {
    pub const ZERO: FileSize = FileSize(0);

    #[must_use]
    pub fn new(bytes: u64) -> Self {
        Self(bytes)
    }

    #[must_use]
    pub fn bytes(&self) -> u64 {
        self.0
    }

    #[must_use]
    pub fn kilobytes(&self) -> f64 {
        self.0 as f64 / 1024.0
    }

    #[must_use]
    pub fn megabytes(&self) -> f64 {
        self.kilobytes() / 1024.0
    }

    #[must_use]
    pub fn gigabytes(&self) -> f64 {
        self.megabytes() / 1024.0
    }

    #[must_use]
    pub fn is_zero(&self) -> bool {
        self.0 == 0
    }

    #[must_use]
    pub fn format_human(&self) -> String {
        const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB", "PB"];
        let mut size = self.0 as f64;
        let mut unit_idx = 0;
        while size >= 1024.0 && unit_idx < UNITS.len() - 1 {
            size /= 1024.0;
            unit_idx += 1;
        }
        if unit_idx == 0 {
            format!("{} {}", self.0, UNITS[unit_idx])
        } else {
            format!("{:.2} {}", size, UNITS[unit_idx])
        }
    }
}

impl Add for FileSize {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Self(self.0 + other.0)
    }
}

impl AddAssign for FileSize {
    fn add_assign(&mut self, other: Self) {
        self.0 += other.0;
    }
}

impl From<u64> for FileSize {
    fn from(bytes: u64) -> Self {
        Self(bytes)
    }
}

impl fmt::Display for FileSize {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.format_human())
    }
}
