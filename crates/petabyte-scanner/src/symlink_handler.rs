use petabyte_shared_models::value_objects::FilePath;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SymlinkPolicy {
    Follow,
    Skip,
    Flag,
}

impl SymlinkPolicy {
    pub fn from_config(follow_symlinks: bool) -> Self {
        if follow_symlinks {
            Self::Follow
        } else {
            Self::Skip
        }
    }
}

#[derive(Debug, Clone)]
pub struct SymlinkHandler {
    policy: SymlinkPolicy,
}

impl SymlinkHandler {
    pub fn new(policy: SymlinkPolicy) -> Self {
        Self { policy }
    }

    pub fn should_process(&self, path: &FilePath, is_symlink: bool, target_exists: bool) -> Result<bool, super::ScannerError> {
        if !is_symlink {
            return Ok(true);
        }
        match self.policy {
            SymlinkPolicy::Follow => {
                if !target_exists {
                    return Err(super::ScannerError::WalkError {
                        path: path.to_string(),
                        message: "Symlink target does not exist".into(),
                    });
                }
                Ok(true)
            }
            SymlinkPolicy::Skip => Ok(false),
            SymlinkPolicy::Flag => Ok(true),
        }
    }

    pub fn check_symlink_loop(&self, path: &FilePath) -> Result<(), super::ScannerError> {
        // jwalk detects cycles internally; this is an additional safety check
        // using std::fs::symlink_metadata to verify the path is accessible
        match std::fs::symlink_metadata(path.as_path()) {
            Ok(_) => Ok(()),
            Err(e) => Err(super::ScannerError::WalkError {
                path: path.to_string(),
                message: format!("Symlink metadata error: {}", e),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_symlink_policy_from_config() {
        assert_eq!(SymlinkPolicy::from_config(true), SymlinkPolicy::Follow);
        assert_eq!(SymlinkPolicy::from_config(false), SymlinkPolicy::Skip);
    }

    #[test]
    fn test_skip_symlink() {
        let handler = SymlinkHandler::new(SymlinkPolicy::Skip);
        let path = FilePath::new("/test/link").unwrap();
        assert!(!handler.should_process(&path, true, true).unwrap());
    }

    #[test]
    fn test_non_symlink_always_processed() {
        let handler = SymlinkHandler::new(SymlinkPolicy::Skip);
        let path = FilePath::new("/test/file.txt").unwrap();
        assert!(handler.should_process(&path, false, false).unwrap());
    }
}
