use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::sync::Mutex;

use petabyte_core_engine::use_cases::{
    CalculateHealthUseCase, CleanCacheUseCase, FindDuplicatesUseCase, FindLargeFilesUseCase,
    ScanDriveUseCase, SmartMoveUseCase,
};
use petabyte_shared_models::ports::ProgressEmitter;

#[derive(Clone)]
pub struct AppState {
    pub scan_uc: Arc<ScanDriveUseCase>,
    pub duplicate_uc: Arc<FindDuplicatesUseCase>,
    pub move_uc: Arc<SmartMoveUseCase>,
    pub clean_uc: Arc<CleanCacheUseCase>,
    pub health_uc: Arc<CalculateHealthUseCase>,
    pub find_large_uc: Arc<FindLargeFilesUseCase>,
    pub progress: Arc<dyn ProgressEmitter>,
    pub current_cancel: Arc<Mutex<Option<Arc<AtomicBool>>>>,
}
