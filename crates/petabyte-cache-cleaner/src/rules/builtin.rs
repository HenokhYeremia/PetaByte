use petabyte_shared_models::entities::CacheCategory;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheRule {
    pub name: String,
    pub category: CacheCategory,
    pub paths: Vec<String>,
    pub description: String,
    pub default_enabled: bool,
}

#[must_use]
pub fn builtin_rules() -> Vec<CacheRule> {
    vec![
        CacheRule {
            name: "npm_cache".into(),
            category: CacheCategory::Npm,
            paths: vec!["~/.npm/_cacache".into(), "~/.npm/_cache".into()],
            description: "npm package cache".into(),
            default_enabled: true,
        },
        CacheRule {
            name: "pip_cache".into(),
            category: CacheCategory::Pip,
            paths: vec!["~/.cache/pip".into(), "~/AppData/Local/pip/cache".into()],
            description: "pip package cache".into(),
            default_enabled: true,
        },
        CacheRule {
            name: "cargo_cache".into(),
            category: CacheCategory::Cargo,
            paths: vec![
                "~/.cargo/registry/cache".into(),
                "~/.cargo/registry/src".into(),
            ],
            description: "Cargo registry cache".into(),
            default_enabled: false,
        },
        CacheRule {
            name: "maven_cache".into(),
            category: CacheCategory::Maven,
            paths: vec!["~/.m2/repository".into()],
            description: "Maven local repository".into(),
            default_enabled: false,
        },
        CacheRule {
            name: "gradle_cache".into(),
            category: CacheCategory::Gradle,
            paths: vec!["~/.gradle/caches".into(), "~/.gradle/wrapper".into()],
            description: "Gradle build cache".into(),
            default_enabled: false,
        },
        CacheRule {
            name: "nuget_cache".into(),
            category: CacheCategory::NuGet,
            paths: vec![
                "~/.nuget/packages".into(),
                "~/AppData/Local/NuGet/Cache".into(),
            ],
            description: "NuGet package cache".into(),
            default_enabled: false,
        },
        CacheRule {
            name: "go_cache".into(),
            category: CacheCategory::Go,
            paths: vec!["~/go/pkg/mod".into()],
            description: "Go module cache".into(),
            default_enabled: false,
        },
        CacheRule {
            name: "mix_cache".into(),
            category: CacheCategory::Mix,
            paths: vec!["~/.mix".into()],
            description: "Elixir mix dependencies".into(),
            default_enabled: false,
        },
        CacheRule {
            name: "docker_cache".into(),
            category: CacheCategory::Docker,
            paths: vec!["~/AppData/Local/Docker".into()],
            description: "Docker engine cache".into(),
            default_enabled: false,
        },
        CacheRule {
            name: "browser_cache".into(),
            category: CacheCategory::Browser,
            paths: vec![
                "~/AppData/Local/Google/Chrome/User Data/Default/Cache".into(),
                "~/AppData/Local/Microsoft/Edge/User Data/Default/Cache".into(),
                "~/AppData/Local/Mozilla/Firefox/Profiles/*/cache2".into(),
            ],
            description: "Browser cache data".into(),
            default_enabled: true,
        },
        CacheRule {
            name: "node_modules".into(),
            category: CacheCategory::Other("Node".into()),
            paths: vec!["**/node_modules".into()],
            description: "Node.js project dependencies".into(),
            default_enabled: false,
        },
        CacheRule {
            name: "temp_files".into(),
            category: CacheCategory::System,
            paths: vec!["~/AppData/Local/Temp".into(), "/tmp".into()],
            description: "System temporary files".into(),
            default_enabled: false,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builtin_rules_non_empty() {
        let rules = builtin_rules();
        assert!(!rules.is_empty());
        assert!(rules.iter().any(|r| r.name == "npm_cache"));
        assert!(rules.iter().any(|r| r.name == "pip_cache"));
    }

    #[test]
    fn test_all_rules_have_name() {
        for rule in builtin_rules() {
            assert!(!rule.name.is_empty());
            assert!(!rule.paths.is_empty());
        }
    }

    #[test]
    fn test_default_enabled_rules() {
        let enabled: Vec<_> = builtin_rules()
            .into_iter()
            .filter(|r| r.default_enabled)
            .collect();
        assert!(enabled.iter().any(|r| r.name == "npm_cache"));
        assert!(enabled.iter().any(|r| r.name == "browser_cache"));
    }
}
