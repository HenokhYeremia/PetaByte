use std::sync::atomic::AtomicBool;

use petabyte_core_engine::dto::DuplicateResultDto;
use petabyte_shared_models::entities::FileEntry;

use crate::state::AppState;

#[tauri::command]
pub async fn find_duplicates(
    state: tauri::State<'_, AppState>,
    files: Option<Vec<FileEntry>>,
) -> Result<DuplicateResultDto, String> {
    let cancel = AtomicBool::new(false);
    let empty = vec![];
    let ref_files = files.as_deref().unwrap_or(&empty);

    let result = state
        .duplicate_uc
        .execute(ref_files, &cancel)
        .map_err(|e| e.to_string())?;
    Ok(result)
}
