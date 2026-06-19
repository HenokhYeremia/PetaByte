use std::sync::Arc;
use std::sync::Mutex;

fn main() {
    // Simple benchmark: measure scan time for a known directory tree
    let dir = tempfile::tempdir().unwrap();

    // Create 1000 files across 10 directories
    for i in 0..10 {
        let sub = dir.path().join(format!("dir_{}", i));
        std::fs::create_dir_all(&sub).unwrap();
        for j in 0..100 {
            let content = format!("content_{}_{} {}", i, j, "x".repeat(100));
            std::fs::write(sub.join(format!("file_{}.txt", j)), &content).unwrap();
        }
    }

    let root = dir.path().to_string_lossy().to_string();
    let config = petabyte_scanner::ScannerConfig {
        batch_size: 500,
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

    let start = std::time::Instant::now();
    let result = scanner.run(handler).unwrap();
    let elapsed = start.elapsed();

    let total = entries.lock().unwrap().len();

    println!("=== Scanner Benchmark ===");
    println!("Files:     {}", result.total_files);
    println!("Dirs:      {}", result.total_dirs);
    println!("Total entries: {}", total);
    println!("Elapsed:   {:?}", elapsed);
    println!("Rate:      {:.0} files/sec", result.total_files as f64 / elapsed.as_secs_f64());
    println!("Total size: {} bytes ({} MB)", result.total_size, result.total_size / 1_000_000);

    // Assert reasonable performance
    assert!(result.total_files == 1000, "Should find 1000 files");
    assert!(result.total_dirs == 10, "Should find 10 directories");
}
