pub mod config;
pub mod error;
pub mod factors;
pub mod recommendation_engine;
pub mod scoring_engine;
pub mod trend_analyzer;

pub use config::ScoringConfig;
pub use error::{HealthScoreError, HealthScoreResult};
pub use recommendation_engine::RecommendationEngine;
pub use scoring_engine::ScoringEngine;
pub use trend_analyzer::TrendAnalyzer;
