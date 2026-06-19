use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use petabyte_core_engine::dto::ScanConfig;
use petabyte_core_engine::dto::ScanResultDto;
use petabyte_shared_models::entities::FileEntry;

use crate::state::AppState;

#[tauri::command]
pub async fn start_scan(
    _app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    root_path: String,
) -> Result<ScanResultDto, String> {
    let config = ScanConfig::new(&root_path);
    config.validate().map_err(|e| e.to_string())?;

    let scanner_config = petabyte_scanner::ScannerConfig::new(&root_path);
    let scanner = petabyte_scanner::Scanner::new(scanner_config).map_err(|e| e.to_string())?;
    let scanner_arc = Arc::new(scanner);

    let cancel = Arc::new(AtomicBool::new(false));
    *state.current_cancel.lock().map_err(|e| e.to_string())? = Some(cancel.clone());

    let cancel_for_fn = cancel.clone();
    let scan_fn: petabyte_core_engine::use_cases::ScanFunction =
        Arc::new(move |handler, ext_cancel| {
            if ext_cancel.load(Ordering::SeqCst) || cancel_for_fn.load(Ordering::SeqCst) {
                scanner_arc.cancel();
                return Err("cancelled".into());
            }

            let handler_for_run = handler.clone();
            let result = scanner_arc
                .run(Arc::new(move |entries: Vec<FileEntry>| {
                    let h = handler_for_run.clone();
                    h.handle_batch(&entries)
                }))
                .map_err(|e| e.to_string())?;
            handler.handle_complete(&result)?;
            Ok(result)
        });

    let scan_uc = state.scan_uc.clone();

    let result = tokio::task::spawn_blocking(move || scan_uc.execute(&config, scan_fn, &cancel))
        .await
        .map_err(|e| format!("Scan task failed: {e}"))?
        .map_err(|e| e.to_string())?;

    *state.current_cancel.lock().map_err(|e| e.to_string())? = None;
    Ok(result)
}

#[tauri::command]
pub async fn cancel_scan(state: tauri::State<'_, AppState>) -> Result<(), String> {
    if let Some(cancel) = state
        .current_cancel
        .lock()
        .map_err(|e| e.to_string())?
        .as_ref()
    {
        cancel.store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[tauri::command]
pub async fn get_scan_status(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let is_cancelling = state
        .current_cancel
        .lock()
        .map_err(|e| e.to_string())?
        .is_some();
    if is_cancelling {
        Ok("scanning".into())
    } else {
        Ok("idle".into())
    }
}
