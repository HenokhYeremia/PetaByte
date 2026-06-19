use tauri::Emitter;
use petabyte_shared_models::ports::{ProgressEmitter, ProgressPayload};

#[derive(Clone)]
pub struct AppProgressEmitter {
    app_handle: tauri::AppHandle,
}

impl AppProgressEmitter {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self { app_handle }
    }
}

impl ProgressEmitter for AppProgressEmitter {
    fn on_progress(&self, payload: &ProgressPayload) {
        let _ = self.app_handle.emit("scan:progress", payload);
    }

    fn on_error(&self, message: &str) {
        let _ = self.app_handle.emit("scan:error", message);
    }
}
