use std::sync::Arc;
use std::sync::Mutex;

/// Integration test: scan real directory tree and verify counts
#[test]
fn test_scanner_integration_real_directory() {
    let dir = tempfile::tempdir().unwrap();

    // Build a realistic tree: 10 dirs, 100 files
    for i in 0..10 {
        let sub = dir.path().join(format!("dir_{}", i));
        std::fs::create_dir_all(&sub).unwrap();
        for j in 0..10 {
            let content = format!("content_{}_{}", i, j);
            std::fs::write(sub.join(format!("file_{}.txt", j)), &content).unwrap();
        }
    }

    // Add some hidden files
    std::fs::write(dir.path().join(".hidden_file"), b"secret").unwrap();
    let hidden_dir = dir.path().join(".hidden_dir");
    std::fs::create_dir_all(&hidden_dir).unwrap();
    std::fs::write(hidden_dir.join("inner.txt"), b"inner").unwrap();

    let root = dir.path().to_string_lossy().to_string();
    let config = petabyte_scanner::ScannerConfig {
        exclude_hidden: true,
        ..petabyte_scanner::ScannerConfig::new(&root)
    };
    let scanner = petabyte_scanner::Scanner::new(config).unwrap();

    let entries = Arc::new(Mutex::new(Vec::new()));
    let e = entries.clone();
    let handler = Arc::new(move |batch: Vec<_>| {
        let mut entries = e.lock().unwrap();
        entries.extend(batch);
        Ok(())
    });

    let result = scanner.run(handler).unwrap();
    let all_entries = entries.lock().unwrap();

    // 11 dirs (root + 10 subdirs) + 100 files = 111 entries (hidden excluded)
    assert_eq!(
        all_entries.len(),
        111,
        "Should have 111 entries (11 dirs + 100 files)"
    );
    assert_eq!(result.total_files, 100, "Should have 100 files");
    assert_eq!(result.total_dirs, 11, "Should have 11 dirs (root + 10 subdirs)");
    assert_eq!(result.total_errors, 0, "Should have 0 errors");
    assert!(
        result.elapsed_ms > 0,
        "Elapsed time should be positive"
    );
}

/// Integration test: verify deep nesting
#[test]
fn test_scanner_deep_nesting() {
    let dir = tempfile::tempdir().unwrap();

    // Create deeply nested structure: 20 levels deep
    let mut current = dir.path().to_path_buf();
    for i in 0..20 {
        current = current.join(format!("level_{}", i));
        std::fs::create_dir_all(&current).unwrap();
        std::fs::write(current.join("file.txt"), format!("level_{}", i)).unwrap();
    }

    let root = dir.path().to_string_lossy().to_string();
    let config = petabyte_scanner::ScannerConfig::new(&root);
    let scanner = petabyte_scanner::Scanner::new(config).unwrap();

    let entries = Arc::new(Mutex::new(Vec::new()));
    let e = entries.clone();
    let handler = Arc::new(move |batch: Vec<_>| {
        let mut entries = e.lock().unwrap();
        entries.extend(batch);
        Ok(())
    });

    let result = scanner.run(handler).unwrap();

    // 21 dirs (root + 20 level dirs) + 20 files = 41 entries
    assert_eq!(
        result.total_files, 20,
        "Should find 20 files (1 per level)"
    );
    assert_eq!(result.total_dirs, 21, "Should find 21 directories (root + 20 levels)");
    assert_eq!(entries.lock().unwrap().len(), 41);
}

/// Integration test: empty directory
#[test]
fn test_scanner_empty_directory() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().to_string_lossy().to_string();
    let config = petabyte_scanner::ScannerConfig::new(&root);
    let scanner = petabyte_scanner::Scanner::new(config).unwrap();

    let entries = Arc::new(Mutex::new(Vec::new()));
    let e = entries.clone();
    let handler = Arc::new(move |batch: Vec<_>| {
        let mut entries = e.lock().unwrap();
        entries.extend(batch);
        Ok(())
    });

    let result = scanner.run(handler).unwrap();

    assert_eq!(result.total_files, 0, "Empty dir should have 0 files");
    assert_eq!(result.total_dirs, 1, "Empty dir should have 1 dir (root counted)");
}

/// Integration test: batch boundary flushing
#[test]
fn test_scanner_batch_flushing() {
    let dir = tempfile::tempdir().unwrap();

    // Create enough files to trigger multiple batches (batch_size = 10)
    for i in 0..25 {
        std::fs::write(dir.path().join(format!("file_{}.txt", i)), format!("content_{}", i)).unwrap();
    }

    let root = dir.path().to_string_lossy().to_string();
    let config = petabyte_scanner::ScannerConfig {
        batch_size: 10,
        ..petabyte_scanner::ScannerConfig::new(&root)
    };
    let scanner = petabyte_scanner::Scanner::new(config).unwrap();

    let batch_count = Arc::new(Mutex::new(0u32));
    let bc = batch_count.clone();
    let handler = Arc::new(move |batch: Vec<_>| {
        let mut count = bc.lock().unwrap();
        *count += 1;
        assert!(batch.len() <= 10, "Batch should not exceed batch_size");
        Ok(())
    });

    let result = scanner.run(handler).unwrap();
    let count = batch_count.lock().unwrap();

    assert_eq!(result.total_files, 25, "Should find 25 files");
    assert!(*count >= 3, "Should have at least 3 batches (2 full + 1 partial)");
}

/// Integration test: large file exclusion
#[test]
fn test_scanner_max_file_size() {
    let dir = tempfile::tempdir().unwrap();

    std::fs::write(dir.path().join("small.txt"), b"small").unwrap();
    std::fs::write(dir.path().join("large.txt"), vec![0u8; 1000]).unwrap();

    let root = dir.path().to_string_lossy().to_string();
    let config = petabyte_scanner::ScannerConfig {
        max_file_size: Some(500),
        ..petabyte_scanner::ScannerConfig::new(&root)
    };
    let scanner = petabyte_scanner::Scanner::new(config).unwrap();

    let entries = Arc::new(Mutex::new(Vec::new()));
    let e = entries.clone();
    let handler = Arc::new(move |batch: Vec<_>| {
        let mut entries = e.lock().unwrap();
        entries.extend(batch);
        Ok(())
    });

    let result = scanner.run(handler).unwrap();
    assert_eq!(result.total_files, 1, "Only small.txt should be included");
}
