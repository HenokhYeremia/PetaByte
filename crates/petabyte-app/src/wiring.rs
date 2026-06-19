use std::sync::{Arc, Mutex};

use petabyte_core_engine::use_cases::*;
use petabyte_database::connection::ConnectionManager;
use petabyte_database::repositories::{FileRepositoryImpl, ScanRepositoryImpl};
use petabyte_shared_models::ports::*;

use crate::adapters::{AppCacheCleaner, AppHealthCalculator, AppProgressEmitter};
use crate::state::AppState;

pub fn build_app_state(app_handle: tauri::AppHandle) -> AppState {
    let db_path = petabyte_shared::platform::default_app_data_dir() + "/petabyte.db";
    let conn = Arc::new(
        ConnectionManager::open(&db_path).expect("Failed to open database"),
    );
    petabyte_database::migrations::run_all(&conn).expect("Failed to run migrations");

    let file_repo = Arc::new(FileRepositoryImpl::new(conn.clone())) as Arc<dyn FileRepository>;
    let scan_repo = Arc::new(ScanRepositoryImpl::new(conn.clone())) as Arc<dyn ScanRepository>;
    let progress = Arc::new(AppProgressEmitter::new(app_handle)) as Arc<dyn ProgressEmitter>;

    let file_op = Arc::new(petabyte_smart_move::TrashHandler::new()) as Arc<dyn FileOpPort>;
    let journal = Arc::new(petabyte_smart_move::InMemoryJournal::new()) as Arc<dyn MoveJournalPort>;

    let mut rule_engine = petabyte_cache_cleaner::RuleEngine::new();
    for rule in petabyte_cache_cleaner::rules::builtin::builtin_rules() {
        rule_engine.add_rule(rule);
    }
    let cache_cleaner =
        Arc::new(AppCacheCleaner::new(rule_engine, true)) as Arc<dyn CacheCleanerPort>;

    let dup_config = petabyte_duplicate_detector::DuplicateDetectionConfig::new()
        .with_partial_hash_size(8192)
        .with_extension_grouping(true)
        .with_max_concurrent_hashes(4);
    let detector =
        Arc::new(petabyte_duplicate_detector::Detector::new(dup_config)) as Arc<dyn DuplicateDetector>;

    let scoring_config = petabyte_health_score::ScoringConfig::default();
    let health_calc = Arc::new(AppHealthCalculator::new(scoring_config, conn.clone()))
        as Arc<dyn HealthScorePort>;

    let scan_uc = Arc::new(ScanDriveUseCase::new(
        file_repo.clone(),
        scan_repo.clone(),
        progress.clone(),
    ));
    let duplicate_uc = Arc::new(FindDuplicatesUseCase::new(detector));
    let move_uc = Arc::new(SmartMoveUseCase::new(file_op, journal));
    let clean_uc = Arc::new(CleanCacheUseCase::new(cache_cleaner));
    let health_uc = Arc::new(CalculateHealthUseCase::new(health_calc));
    let find_large_uc = Arc::new(FindLargeFilesUseCase::new(file_repo));

    AppState {
        scan_uc,
        duplicate_uc,
        move_uc,
        clean_uc,
        health_uc,
        find_large_uc,
        progress,
        current_cancel: Arc::new(Mutex::new(None)),
    }
}
