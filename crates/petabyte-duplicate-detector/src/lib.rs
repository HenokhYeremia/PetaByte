mod config;
mod detector;
mod duplicate_reporter;
mod error;
mod extension_grouper;
mod full_hash_verifier;
mod hash_cache;
mod partial_hash_matcher;
mod size_grouper;

pub use config::DuplicateDetectionConfig;
pub use detector::Detector;
pub use duplicate_reporter::DuplicateReporter;
pub use error::{DuplicateError, DuplicateResult};
pub use extension_grouper::ExtensionGrouper;
pub use full_hash_verifier::FullHashVerifier;
pub use hash_cache::HashCache;
pub use partial_hash_matcher::PartialHashMatcher;
pub use size_grouper::SizeGrouper;
