use criterion::{black_box, criterion_group, criterion_main, Criterion};
use petabyte_duplicate_detector::{Detector, DuplicateDetectionConfig};
use petabyte_shared_models::entities::FileEntry;
use petabyte_shared_models::value_objects::FilePath;
use std::io::Write;
use std::sync::atomic::AtomicBool;

fn make_entry(path: &str, size: u64) -> FileEntry {
    FileEntry::new(
        FilePath::new(path).unwrap(),
        None,
        path.rsplit('/').next().unwrap_or(path).into(),
        path.rsplit('.').next().map(|e| e.to_string()),
        size,
        false,
        false,
        0o644,
        1_700_000_000,
        1,
    )
}

fn create_temp_files(
    count: usize,
    content: &[u8],
    dir: &tempfile::TempDir,
    prefix: &str,
) -> Vec<String> {
    let mut paths = Vec::with_capacity(count);
    for i in 0..count {
        let path = dir.path().join(format!("{}_{}.dat", prefix, i));
        let mut f = std::fs::File::create(&path).unwrap();
        f.write_all(content).unwrap();
        paths.push(path.to_string_lossy().to_string());
    }
    paths
}

fn bench_no_duplicates(c: &mut Criterion) {
    let config = DuplicateDetectionConfig::default();
    let detector = Detector::new(config);
    let cancel = AtomicBool::new(false);

    let dir = tempfile::TempDir::new().unwrap();
    let mut files = Vec::new();
    for i in 0..100 {
        let content = format!("unique content file number {}", i);
        let path = dir.path().join(format!("file_{}.dat", i));
        std::fs::write(&path, &content).unwrap();
        files.push(make_entry(&path.to_string_lossy(), content.len() as u64));
    }

    c.bench_function("no_duplicates_100", |b| {
        b.iter(|| {
            black_box(
                detector
                    .detect(black_box(&files), black_box(&cancel))
                    .unwrap(),
            )
        })
    });
}

fn bench_with_duplicates(c: &mut Criterion) {
    let config = DuplicateDetectionConfig::default();
    let detector = Detector::new(config);
    let cancel = AtomicBool::new(false);

    let dir = tempfile::TempDir::new().unwrap();

    let content_a = b"AAAA this is duplicate content group A with enough data for hashing";
    let content_b = b"BBBB this is duplicate content group B with enough data for hashing";

    let paths_a = create_temp_files(5, content_a, &dir, "a");
    let paths_b = create_temp_files(5, content_b, &dir, "b");

    let mut files: Vec<FileEntry> = paths_a
        .into_iter()
        .map(|p| make_entry(&p, content_a.len() as u64))
        .collect();
    files.extend(
        paths_b
            .into_iter()
            .map(|p| make_entry(&p, content_b.len() as u64)),
    );

    c.bench_function("duplicates_10_files_2_groups", |b| {
        b.iter(|| {
            black_box(
                detector
                    .detect(black_box(&files), black_box(&cancel))
                    .unwrap(),
            )
        })
    });
}

fn bench_large_group(c: &mut Criterion) {
    let config = DuplicateDetectionConfig::default();
    let detector = Detector::new(config);
    let cancel = AtomicBool::new(false);

    let dir = tempfile::TempDir::new().unwrap();
    let content = b"Same content for all files in this large group benchmark";
    let paths = create_temp_files(20, content, &dir, "large");

    let files: Vec<FileEntry> = paths
        .into_iter()
        .map(|p| make_entry(&p, content.len() as u64))
        .collect();

    c.bench_function("duplicates_20_identical_files", |b| {
        b.iter(|| {
            black_box(
                detector
                    .detect(black_box(&files), black_box(&cancel))
                    .unwrap(),
            )
        })
    });
}

criterion_group!(
    benches,
    bench_no_duplicates,
    bench_with_duplicates,
    bench_large_group
);
criterion_main!(benches);
