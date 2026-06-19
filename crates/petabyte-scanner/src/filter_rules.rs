#[derive(Debug, Clone)]
enum ExcludeRule {
    EndsWith(String),
    Extension(String),
    Prefix(String),
    Contains(String),
}

#[derive(Debug, Clone)]
pub struct FilterRules {
    rules: Vec<ExcludeRule>,
    exclude_hidden: bool,
    max_depth: Option<u32>,
    max_file_size: Option<u64>,
    min_file_size: Option<u64>,
}

impl FilterRules {
    pub fn new(config: &super::ScannerConfig) -> Self {
        let mut rules: Vec<ExcludeRule> = Vec::new();
        for pattern in &config.exclude_patterns {
            if let Some(dir) = pattern.strip_prefix("**/") {
                let slash_dir = format!("/{}", dir);
                let bs_dir = format!("\\{}", dir);
                rules.push(ExcludeRule::EndsWith(slash_dir.clone()));
                rules.push(ExcludeRule::EndsWith(bs_dir.clone()));
                rules.push(ExcludeRule::Contains(slash_dir));
                rules.push(ExcludeRule::Contains(bs_dir));
            } else if let Some(dir) = pattern.strip_suffix('/') {
                if dir.contains("**") {
                    let base = dir.trim_start_matches("**/");
                    let slash_dir = format!("/{}", base);
                    let bs_dir = format!("\\{}", base);
                    rules.push(ExcludeRule::EndsWith(slash_dir.clone()));
                    rules.push(ExcludeRule::EndsWith(bs_dir.clone()));
                    rules.push(ExcludeRule::Contains(slash_dir));
                    rules.push(ExcludeRule::Contains(bs_dir));
                } else {
                    rules.push(ExcludeRule::Prefix(dir.to_string()));
                }
            } else if pattern.starts_with("*.") {
                if let Some(ext) = pattern.strip_prefix("*.") {
                    rules.push(ExcludeRule::Extension(ext.to_string()));
                } else {
                    rules.push(ExcludeRule::Contains(pattern.clone()));
                }
            } else if pattern.starts_with('/') {
                rules.push(ExcludeRule::Prefix(pattern.trim_start_matches('/').to_string()));
            } else {
                rules.push(ExcludeRule::Contains(pattern.clone()));
            }
        }
        Self {
            rules,
            exclude_hidden: config.exclude_hidden,
            max_depth: config.max_depth,
            max_file_size: config.max_file_size,
            min_file_size: config.min_file_size,
        }
    }

    pub fn should_include(&self, path: &str, is_dir: bool, file_size: u64, depth: u32) -> bool {
        if let Some(max_depth) = self.max_depth {
            if depth > max_depth {
                return false;
            }
        }

        if self.exclude_hidden {
            let path_lower = path.to_lowercase();
            if path_lower.contains("/.") || path_lower.contains("\\.\\.") {
                let file_name = path.rsplit(|c| c == '/' || c == '\\').next().unwrap_or("");
                if file_name.starts_with('.') && file_name != "." && file_name != ".." {
                    return false;
                }
            }
        }

        for rule in &self.rules {
            let matched = match rule {
                ExcludeRule::EndsWith(suffix) => {
                    let lower = path.to_lowercase();
                    lower.ends_with(&suffix.to_lowercase())
                        || lower.ends_with(&format!("{}/", suffix.to_lowercase()))
                        || lower.ends_with(&format!("{}\\", suffix.to_lowercase()))
                }
                ExcludeRule::Extension(ext) => {
                    let lower = path.to_lowercase();
                    lower.ends_with(&format!(".{}", ext.to_lowercase()))
                }
                ExcludeRule::Prefix(prefix) => {
                    let lower = path.to_lowercase();
                    lower.starts_with(&prefix.to_lowercase())
                }
                ExcludeRule::Contains(sub) => {
                    let lower = path.to_lowercase();
                    lower.contains(&sub.to_lowercase())
                }
            };
            if matched {
                return false;
            }
        }

        if !is_dir {
            if let Some(max_size) = self.max_file_size {
                if file_size > max_size {
                    return false;
                }
            }
            if let Some(min_size) = self.min_file_size {
                if file_size < min_size {
                    return false;
                }
            }
        }

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ScannerConfig;

    #[test]
    fn test_filter_hidden_files() {
        let config = ScannerConfig {
            exclude_hidden: true,
            ..ScannerConfig::new("/test")
        };
        let filter = FilterRules::new(&config);
        assert!(!filter.should_include("/test/.hidden", false, 100, 1));
        assert!(!filter.should_include("/test/dir/.hidden", false, 100, 2));
        assert!(filter.should_include("/test/normal", false, 100, 1));
    }

    #[test]
    fn test_filter_node_modules() {
        let config = ScannerConfig {
            exclude_patterns: vec!["**/node_modules".into()],
            ..ScannerConfig::new("/test")
        };
        let filter = FilterRules::new(&config);
        assert!(!filter.should_include("/test/project/node_modules/some/file.js", false, 100, 5));
        assert!(!filter.should_include("/test/project/node_modules", true, 0, 2));
        assert!(filter.should_include("/test/project/src/main.ts", false, 100, 4));
    }

    #[test]
    fn test_filter_extension() {
        let config = ScannerConfig {
            exclude_patterns: vec!["*.pyc".into(), "*.class".into()],
            ..ScannerConfig::new("/test")
        };
        let filter = FilterRules::new(&config);
        assert!(!filter.should_include("/test/foo.pyc", false, 100, 2));
        assert!(!filter.should_include("/test/bar.class", false, 100, 2));
        assert!(filter.should_include("/test/foo.py", false, 100, 2));
    }

    #[test]
    fn test_filter_target_dir() {
        let config = ScannerConfig {
            exclude_patterns: vec!["**/target/".into()],
            ..ScannerConfig::new("/test")
        };
        let filter = FilterRules::new(&config);
        assert!(!filter.should_include("/test/project/target/debug/build", false, 100, 5));
        assert!(filter.should_include("/test/project/src/main.rs", false, 100, 4));
    }

    #[test]
    fn test_max_depth() {
        let config = ScannerConfig {
            max_depth: Some(2),
            ..ScannerConfig::new("/test")
        };
        let filter = FilterRules::new(&config);
        assert!(filter.should_include("/test/level1", false, 100, 1));
        assert!(filter.should_include("/test/level1/level2", false, 100, 2));
        assert!(!filter.should_include("/test/level1/level2/level3", false, 100, 3));
    }

    #[test]
    fn test_file_size_limits() {
        let config = ScannerConfig {
            max_file_size: Some(1000),
            min_file_size: Some(10),
            ..ScannerConfig::new("/test")
        };
        let filter = FilterRules::new(&config);
        assert!(filter.should_include("/test/file.txt", false, 100, 1));
        assert!(!filter.should_include("/test/too_small.txt", false, 5, 1));
        assert!(!filter.should_include("/test/too_big.txt", false, 2000, 1));
        assert!(filter.should_include("/test/dir", true, 0, 1));
    }
}
