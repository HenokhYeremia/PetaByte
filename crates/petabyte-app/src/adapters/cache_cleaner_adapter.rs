use petabyte_cache_cleaner::{RuleEngine, SafeRemover, SizeCalculator};
use petabyte_shared_models::entities::{CacheCleanResult, CacheEntry};
use petabyte_shared_models::ports::CacheCleanerPort;
use std::path::{Path, PathBuf};

pub struct AppCacheCleaner {
    engine: RuleEngine,
    calculator: SizeCalculator,
    remover: SafeRemover,
}

impl AppCacheCleaner {
    #[must_use]
    pub fn new(engine: RuleEngine, use_trash: bool) -> Self {
        Self {
            engine,
            calculator: SizeCalculator::new(),
            remover: SafeRemover::new().with_trash(use_trash),
        }
    }

    fn resolve_path(path_str: &str) -> PathBuf {
        let p = Path::new(path_str);
        if p.is_absolute() {
            return p.to_path_buf();
        }
        if path_str.starts_with("~/") || path_str == "~" {
            if let Some(home) = dirs_next_home() {
                let rest = if path_str.len() > 2 {
                    &path_str[2..]
                } else {
                    ""
                };
                let mut buf = home;
                if !rest.is_empty() {
                    buf.push(rest);
                }
                return buf;
            }
        }
        if path_str.contains('$') {
            let expanded = expand_env_vars(path_str);
            return PathBuf::from(expanded);
        }
        p.to_path_buf()
    }
}

fn dirs_next_home() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE")
        .or_else(|| {
            let drive = std::env::var_os("HOMEDRIVE")?;
            let path = std::env::var_os("HOMEPATH")?;
            let mut p = drive;
            p.push(path);
            Some(p)
        })
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
}

fn expand_env_vars(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '$' {
            let mut var_name = String::new();
            if chars.peek() == Some(&'{') {
                chars.next();
                while let Some(&ch) = chars.peek() {
                    if ch == '}' {
                        chars.next();
                        break;
                    }
                    var_name.push(ch);
                    chars.next();
                }
            } else {
                while let Some(&ch) = chars.peek() {
                    if ch.is_alphanumeric() || ch == '_' {
                        var_name.push(ch);
                        chars.next();
                    } else {
                        break;
                    }
                }
            }
            let val = std::env::var(&var_name).unwrap_or_default();
            result.push_str(&val);
        } else {
            result.push(c);
        }
    }
    result
}

impl CacheCleanerPort for AppCacheCleaner {
    fn scan(&self) -> Result<Vec<CacheEntry>, String> {
        let rules = self.engine.enabled_rules();
        let mut entries = Vec::new();
        for rule in rules {
            for path_str in &rule.paths {
                let resolved = Self::resolve_path(path_str);
                if resolved.exists() {
                    match self.calculator.calculate(&resolved) {
                        Ok(info) => {
                            entries.push(CacheEntry {
                                path: resolved.to_string_lossy().to_string(),
                                category: rule.category.clone(),
                                size_bytes: info.total_bytes,
                                file_count: info.file_count,
                                last_accessed: None,
                            });
                        }
                        Err(_) => continue,
                    }
                }
            }
        }
        Ok(entries)
    }

    fn calculate_total_size(&self) -> Result<u64, String> {
        let entries = self.scan()?;
        Ok(entries.iter().map(|e| e.size_bytes).sum())
    }

    fn clean(&self, entries: &[CacheEntry]) -> Result<CacheCleanResult, String> {
        let mut removed = Vec::new();
        let mut total_freed = 0u64;
        let mut errors = Vec::new();

        for entry in entries {
            let path = Path::new(&entry.path);
            match self.remover.remove(path) {
                Ok(stats) => {
                    if stats.files_removed > 0 || stats.dirs_removed > 0 {
                        removed.push(entry.path.clone());
                        total_freed += stats.bytes_freed;
                    }
                    for e in &stats.errors {
                        errors.push(e.clone());
                    }
                }
                Err(e) => {
                    errors.push(format!("Failed to remove {}: {}", entry.path, e));
                }
            }
        }

        Ok(CacheCleanResult {
            entries_removed: removed,
            total_bytes_freed: total_freed,
            errors,
        })
    }

    fn clean_all(&self) -> Result<CacheCleanResult, String> {
        let entries = self.scan()?;
        self.clean(&entries)
    }

    fn estimate(&self, entries: &[CacheEntry]) -> u64 {
        entries.iter().map(|e| e.size_bytes).sum()
    }
}
