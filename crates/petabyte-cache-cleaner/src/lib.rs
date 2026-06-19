pub mod error;
pub mod rule_engine;
pub mod rules;
pub mod safe_remover;
pub mod size_calculator;

pub use error::{CleanerError, CleanerResult};
pub use rule_engine::RuleEngine;
pub use rules::builtin::CacheRule;
pub use safe_remover::{RemovalStats, SafeRemover};
pub use size_calculator::{SizeCalculator, SizeInfo};
