use std::collections::HashMap;

use parking_lot::RwLock;

pub struct HashCache {
    cache: RwLock<HashMap<(u64, String), CachedHash>>,
    hits: RwLock<u64>,
    misses: RwLock<u64>,
}

struct CachedHash {
    full_hash: String,
    file_count: u64,
}

impl Default for HashCache {
    fn default() -> Self {
        Self::new()
    }
}

impl HashCache {
    #[must_use]
    pub fn new() -> Self {
        Self {
            cache: RwLock::new(HashMap::new()),
            hits: RwLock::new(0),
            misses: RwLock::new(0),
        }
    }

    pub fn lookup(&self, size: u64, partial_hash: &str) -> Option<String> {
        let cache = self.cache.read();
        if let Some(entry) = cache.get(&(size, partial_hash.to_string())) {
            *self.hits.write() += 1;
            Some(entry.full_hash.clone())
        } else {
            *self.misses.write() += 1;
            None
        }
    }

    pub fn insert(&self, size: u64, partial_hash: &str, full_hash: &str) {
        let mut cache = self.cache.write();
        cache.insert(
            (size, partial_hash.to_string()),
            CachedHash {
                full_hash: full_hash.to_string(),
                file_count: 1,
            },
        );
    }

    pub fn increment_count(&self, size: u64, partial_hash: &str) {
        let mut cache = self.cache.write();
        if let Some(entry) = cache.get_mut(&(size, partial_hash.to_string())) {
            entry.file_count += 1;
        }
    }

    pub fn contains_partial(&self, size: u64, partial_hash: &str) -> bool {
        let cache = self.cache.read();
        cache.contains_key(&(size, partial_hash.to_string()))
    }

    pub fn stats(&self) -> (u64, u64) {
        (*self.hits.read(), *self.misses.read())
    }

    pub fn clear(&self) {
        let mut cache = self.cache.write();
        cache.clear();
        *self.hits.write() = 0;
        *self.misses.write() = 0;
    }

    pub fn len(&self) -> usize {
        self.cache.read().len()
    }

    pub fn is_empty(&self) -> bool {
        self.cache.read().is_empty()
    }

    pub fn preload(&self, entries: Vec<(u64, String, String)>) {
        let mut cache = self.cache.write();
        for (size, partial, full_hash) in entries {
            cache.insert(
                (size, partial),
                CachedHash {
                    full_hash,
                    file_count: 1,
                },
            );
        }
    }

    pub fn entries(&self) -> Vec<(u64, String, String)> {
        self.cache
            .read()
            .iter()
            .map(|((size, partial), entry)| (*size, partial.clone(), entry.full_hash.clone()))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_cache() {
        let cache = HashCache::new();
        assert!(cache.is_empty());
        assert_eq!(cache.lookup(100, "abc"), None);
    }

    #[test]
    fn test_insert_and_lookup() {
        let cache = HashCache::new();
        cache.insert(100, "partial123", "full123");
        assert_eq!(cache.lookup(100, "partial123"), Some("full123".into()));
        assert_eq!(cache.lookup(200, "partial123"), None);
    }

    #[test]
    fn test_contains_partial() {
        let cache = HashCache::new();
        cache.insert(100, "abc", "def");
        assert!(cache.contains_partial(100, "abc"));
        assert!(!cache.contains_partial(100, "xyz"));
        assert!(!cache.contains_partial(200, "abc"));
    }

    #[test]
    fn test_clear() {
        let cache = HashCache::new();
        cache.insert(100, "abc", "def");
        assert_eq!(cache.len(), 1);
        cache.clear();
        assert_eq!(cache.len(), 0);
    }

    #[test]
    fn test_increment_count() {
        let cache = HashCache::new();
        cache.insert(100, "abc", "def");
        cache.increment_count(100, "abc");
    }

    #[test]
    fn test_preload() {
        let cache = HashCache::new();
        cache.preload(vec![
            (100, "p1".into(), "f1".into()),
            (200, "p2".into(), "f2".into()),
        ]);
        assert_eq!(cache.len(), 2);
        assert_eq!(cache.lookup(100, "p1"), Some("f1".into()));
        assert_eq!(cache.lookup(200, "p2"), Some("f2".into()));
    }

    #[test]
    fn test_entries_roundtrip() {
        let cache = HashCache::new();
        cache.insert(100, "p1", "f1");
        cache.insert(200, "p2", "f2");
        let entries = cache.entries();
        assert_eq!(entries.len(), 2);
        assert!(entries.contains(&(100, "p1".into(), "f1".into())));
        assert!(entries.contains(&(200, "p2".into(), "f2".into())));
    }

    #[test]
    fn test_stats() {
        let cache = HashCache::new();
        cache.lookup(100, "abc");
        cache.lookup(100, "abc");
        cache.insert(100, "xyz", "full");
        cache.lookup(100, "xyz");
        let (hits, misses) = cache.stats();
        assert!(hits <= 1);
        assert!(misses <= 2);
    }
}
