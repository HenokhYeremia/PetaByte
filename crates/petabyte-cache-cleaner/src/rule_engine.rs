use crate::error::{CleanerError, CleanerResult};
use crate::rules::builtin::{builtin_rules, CacheRule};
use petabyte_shared_models::entities::CacheCategory;
use std::path::Path;

pub struct RuleEngine {
    rules: Vec<CacheRule>,
}

impl RuleEngine {
    #[must_use]
    pub fn new() -> Self {
        Self {
            rules: builtin_rules(),
        }
    }

    #[must_use]
    pub fn with_rules(rules: Vec<CacheRule>) -> Self {
        Self { rules }
    }

    #[must_use]
    pub fn rules(&self) -> &[CacheRule] {
        &self.rules
    }

    pub fn add_rule(&mut self, rule: CacheRule) {
        self.rules.push(rule);
    }

    pub fn load_yaml(&mut self, path: &Path) -> CleanerResult<()> {
        let content = std::fs::read_to_string(path).map_err(|e| {
            CleanerError::RuleParse(format!("Failed to read {}: {}", path.display(), e))
        })?;
        let custom_rules: Vec<CacheRule> = serde_yaml::from_str(&content)
            .map_err(|e| CleanerError::RuleParse(format!("YAML parse error: {e}")))?;
        self.rules.extend(custom_rules);
        Ok(())
    }

    #[must_use]
    pub fn enabled_rules(&self) -> Vec<&CacheRule> {
        self.rules.iter().filter(|r| r.default_enabled).collect()
    }

    #[must_use]
    pub fn rules_for_category(&self, category: &CacheCategory) -> Vec<&CacheRule> {
        self.rules
            .iter()
            .filter(|r| r.category == *category)
            .collect()
    }

    #[must_use]
    pub fn match_path(&self, path: &Path) -> Vec<&CacheRule> {
        let path_str = path.to_string_lossy().replace('\\', "/");
        self.rules
            .iter()
            .filter(|rule| {
                rule.paths.iter().any(|pattern| {
                    let normalized = pattern.replace('\\', "/");
                    if normalized.contains('*') {
                        glob_match(&normalized, &path_str)
                    } else {
                        let expanded = shellexpand::tilde(&normalized);
                        path_str.contains(expanded.as_ref())
                    }
                })
            })
            .collect()
    }
}

impl Default for RuleEngine {
    fn default() -> Self {
        Self::new()
    }
}

fn glob_match(pattern: &str, path: &str) -> bool {
    if let Ok(regex) = glob_to_regex(pattern) {
        regex.is_match(path)
    } else {
        false
    }
}

fn glob_to_regex(pattern: &str) -> Result<regex::Regex, regex::Error> {
    let mut re_str = String::with_capacity(pattern.len() + 8);
    re_str.push('^');
    let chars: Vec<char> = pattern.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        match chars[i] {
            '*' if i + 1 < chars.len() && chars[i + 1] == '*' => {
                // ** matches any depth, possibly none
                re_str.push_str("(.*/)?");
                i += 2;
                if i < chars.len() && chars[i] == '/' {
                    i += 1;
                }
                continue;
            }
            '*' => re_str.push_str("[^/]*"),
            '?' => re_str.push('.'),
            '.' => re_str.push_str("\\."),
            '\\' => re_str.push_str("\\\\"),
            '/' => re_str.push('/'),
            other => re_str.push(other),
        }
        i += 1;
    }
    re_str.push('$');
    regex::Regex::new(&re_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_has_builtin_rules() {
        let engine = RuleEngine::new();
        assert!(!engine.rules().is_empty());
    }

    #[test]
    fn test_enabled_rules() {
        let engine = RuleEngine::new();
        let enabled = engine.enabled_rules();
        assert!(enabled.iter().any(|r| r.name == "npm_cache"));
    }

    #[test]
    fn test_rules_for_category() {
        let engine = RuleEngine::new();
        let npm_rules = engine.rules_for_category(&CacheCategory::Npm);
        assert_eq!(npm_rules.len(), 1);
        assert_eq!(npm_rules[0].name, "npm_cache");
    }

    #[test]
    fn test_glob_to_regex() {
        let re = glob_to_regex("**/node_modules").unwrap();
        assert!(
            re.is_match("/home/user/project/node_modules"),
            "failed to match /home/user/project/node_modules with pattern {}",
            re.as_str()
        );
        assert!(
            re.is_match("node_modules"),
            "failed to match node_modules with pattern {}",
            re.as_str()
        );
        assert!(!re.is_match("/home/user/project/other"));
    }

    #[test]
    fn test_glob_match() {
        assert!(glob_match(
            "**/node_modules",
            "/home/user/project/node_modules"
        ));
        assert!(!glob_match("**/node_modules", "/home/user/project/src"));
    }

    #[test]
    fn test_add_custom_rule() {
        let mut engine = RuleEngine::new();
        let rule = CacheRule {
            name: "custom".into(),
            category: CacheCategory::Other("Custom".into()),
            paths: vec!["/custom/path".into()],
            description: "Custom rule".into(),
            default_enabled: true,
        };
        engine.add_rule(rule);
        assert_eq!(engine.rules().len(), builtin_rules().len() + 1);
    }
}
