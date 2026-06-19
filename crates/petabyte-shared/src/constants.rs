/// Maximum scan depth from root (0 = root only, None = unlimited)
pub const DEFAULT_MAX_SCAN_DEPTH: Option<u32> = None;

/// Default batch size for database inserts
pub const DEFAULT_BATCH_SIZE: usize = 500;

/// Channel capacity for walker-to-processor communication
pub const DEFAULT_CHANNEL_CAPACITY: usize = 10_000;

/// Checkpoint interval in files
pub const DEFAULT_CHECKPOINT_INTERVAL: usize = 10_000;

/// Checkpoint interval in seconds
pub const CHECKPOINT_INTERVAL_SECS: u64 = 30;

/// Maximum file size to process individually (16GB)
pub const MAX_FILE_SIZE_BYTES: u64 = 16_000_000_000;

/// System directories that should not be scanned
pub const SYSTEM_DIRECTORIES: &[&str] = &[
    "/etc",
    "/dev",
    "/proc",
    "/sys",
    "/boot",
    "/System",
    "/Library",
    "C:\\Windows",
    "C:\\Program Files",
    "C:\\Program Files (x86)",
];
