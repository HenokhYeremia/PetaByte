use std::sync::atomic::{AtomicU64, Ordering};

#[derive(Debug)]
pub struct PermissionHandler {
    skipped_count: AtomicU64,
    max_skips: u64,
}

impl PermissionHandler {
    #[must_use]
    pub fn new(max_skips: u64) -> Self {
        Self {
            skipped_count: AtomicU64::new(0),
            max_skips,
        }
    }

    pub fn handle_permission_denied(&self, path: &str) -> Result<bool, super::ScannerError> {
        let skipped = self.skipped_count.fetch_add(1, Ordering::Relaxed);
        log::warn!("Permission denied: {} (skip #{})", path, skipped + 1);
        if skipped + 1 > self.max_skips {
            return Err(super::ScannerError::PermissionDenied(format!(
                "Too many permission denied errors ({}). Last: {}",
                skipped + 1,
                path
            )));
        }
        Ok(false)
    }

    pub fn skipped_count(&self) -> u64 {
        self.skipped_count.load(Ordering::Relaxed)
    }
}

impl Default for PermissionHandler {
    fn default() -> Self {
        Self::new(10_000)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_denied_skip() {
        let handler = PermissionHandler::new(10);
        let result = handler.handle_permission_denied("/test/restricted");
        assert!(result.is_ok());
        assert!(!result.unwrap());
        assert_eq!(handler.skipped_count(), 1);
    }

    #[test]
    fn test_permission_denied_limit() {
        let handler = PermissionHandler::new(3);
        assert!(handler.handle_permission_denied("/a").is_ok());
        assert!(handler.handle_permission_denied("/b").is_ok());
        assert!(handler.handle_permission_denied("/c").is_ok());
        let result = handler.handle_permission_denied("/d");
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            crate::ScannerError::PermissionDenied(_)
        ));
    }
}
