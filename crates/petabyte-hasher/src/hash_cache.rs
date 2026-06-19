use parking_lot::RwLock;
use petabyte_shared_models::value_objects::{FileHash, PartialHash};
use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone)]
struct CacheEntry {
    partial: Option<String>,
    full: Option<String>,
}

#[derive(Debug, Default)]
pub struct HashCacheStats {
    pub entries: usize,
    pub partial_hits: u64,
    pub partial_misses: u64,
    pub full_hits: u64,
    pub full_misses: u64,
}

pub struct HashCache {
    inner: RwLock<HashMap<(u64, String), CacheEntry>>,
    partial_hits: parking_lot::Mutex<u64>,
    partial_misses: parking_lot::Mutex<u64>,
    full_hits: parking_lot::Mutex<u64>,
    full_misses: parking_lot::Mutex<u64>,
}

impl HashCache {
    pub fn new() -> Self {
        Self {
            inner: RwLock::new(HashMap::new()),
            partial_hits: parking_lot::Mutex::new(0),
            partial_misses: parking_lot::Mutex::new(0),
            full_hits: parking_lot::Mutex::new(0),
            full_misses: parking_lot::Mutex::new(0),
        }
    }

    fn key(file_size: u64, path: &Path) -> (u64, String) {
        let normalized = path.to_string_lossy().replace('\\', "/");
        (file_size, normalized)
    }

    pub fn get_partial(&self, file_size: u64, path: &Path) -> Option<PartialHash> {
        let key = Self::key(file_size, path);
        let cloned = {
            let inner = self.inner.read();
            inner.get(&key).and_then(|e| e.partial.clone())
        };
        match cloned {
            Some(h) => {
                *self.partial_hits.lock() += 1;
                Some(PartialHash::new(h))
            }
            None => {
                *self.partial_misses.lock() += 1;
                None
            }
        }
    }

    pub fn get_full(&self, file_size: u64, path: &Path) -> Option<FileHash> {
        let key = Self::key(file_size, path);
        let cloned = {
            let inner = self.inner.read();
            inner.get(&key).and_then(|e| e.full.clone())
        };
        match cloned {
            Some(h) => {
                *self.full_hits.lock() += 1;
                Some(FileHash::new(h))
            }
            None => {
                *self.full_misses.lock() += 1;
                None
            }
        }
    }

    pub fn set_partial(&self, file_size: u64, path: &Path, hash: &PartialHash) {
        let key = Self::key(file_size, path);
        let mut inner = self.inner.write();
        inner
            .entry(key)
            .and_modify(|e| e.partial = Some(hash.as_str().to_string()))
            .or_insert_with(|| CacheEntry {
                partial: Some(hash.as_str().to_string()),
                full: None,
            });
    }

    pub fn set_full(&self, file_size: u64, path: &Path, hash: &FileHash) {
        let key = Self::key(file_size, path);
        let mut inner = self.inner.write();
        inner
            .entry(key)
            .and_modify(|e| e.full = Some(hash.as_str().to_string()))
            .or_insert_with(|| CacheEntry {
                partial: None,
                full: Some(hash.as_str().to_string()),
            });
    }

    pub fn clear(&self) {
        self.inner.write().clear();
        *self.partial_hits.lock() = 0;
        *self.partial_misses.lock() = 0;
        *self.full_hits.lock() = 0;
        *self.full_misses.lock() = 0;
    }

    pub fn len(&self) -> usize {
        self.inner.read().len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    pub fn stats(&self) -> HashCacheStats {
        HashCacheStats {
            entries: self.inner.read().len(),
            partial_hits: *self.partial_hits.lock(),
            partial_misses: *self.partial_misses.lock(),
            full_hits: *self.full_hits.lock(),
            full_misses: *self.full_misses.lock(),
        }
    }
}

impl Default for HashCache {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn test_path(name: &str) -> PathBuf {
        PathBuf::from(format!("C:\\test\\{}", name))
    }

    #[test]
    fn test_empty_cache() {
        let cache = HashCache::new();
        assert!(cache.is_empty());
        assert_eq!(cache.len(), 0);
        let p = test_path("foo.txt");
        assert!(cache.get_partial(100, &p).is_none());
        assert!(cache.get_full(100, &p).is_none());
    }

    #[test]
    fn test_set_and_get_partial() {
        let cache = HashCache::new();
        let p = test_path("foo.txt");
        let hash = PartialHash::new("abcd1234");
        cache.set_partial(100, &p, &hash);
        assert_eq!(cache.len(), 1);
        let got = cache.get_partial(100, &p);
        assert_eq!(got, Some(hash));
    }

    #[test]
    fn test_set_and_get_full() {
        let cache = HashCache::new();
        let p = test_path("foo.txt");
        let hash = FileHash::new("abcdef1234567890");
        cache.set_full(100, &p, &hash);
        assert_eq!(cache.len(), 1);
        let got = cache.get_full(100, &p);
        assert_eq!(got, Some(hash));
    }

    #[test]
    fn test_size_matters_in_key() {
        let cache = HashCache::new();
        let p = test_path("foo.txt");
        cache.set_partial(100, &p, &PartialHash::new("hash1"));
        cache.set_partial(200, &p, &PartialHash::new("hash2"));
        assert_eq!(cache.len(), 2);
        assert_eq!(
            cache.get_partial(100, &p),
            Some(PartialHash::new("hash1"))
        );
        assert_eq!(
            cache.get_partial(200, &p),
            Some(PartialHash::new("hash2"))
        );
    }

    #[test]
    fn test_path_normalization() {
        let cache = HashCache::new();
        let p1 = PathBuf::from("C:\\test\\foo.txt");
        let p2 = PathBuf::from("C:/test/foo.txt");
        let hash = PartialHash::new("samehash");
        cache.set_partial(100, &p1, &hash);
        assert_eq!(cache.get_partial(100, &p2), Some(hash));
    }

    #[test]
    fn test_clear() {
        let cache = HashCache::new();
        let p = test_path("foo.txt");
        cache.set_partial(100, &p, &PartialHash::new("hash"));
        assert!(!cache.is_empty());
        cache.clear();
        assert!(cache.is_empty());
        assert!(cache.get_partial(100, &p).is_none());
    }

    #[test]
    fn test_stats() {
        let cache = HashCache::new();
        let p = test_path("foo.txt");

        // 2 misses
        let _ = cache.get_partial(100, &p);
        let _ = cache.get_full(100, &p);

        // 1 partial hit, 1 full hit
        cache.set_partial(100, &p, &PartialHash::new("p"));
        cache.set_full(100, &p, &FileHash::new("f"));
        let _ = cache.get_partial(100, &p);
        let _ = cache.get_full(100, &p);

        let stats = cache.stats();
        assert_eq!(stats.entries, 1);
        assert_eq!(stats.partial_hits, 1);
        assert_eq!(stats.partial_misses, 1);
        assert_eq!(stats.full_hits, 1);
        assert_eq!(stats.full_misses, 1);
    }

    #[test]
    fn test_update_existing_entry() {
        let cache = HashCache::new();
        let p = test_path("foo.txt");
        cache.set_partial(100, &p, &PartialHash::new("old"));
        cache.set_partial(100, &p, &PartialHash::new("new"));
        assert_eq!(cache.len(), 1);
        assert_eq!(
            cache.get_partial(100, &p),
            Some(PartialHash::new("new"))
        );
    }
}
