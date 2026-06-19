# Storage Health Score Engine — Desain Sistem

## 1. Filosofi Desain

Storage Health Score bukan sekadar metrik teknis, melainkan *abstraksi pengambilan keputusan* untuk pengguna awam maupun profesional.

### Prinsip Desain

| Prinsip | Implikasi Desain |
|---------|-----------------|
| **Actionable** | Setiap faktor punya rekomendasi yang jelas. Skor turun = ada yang harus dilakukan. |
| **Explainable** | Pengguna bisa melihat "mengapa skor saya 62?". Faktor dominan ditampilkan. |
| **Comparable** | Skor antar volume, antar waktu, dan antar pengguna (anonim) bisa dibandingkan. |
| **Stable** | Perubahan kecil (1 file) tidak menyebabkan perubahan skor besar. Moving average + rounding. |
| **Progressive** | Bobot bisa disesuaikan per pengguna (expert mode). Default optimal untuk awam. |

### Psikologi Skor

| Rentang | Persepsi | Perilaku yang Didorong |
|---------|----------|----------------------|
| 90-100  | "Storage saya sehat" | Pertahankan kebiasaan |
| 70-89   | "Ada sedikit yang perlu dibersihkan" | Tindakan ringan |
| 50-69   | "Perlu perhatian" | Investigasi + pembersihan |
| 30-49   | "Ada masalah serius" | Tindakan segera |
| 0-29    | "Storage dalam bahaya" | Tindakan darurat |

---

## 2. Faktor & Bobot

### 2.1 Definisi Faktor

Setiap faktor menghasilkan skor 0-100 yang kemudian dikalikan bobot untuk menghasilkan skor final.

#### F1: Free Space Ratio (Bobot: 30%) — Faktor Terpenting

Rumus dasar (threshold-based):

```
free_ratio = free_space / total_capacity

if free_ratio >= 0.30:  score = 100
if free_ratio >= 0.20:  score = 100 - ((0.30 - free_ratio) / 0.10) * 40   # 60-100
if free_ratio >= 0.10:  score =  60 - ((0.20 - free_ratio) / 0.10) * 40   # 20-60
if free_ratio >= 0.05:  score =  20 - ((0.10 - free_ratio) / 0.05) * 15   #  5-20
else:                   score =   5 * (free_ratio / 0.05)                  #  0-5
```

**Logika:** Ruang kosong adalah indikator paling langsung dari "sehat tidaknya" storage.
- 30%+ = ideal (penelitian menunjukkan performa SSD turun drastis di bawah 10%)
- 20-30% = warning ringan
- 10-20% = perlu perhatian
- 5-10% = kritis
- <5% = darurat (risiko kerusakan data, write amplification SSD)

**Data source:** `volumes.free_space`, `volumes.total_capacity`

#### F2: Fragmentation Score (Bobot: 15%) — Faktor Kinerja

Untuk HDD: berdasarkan fragmentasi sistem file.
Untuk SSD: berdasarkan write amplification + over-provisioning.

Karena fragmentasi sulit diukur dari user-space, kita gunakan *proxy metric*:

```
# Proxy 1: File density
file_density = total_files / (used_space / avg_file_size)
# Semakin padat (banyak file kecil), semakin mungkin fragmentasi

# Proxy 2: Directory depth variance
dir_depth_variance = std_dev(depth dari scan_entries)

# Proxy 3: File size variance
size_variance = std_dev(file_size)

frag_raw = normalize(file_density * 0.4 + dir_depth_variance * 0.3 + size_variance * 0.3)
score = 100 - (frag_raw * 100)
```

**Data source:** `scan_entries` aggregasi, `directory_summaries`

#### F3: Duplicate File Ratio (Bobot: 15%)

```
dup_ratio = duplicate_size / total_size

if dup_ratio <= 0.01: score = 100           # <1% duplikat
if dup_ratio <= 0.05: score = 90            # 1-5%
if dup_ratio <= 0.10: score = 75            # 5-10%
if dup_ratio <= 0.20: score = 55            # 10-20%
if dup_ratio <= 0.30: score = 35            # 20-30%
else:                 score = 20            # >30%
```

**Logika:** Duplikasi tinggi = ruang terbuang. Hampir selalu ada yang bisa dibersihkan.

**Data source:** `duplicate_groups.total_wasted_bytes`, `scan_sessions.total_size`

#### F4: Temporary & Cache File Ratio (Bobot: 15%)

```
temp_ratio = (developer_cache_size + temp_file_size) / total_size

if temp_ratio <= 0.01:   score = 100
if temp_ratio <= 0.03:   score = 85
if temp_ratio <= 0.05:   score = 70
if temp_ratio <= 0.10:   score = 50
if temp_ratio <= 0.20:   score = 30
else:                     score = 15
```

**Logika:** File cache/temp bisa dibersihkan tanpa efek samping. Rasio tinggi = potensi pembersihan besar.

**Data source:** `cache_entries` (yang `was_cleaned = false`), kategori temp file

#### F5: Large File Ratio (Bobot: 10%)

```
# Large file = file > 1GB (konfigurabel)
large_file_total = sum(size of files > 1GB)
large_ratio = large_file_total / total_size

if large_ratio <= 0.10:  score = 100
if large_ratio <= 0.20:  score = 85
if large_ratio <= 0.30:  score = 70
if large_ratio <= 0.40:  score = 55
if large_ratio <= 0.50:  score = 40
else:                     score = 25
```

**Logika:** File besar bukan masalah secara otomatis, tapi dominasi file besar (>50% storage) menandakan potensi inefisiensi.

**Data source:** `scan_entries` dengan filter file_size > threshold

#### F6: File Age & Unused Score (Bobot: 10%)

```
# File tidak diakses > 6 bulan (konfigurabel)
old_file_ratio = old_file_size / total_size
unused_file_ratio = unused_file_size / total_size

age_ratio = old_file_ratio * 0.6 + unused_file_ratio * 0.4

if age_ratio <= 0.05:  score = 100
if age_ratio <= 0.10:  score = 85
if age_ratio <= 0.20:  score = 65
if age_ratio <= 0.30:  score = 45
if age_ratio <= 0.40:  score = 30
else:                   score = 20
```

**Logika:** File lama/tak terpakai = digital clutter. Pembersihan rutin meningkatkan kesehatan storage.

**Data source:** `scan_entries.modified_at`, `scan_statistics.oldest_file_date`

#### F7: Disk Health (Bobot: 5%) — Ekspansi Masa Depan

*Placeholder.* Saat ini selalu 100. Di masa depan bisa diisi dengan:
- S.M.A.R.T data (melalui `smartctl` atau API OS)
- SSD remaining lifetime
- Reallocated sector count

### 2.2 Tabel Ringkasan Bobot

| Faktor | Bobot | Tipe Sumber | Sumber Data |
|--------|-------|-------------|-------------|
| F1: Free Space Ratio | **30%** | Real-time OS | `volumes` |
| F2: Health Score Proxy | **15%** | Post-scan | `scan_entries` |
| F3: Duplicate Ratio | **15%** | Post-scan | `duplicate_groups` |
| F4: Temp/Cache Ratio | **15%** | Post-scan | `cache_entries` |
| F5: Large File Ratio | **10%** | Post-scan | `scan_entries` |
| F6: File Age Score | **10%** | Post-scan | `scan_statistics` |
| F7: Disk Health | **5%** | OS/Placeholder | S.M.A.R.T (future) |

### 2.3 Formula Final

```
overall_score = round(
    F1 * 0.30 +
    F2 * 0.15 +
    F3 * 0.15 +
    F4 * 0.15 +
    F5 * 0.10 +
    F6 * 0.10 +
    F7 * 0.05
)
```

**Clamping:** `max(0, min(100, overall_score))`

**Rounding:** Dibulatkan ke bilangan bulat terdekat.

**Special case:** Jika `free_ratio < 0.02` (<2%), skor maksimal adalah 25 (state darurat override). Ini mencegah situasi di mana storage hampir penuh tapi dapat skor tinggi karena faktor lain baik.

---

## 3. Grade System

### 3.1 Definisi Grade

| Grade | Rentang Skor | Label | Warna | Interpretasi |
|-------|-------------|-------|-------|-------------|
| **A** | 90-100 | Excellent | Hijau Tua | Storage dalam kondisi optimal. Pertahankan! |
| **B** | 75-89 | Good | Hijau Muda | Storage baik dengan sedikit ruang optimasi. |
| **C** | 55-74 | Fair | Kuning | Beberapa faktor memerlukan perhatian. |
| **D** | 35-54 | Poor | Oranye | Masalah signifikan terdeteksi. |
| **E** | 0-34 | Critical | Merah | Storage memerlukan tindakan segera. |

### 3.2 Aturan Khusus (Override)

Untuk mencegah grade yang menyesatkan, aturan override diterapkan:

1. **E Override (Darurat):** Jika `free_ratio < 0.03` (<3%), grade maksimal E meskipun perhitungan skor >34.
2. **D Override (Warning):** Jika `free_ratio < 0.05` (<5%) DAN `dup_ratio > 0.20`, grade maksimal D.
3. **A Override (Optimal):** Tidak bisa dapat A jika ada faktor dengan skor <50 (kecuali F7 Disk Health).

### 3.3 Visualisasi

```
              Grade A          Grade B          Grade C          Grade D          Grade E
             90-100           75-89            55-74            35-54             0-34
               ●                ●                ●                ●                ●
              ███████████████████████████████████████████████████████████████████████████
             Optimal          Good             Fair             Poor             Critical
```

---

## 4. Recommendation Engine

### 4.1 Arsitektur Rekomendasi

Setiap faktor menghasilkan 0-N rekomendasi. Rekomendasi diurutkan berdasarkan:
1. **Impact** — Seberapa besar skor akan naik jika direkomendasikan
2. **Effort** — Seberapa mudah dilakukan (mudah = prioritas tinggi)
3. **Safety** — Risiko kehilangan data

### 4.2 Daftar Rekomendasi

| ID | Kondisi | Rekomendasi | Impact | Effort | Safety | Kategori |
|----|---------|-------------|--------|--------|--------|----------|
| R01 | `free_ratio < 0.10` | "Free up space — your drive is critically full" | High | Medium | High | Urgent |
| R02 | `free_ratio < 0.20` | "Your drive is getting full. Consider cleaning up old files" | Medium | Low | High | Warning |
| R03 | `dup_ratio > 0.05` | "Remove duplicate files to reclaim space" | High | Medium | High | Duplicate |
| R04 | `temp_ratio > 0.03` | "Clear developer cache and temporary files" | Medium | Low | High | Cache |
| R05 | `large_ratio > 0.30` | "Review large files (>1GB) for archiving or deletion" | High | Medium | Medium | Files |
| R06 | `age_ratio > 0.10` | "Archive or remove old files not accessed in 6+ months" | Medium | High | Medium | Files |
| R07 | `dup_ratio > 0.15` | "Run duplicate detector to find and remove duplicates" | High | Low | High | Duplicate |
| R08 | `temp_ratio > 0.08` | "Run cache cleaner to remove developer build artifacts" | High | Low | High | Cache |
| R09 | `file_density > 1000` | "Too many small files — consider consolidating" | Low | High | High | Maintenance |
| R10 | `frag_score < 40` | "Defragment drive (HDD) or optimize (SSD)" | Medium | Medium | Medium | Performance |

### 4.3 Algoritma Prioritas

```
for each recommendation:
    priority_score = impact_weight * impact +
                     effort_weight * (1 / effort) +
                     safety_weight * safety

    # Urgent override
    if category == "Urgent":
        priority_score *= 2

    # Jika rekomendasi redundan (sama dengan yang sudah ada), skip
    if is_duplicate(recommendations, rec):
        continue

sort by priority_score DESC
limit to top 5
```

### 4.4 Penyajian ke Pengguna

```
┌──────────────────────────────────────────────────────────────┐
│  Storage Health: 62/100 (Grade C — Fair)                     │
│                                                              │
│  ┌─── Top Factors ────────────────────────────────────────┐  │
│  │  ● Free space: 8% used (Score: 15/100)  — CRITICAL     │  │
│  │  ● Duplicates: 45GB wasted (Score: 45/100)             │  │
│  │  ● Cache: 12GB (Score: 70/100)                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─── Recommendations ───────────────────────────────────┐  │
│  │  ⚠ Free up space — drive is critically full           │  │
│  │    → Run Cache Cleaner (could free ~12GB)              │  │
│  │    → Remove Duplicates (could free ~45GB)              │  │
│  │                                                         │  │
│  │  ✓ Run Cache Cleaner to remove temp files              │  │
│  │    → 1-click clean (estimated: 12GB)                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Trend Analysis System

### 5.1 Tujuan

Melacak perubahan skor kesehatan antar waktu untuk:
- Mendeteksi degradasi storage
- Memvalidasi efektivitas pembersihan
- Memberikan konteks ("skor turun 10% minggu ini")

### 5.2 Perhitungan Trend

Trend dihitung berdasarkan *snapshot interval*:

| Interval | Rentang Snapshot | Makna |
|----------|-----------------|-------|
| 1 hari | Sekarang vs 1 hari lalu | Perubahan cepat (setelah clean) |
| 7 hari | Sekarang vs 7 hari lalu | Perubahan mingguan |
| 30 hari | Sekarang vs 30 hari lalu | Perubahan bulanan |
| 90 hari | Sekarang vs 90 hari lalu | Perubahan kuartalan |

### 5.3 Metrik Trend

```
delta_1d  = score_now  - score_1d_ago
delta_7d  = score_now  - score_7d_ago
delta_30d = score_now  - score_30d_ago

trend_direction = sign(delta_7d)    # +1 = naik, 0 = stabil, -1 = turun
trend_magnitude = abs(delta_7d)     # Seberapa besar perubahan
trend_velocity = delta_7d / 7       # Rata-rata perubahan per hari
```

### 5.4 Display ke Pengguna

```
Trend: ↓ -5 points this week (Last 7 days)

Score History:
  100 ┤
   90 ┤
   80 ┤
   70 ┤        ●──●
   60 ┤──●────●
   50 ┤
      └───┬───┬───┬───┬───┬───
         Mon Tue Wed Thu Fri Sat Sun

Factors changing:
  ● Free space: 80 → 72 (-10%)  [Primary driver]
  ● Duplicates: 90 → 90 (0%)
  ● Cache:      85 → 80 (-5%)
```

---

## 6. Score History System

### 6.1 Database Schema — Health Snapshots

Schema existing di `health_snapshots` (lihat `data-model.md`) sudah mencakup kebutuhan dasar. Enhancement yang diperlukan:

#### Migration Tambahan: `health_snapshots_extended`

Kolom baru yang perlu ditambahkan untuk mendukung analisis lanjutan:

| Kolom | Type | Purpose |
|-------|------|---------|
| `factor_breakdown_json` | TEXT | JSON berisi skor per faktor + bobot untuk analisis UI |
| `recommendations_json` | TEXT | JSON berisi rekomendasi yang dihasilkan saat snapshot |
| `trend_delta_7d` | REAL | Perubahan skor dari snapshot 7 hari lalu |
| `trend_delta_30d` | REAL | Perubahan skor dari snapshot 30 hari lalu |
| `total_wasted_bytes` | INTEGER | Total ruang terbuang (duplikat + cache + temp) |
| `recoverable_bytes` | INTEGER | Total yang bisa direcover dengan clean/remove |
| `calculation_version` | INTEGER | Versi algoritma yang digunakan |

### 6.2 Snapshot Lifecycle

```
[Scan Complete]
    │
    ▼
[Calculate Health Score]
    │
    ├──→ Hitung F1 (Free Space)      ← volumes
    ├──→ Hitung F2 (Fragmentation)   ← scan_entries
    ├──→ Hitung F3 (Duplicates)      ← duplicate_groups
    ├──→ Hitung F4 (Temp/Cache)      ← cache_entries
    ├──→ Hitung F5 (Large Files)     ← scan_entries
    ├──→ Hitung F6 (File Age)        ← scan_statistics
    ├──→ Hitung F7 (Disk Health)     ← placeholder
    │
    ▼
[Apply Weights → Overall Score]
    │
    ▼
[Generate Recommendations]
    │
    ▼
[Calculate Trend Deltas]
    │
    ▼
[Save to health_snapshots]
    │
    ▼
[Emit Event: health:score_updated]
    │
    ▼
[UI Updates Dashboard]
```

### 6.3 Retention Policy

| Data | Retention | Alasan |
|------|-----------|--------|
| Snapshots harian | 90 hari | Analisis trend kuartalan |
| Snapshots mingguan | 1 tahun | Analisis tahunan |
| Snapshots bulanan | Selamanya | Histori jangka panjang |
| Raw per-scan | 30 hari | Detail granular |

Implementasi: setelah 90 hari, aggregate snapshots harian ke mingguan (rata-rata), hapus raw data.

---

## 7. Score Comparison System

### 7.1 Cross-Volume Comparison

```
Volume C:\ (OS)     Score: 62 (Fair)
  ● Free Space:  8%  ── Critical
  ● Duplicates: 45GB ── Attention

Volume D:\ (Data)   Score: 88 (Good)
  ● Free Space: 35%  ── Optimal
  ● Duplicates:  2GB ── Minimal

Volume E:\ (Backup) Score: 95 (Excellent)
  ● Free Space: 55%
  ● No issues detected
```

Setiap volume di-dashboard sebagai card terpisah dengan:
- Score + Grade
- Perubahan dari snapshot sebelumnya
- 1-line summary faktor dominan

### 7.2 Cross-Time Comparison

Basis: `health_snapshots` dengan filter `volume_id` + rentang waktu.

```
SELECT snapshot_at, overall_score, free_space_score, duplicate_score
FROM health_snapshots
WHERE volume_id = ? AND snapshot_at BETWEEN ? AND ?
ORDER BY snapshot_at ASC
```

### 7.3 Aggregated System Score

Jika multiple volume:

```
system_score = weighted_average(volume_scores_by_size)

# Bobot berdasarkan kapasitas
total_capacity = sum(volume.total_capacity)
for each volume:
    weight = volume.total_capacity / total_capacity
    system_score += volume.overall_score * weight
```

### 7.4 Normalization untuk Perbandingan

Untuk memastikan perbandingan yang adil:

1. **Score normalization:** Semua skor sudah dalam rentang 0-100
2. **Timestamp normalization:** Snapshot yang dibandingkan harus dalam interval yang sama (±1 jam)
3. **Volume type normalization:** SSD vs HDD memiliki baseline fragmentasi berbeda — faktor F2 disesuaikan
4. **Algorithm version tracking:** Jika `calculation_version` berbeda, tampilkan notifikasi

---

## 8. Data Flow Diagram

### 8.1 Complete Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              SCANNER PIPELINE                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────────────────┐  │
│  │ jwalk    │──▶│ Filter   │──▶│ Mapper   │──▶│ Batching │──▶│ SQLite Persister  │  │
│  │ Parallel │   │ Engine   │   │ DirEntry │   │ 500 rows │   │ scan_entries      │  │
│  │ Walker   │   │          │   │ →FileEntry│   │ /tx      │   │                   │  │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └────────┬──────────┘  │
│                                                                        │              │
└────────────────────────────────────────────────────────────────────────┼──────────────┘
                                                                         │
                                                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           POST-PROCESSING PIPELINE                                    │
│                                                                                       │
│  ┌────────────────────┐    ┌────────────────────┐    ┌──────────────────────────┐    │
│  │ Duplicate Detector │    │   Cache Cleaner     │    │    Directory Summarizer  │    │
│  │ ────────────────   │    │ ────────────────    │    │ ──────────────────────   │    │
│  │ 1. Group by size   │    │ 1. Load YAML rules  │    │ 1. Aggregate per dir     │    │
│  │ 2. Partial hash    │    │ 2. Match patterns   │    │ 2. Save to summaries     │    │
│  │ 3. Full hash       │    │ 3. Calculate sizes  │    │ 3. Build file tree       │    │
│  │ 4. Store results   │    │ 4. Store entries    │    │                          │    │
│  └─────────┬──────────┘    └──────────┬──────────┘    └──────────────────────────┘    │
│            │                          │                                                │
└────────────┼──────────────────────────┼────────────────────────────────────────────────┘
             │                          │
             ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           HEALTH SCORE CALCULATOR                                     │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │                            SCORE AGGREGATOR                                  │    │
│  │                                                                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ Free     │  │Frag-     │  │Duplicate │  │ Temp/    │  │ Large    │      │    │
│  │  │ Space    │  │mentation │  │ Ratio    │  │ Cache    │  │ File     │      │    │
│  │  │ F1(30%)  │  │F2(15%)    │  │ F3(15%)   │  │ F4(15%)   │  │ F5(10%)   │      │    │
│  │  │          │  │          │  │          │  │          │  │          │      │    │
│  │  │ Volume   │  │File      │  │Duplicate │  │Cache     │  │Scan      │      │    │
│  │  │ Table    │  │Entries   │  │Groups    │  │Entries   │  │Entries   │      │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │    │
│  │                                                                              │    │
│  │  ┌──────────┐  ┌────────────────────────────────────────────────────────┐  │    │
│  │  │ File Age │  │  WEIGHTED SUM → OVERALL SCORE (0-100)                  │  │    │
│  │  │ F6(10%)  │  │  round(F1*0.30 + F2*0.15 + F3*0.15 + F4*0.15          │  │    │
│  │  │          │  │        + F5*0.10 + F6*0.10 + F7*0.05)                 │  │    │
│  │  │Scan      │  └────────────────────────────────────────────────────────┘  │    │
│  │  │Statistics│                                                              │    │
│  │  └──────────┘                                                              │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│            │                                                                          │
│            ▼                                                                          │
│  ┌────────────────────────────────────────────────────┐                              │
│  │           RECOMMENDATION & TREND ENGINE             │                              │
│  │                                                    │                              │
│  │  ┌────────────────────┐  ┌────────────────────┐   │                              │
│  │  │ Recommendation     │  │ Trend Analyzer      │   │                              │
│  │  │ Generator          │  │ ────────────────    │   │                              │
│  │  │ ────────────────   │  │ Compare with last   │   │                              │
│  │  │ Impact-ordered     │  │ 1d/7d/30d/90d      │   │                              │
│  │  │ Top 5 suggestions  │  │ Calculate velocity  │   │                              │
│  │  │ Category-grouped   │  │ Detect trends       │   │                              │
│  │  └────────────────────┘  └────────────────────┘   │                              │
│  └────────────────────────────────────────────────────┘                              │
│            │                                                                          │
│            ▼                                                                          │
│  ┌────────────────────────────────────────────────────┐                              │
│  │              PERSISTENCE & NOTIFICATION             │                              │
│  │                                                    │                              │
│  │  ┌──────────────────────┐    ┌─────────────────┐   │                              │
│  │  │ Save to              │    │ Emit Tauri Event │   │                              │
│  │  │ health_snapshots     │───▶│                 │   │                              │
│  │  │ + recommendations    │    │ health:updated  │   │                              │
│  │  └──────────────────────┘    └────────┬────────┘   │                              │
│  └────────────────────────────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              UI / DASHBOARD                                           │
│                                                                                       │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │ Health Gauge         │  │ Factor Breakdown      │  │ Trend Chart             │    │
│  │ ────────────────     │  │ ────────────────      │  │ ───────────────────     │    │
│  │ Circular gauge       │  │ Horizontal bar chart  │  │ Line chart (7d/30d/90d) │    │
│  │ 0-100 + Grade A-E    │  │ Color-coded factors   │  │ Annotated events        │    │
│  │ Color-coded          │  │ Sorted by impact      │  │ (scan, clean, move)     │    │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────────┘    │
│                                                                                       │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────────────┐      │
│  │ Recommendation Card  │  │ Cross-Volume Comparison                          │      │
│  │ ────────────────     │  │ ─────────────────────────────                     │      │
│  │ Top 5 actions        │  │ Multi-volume score comparison                    │      │
│  │ Impact estimate      │  │ Aggregated system score                          │      │
│  │ 1-click actions      │  │ Per-volume grade                                 │      │
│  └──────────────────────┘  └──────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Sequence Diagram

### 9.1 Health Score Calculation Sequence

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐
│  User    │  │  UI      │  │  Engine  │  │  Health  │  │  Recommender │  │  Trend   │  │   DB     │  │  Volume   │
│          │  │ (React)  │  │  Core    │  │  Calc    │  │              │  │  Analyzer│  │          │  │   Store   │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └────┬─────┘  └────┬──────┘
     │              │              │              │              │               │              │             │
     │  [Scan Done] │              │              │              │               │              │             │
     │─────────────>│              │              │              │               │              │             │
     │              │  scan:complete              │              │               │              │             │
     │              │─────────────>│              │              │               │              │             │
     │              │              │              │              │               │              │             │
     │              │              │  Calculate   │              │               │              │             │
     │              │              │  Health      │              │               │              │             │
     │              │              │─────────────>│              │               │              │             │
     │              │              │              │              │               │              │             │
     │              │              │              │──┐           │               │              │             │
     │              │              │              │  │ Get volume│               │              │             │
     │              │              │              │  │ space     │               │              │             │
     │              │              │              │<─┘           │               │              │             │
     │              │              │              │──────────────│──────────────│──────────────>│             │
     │              │              │              │  SELECT      │               │              │             │
     │              │              │              │  volumes     │               │              │             │
     │              │              │              │<─────────────│──────────────│──────────────│             │
     │              │              │              │              │               │              │             │
     │              │              │              │──┐           │               │              │             │
     │              │              │              │  │ Calculate │               │              │             │
     │              │              │              │  │ F1 (Free  │               │              │             │
     │              │              │              │  │ Space)    │               │              │             │
     │              │              │              │<─┘           │               │              │             │
     │              │              │              │              │               │              │             │
     │              │              │              │──┐           │               │              │             │
     │              │              │              │  │ Query     │               │              │             │
     │              │              │              │  │ scan_     │               │              │             │
     │              │              │              │  │ entries   │               │              │             │
     │              │              │              │  │ for F2,F5 │               │              │             │
     │              │              │              │<─┘           │               │              │             │
     │              │              │              │──────────────│──────────────│──────────────>│             │
     │              │              │              │  SELECT      │               │              │             │
     │              │              │              │<─────────────│──────────────│──────────────│             │
     │              │              │              │              │               │              │             │
     │              │              │              │──┐           │               │              │             │
     │              │              │              │  │ Calculate │               │              │             │
     │              │              │              │  │ F2-F6     │               │              │             │
     │              │              │              │<─┘           │               │              │             │
     │              │              │              │              │               │              │             │
     │              │              │              │──┐           │               │              │             │
     │              │              │              │  │ Apply     │               │              │             │
     │              │              │              │  │ weights + │               │              │             │
     │              │              │              │  │ emergency │               │              │             │
     │              │              │              │  │ overrides │               │              │             │
     │              │              │              │<─┘           │               │              │             │
     │              │              │              │              │               │              │             │
     │              │              │              │  Score=62    │               │              │             │
     │              │              │              │─────────────>│               │              │             │
     │              │              │              │              │               │              │             │
     │              │              │              │              │──┐            │              │             │
     │              │              │              │              │  │ Generate   │              │             │
     │              │              │              │              │  │ Recomm-    │              │             │
     │              │              │              │              │  │ endations  │              │             │
     │              │              │              │              │<─┘            │              │             │
     │              │              │              │              │              │              │             │
     │              │              │              │              │  Recommenda- │              │             │
     │              │              │              │              │  tions [R01,  │              │             │
     │              │              │              │              │  R03, R04...] │              │             │
     │              │              │              │──────────────│──────────────│──────────────>│             │
     │              │              │              │              │               │              │             │
     │              │              │              │              │               │──┐           │             │
     │              │              │              │              │               │  │ Compute   │             │
     │              │              │              │              │               │  │ trend     │             │
     │              │              │              │              │               │  │ deltas    │             │
     │              │              │              │              │               │<─┘           │             │
     │              │              │              │              │               │              │             │
     │              │              │              │  Save to     │               │              │             │
     │              │              │              │  health_     │               │              │             │
     │              │              │              │  snapshots   │               │              │             │
     │              │              │              │──────────────│──────────────│──────────────>│             │
     │              │              │              │  INSERT INTO │               │              │             │
     │              │              │              │  health_     │               │              │             │
     │              │              │              │  snapshots   │               │              │             │
     │              │              │              │<─────────────│──────────────│──────────────│             │
     │              │              │              │              │               │              │             │
     │              │              │  Complete    │              │               │              │             │
     │              │              │<─────────────│              │               │              │             │
     │              │              │              │              │               │              │             │
     │              │  health:     │              │              │               │              │             │
     │              │  updated     │              │              │               │              │             │
     │              │<─────────────│              │              │               │              │             │
     │              │              │              │              │               │              │             │
     │  Update      │              │              │              │               │              │             │
     │  Dashboard   │              │              │              │               │              │             │
     │<─────────────│              │              │              │               │              │             │
```

---

## 10. Database Schema Enhancement

### 10.1 Additional Migration: `health_snapshots_extended`

```sql
-- Extension untuk health snapshots (ditambahkan ke health_snapshots table)
ALTER TABLE health_snapshots ADD COLUMN factor_breakdown_json TEXT;
ALTER TABLE health_snapshots ADD COLUMN recommendations_json TEXT;
ALTER TABLE health_snapshots ADD COLUMN trend_delta_7d REAL;
ALTER TABLE health_snapshots ADD COLUMN trend_delta_30d REAL;
ALTER TABLE health_snapshots ADD COLUMN total_wasted_bytes INTEGER;
ALTER TABLE health_snapshots ADD COLUMN recoverable_bytes INTEGER;
ALTER TABLE health_snapshots ADD COLUMN calculation_version INTEGER DEFAULT 1;
```

### 10.2 New Table: `health_recommendations`

```sql
CREATE TABLE IF NOT EXISTS health_recommendations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id         INTEGER NOT NULL REFERENCES health_snapshots(id) ON DELETE CASCADE,
    recommendation_id   TEXT NOT NULL,        -- R01, R02, etc.
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    category            TEXT NOT NULL,         -- urgent, warning, duplicate, cache, files, maintenance, performance
    impact_score        INTEGER NOT NULL,      -- 0-100
    effort_level        TEXT NOT NULL,         -- low, medium, high
    safety_level        TEXT NOT NULL,         -- low, medium, high
    estimated_reclaim   INTEGER,               -- Bytes yang bisa direcover
    sort_order          INTEGER NOT NULL DEFAULT 0,
    is_dismissed        BOOLEAN DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(snapshot_id, recommendation_id)
);
```

### 10.3 New Table: `health_anomalies`

```sql
CREATE TABLE IF NOT EXISTS health_anomalies (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    volume_id           INTEGER NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
    anomaly_type        TEXT NOT NULL,         -- sudden_drop, spike, degradation
    severity            TEXT NOT NULL,         -- low, medium, high, critical
    previous_score      REAL NOT NULL,
    current_score       REAL NOT NULL,
    delta               REAL NOT NULL,
    detected_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    acknowledged_at     TEXT,
    acknowledged_by     TEXT,
    notes               TEXT
);
```

---

## 11. Event System

### 11.1 Events Emitted

| Event | Trigger | Payload | Consumer |
|-------|---------|---------|----------|
| `health:score_updated` | Snapshot saved | `{ volume_id, overall_score, grade, factor_scores }` | Dashboard UI |
| `health:trend_changed` | Trend direction changes | `{ delta, direction, velocity }` | Trend chart, notifications |
| `health:anomaly_detected` | Unexpected score change | `{ anomaly_type, severity, delta }` | Notification system |
| `health:grade_changed` | Grade crosses boundary | `{ previous_grade, current_grade, factors }` | Dashboard highlight |
| `health:recommendations_ready` | After calculation | `{ count, top_impact }` | Recommendation panel |

### 11.2 Event Payload Example

```typescript
interface HealthScoreUpdated {
  volume_id: number;
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  grade_label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  factor_scores: {
    free_space: number;
    fragmentation: number;
    duplicate: number;
    temp_cache: number;
    large_file: number;
    file_age: number;
    disk_health: number;
  };
  top_factors: Array<{
    name: string;
    score: number;
    weight: number;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    category: string;
    estimated_reclaim: number;
  }>;
  trend: {
    delta_7d: number;
    delta_30d: number;
    direction: 'improving' | 'stable' | 'declining';
  };
}
```

---

## 12. Configuration System

### 12.1 Tunable Parameters

Semua parameter scoring bisa dikonfigurasi melalui `app_settings`:

| Key | Default | Description | User Range |
|-----|---------|-------------|------------|
| `health.free_space_warning` | 0.20 (20%) | Threshold warning free space | 0.10-0.40 |
| `health.free_space_critical` | 0.05 (5%) | Threshold kritis free space | 0.02-0.15 |
| `health.free_space_weight` | 0.30 | Bobot F1 | 0.20-0.40 |
| `health.dup_weight` | 0.15 | Bobot F3 | 0.05-0.25 |
| `health.cache_weight` | 0.15 | Bobot F4 | 0.05-0.25 |
| `health.large_file_threshold` | 1073741824 (1GB) | Batas "file besar" | 100MB-10GB |
| `health.old_file_days` | 180 | Hari untuk "file lama" | 30-365 |
| `health.recommendation_limit` | 5 | Maks rekomendasi ditampilkan | 3-10 |

### 12.2 User Profiles

| Profile | Deskripsi | Perubahan Bobot |
|---------|-----------|-----------------|
| **Default** | Untuk pengguna awam | Bobot standar |
| **Developer** | Cache lebih penting | F4: 15% → 25%, F6: 10% → 5% |
| **Photographer** | Large file lebih penting | F5: 10% → 20%, F6: 10% → 5% |
| **Server Admin** | Free space sangat penting | F1: 30% → 40%, F2: 15% → 20% |
| **Custom** | User-defined weights | Sesuai konfigurasi |

---

## 13. Risk Analysis

### 13.1 Scoring Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **False low score** — User panik karena skor rendah padahal normal | Medium | High | Explainability layer: tampilkan faktor dominan + rekomendasi jelas |
| **False high score** — User abai karena skor tinggi padahal ada masalah | Low | High | Emergency overrides (free space <3% → maks E) |
| **Data stale** — Snapshot terlalu lama, skor tidak akurat | Medium | Medium | Trigger re-calculation on scan complete; show "last updated" timestamp |
| **Weight bias** — Bobot default tidak cocok untuk semua pengguna | High | Medium | Multiple user profiles + custom weights |
| **Fragmentation proxy error** — Proxy metric tidak akurat | High | Low | Label sebagai "estimated"; future: gunakan data OS asli |
| **Cross-version score drift** — Perubahan algoritma membuat skor tidak komparabel | Medium | High | Version tracking di setiap snapshot; migration notes untuk user |

### 13.2 Data Freshness Matrix

| Scenario | Max Age | Action |
|----------|---------|--------|
| Dashboard / Home page | 24 hours | Show cached score; show "last updated" |
| After scan completes | Real-time | Re-calculate and update |
| After clean/move operation | Real-time | Re-calculate and update |
| Historical trend | Archived | Use stored snapshots |

---

## 14. Accuracy Analysis

### 14.1 Validation Strategy

1. **Synthetic testing:** Generate known-good datasets dengan berbagai skenario (near-full drive, high duplicates, etc.) dan verifikasi skor sesuai harapan.
2. **Regression testing:** Simpan hasil perhitungan untuk setiap versi algoritma; pastikan perubahan tidak regresi.
3. **User surveys:** Kumpulkan feedback "apakah skor mencerminkan kondisi storage Anda?" untuk fine-tuning bobot.
4. **A/B testing:** Uji berbagai bobot dengan sample pengguna dan ukur engagement.

### 14.2 Known Limitations

| Limitation | Impact | Future Improvement |
|------------|--------|-------------------|
| Fragmentasi diestimasi, tidak diukur langsung | Akurasi F2 ±20% | Integrasi API OS (`defrag.exe`, `fsutil`) |
| File age hanya berdasarkan modified_at | File moved = timestamp baru | Cross-reference dengan scan history |
| Tidak bisa bedakan "file penting" vs "sampah" | Rekomendasi bisa tidak relevan | Machine learning classification |
| Skor tunggal untuk seluruh volume | Tidak mencerminkan distribusi per direktori | Per-directory health score |
| Cache detection terbatas pada ruleset | Cache baru tidak terdeteksi | Auto-update ruleset + community contributions |

### 14.3 Accuracy Targets

| Metrik | Target | Metode Pengukuran |
|--------|--------|-------------------|
| Score reproducibility | ±1 point | Hitung ulang dari data yang sama |
| Sensitivity (free space) | Detect <5% change | Unit test per faktor |
| False positive rate | <5% | Synthetic datasets |
| User satisfaction | >80% | In-app survey "Does this score match your perception?" |

---

## 15. Explainability Analysis

### 15.1 Why Explainability Matters

Storage health score bersifat *abstrak* — pengguna tidak bisa langsung memvalidasi "apakah skor 62 benar?". Penjelasan membangun trust dan mendorong tindakan.

### 15.2 Explanation Model

Setiap faktor memiliki:

```
Factor: Free Space
Score: 15/100 (Very Poor)
Weight: 30% (Highest impact)
Details: Only 8% free space remaining (4GB of 50GB)
Why this matters: Below 10% free space can slow down your drive
                 and increase risk of data corruption.
What you can do: Free up at least 10GB to reach 30% free space
                 (score would improve to 70+)
```

### 15.3 Three-Layer Explanation

| Layer | Audience | What to Show |
|-------|----------|-------------|
| **Simple** (1 line) | Awam | "Your drive is 92% full — consider freeing up space" |
| **Detailed** (widget) | Menengah | Factor breakdown + score impact per factor |
| **Technical** (expandable) | Profesional | Raw metrics, calculation formula, thresholds used |

### 15.4 "What If" Simulator

User bisa melihat simulasi skor dengan mengubah parameter:

```
What if I free 20GB?
  ● Free Space: 15 → 65 (+50 points)
  ● Overall:    62 → 78 (+16 points)
  ● Grade:      C → B

What if I remove duplicates (45GB)?
  ● Duplicate:  45 → 100 (+55 points)
  ● Free Space: 15 → 45 (+30 points)
  ● Overall:    62 → 82 (+20 points)
  ● Grade:      C → B
```

---

## 16. Future Expansion Plan

### 16.1 Phase 1: Core (v1.0) — Current Design

- 7 faktor dengan bobot tetap
- Grade A-E
- 10 rekomendasi built-in
- Trend 7d/30d
- Basic cross-volume comparison
- User profiles (Default, Developer, Photographer, Admin)

### 16.2 Phase 2: Enhanced (v1.1)

- **S.M.A.R.T integration** — Baca SMART data untuk F7 (Disk Health) yang akurat
- **Per-directory health score** — "Directory /projects/node_modules has score 15/100"
- **Custom rules engine** — User-defined scoring rules (ex: "ignore backup drives")
- **Notification system** — Alert when score drops significantly
- **Export/import** — JSON export untuk support

### 16.3 Phase 3: Intelligent (v2.0)

- **Machine learning scoring** — Model trained on user cleaning patterns
- **Predictive scoring** — "Estimated score in 30 days if no action taken: 45 (-17 points)"
- **Anomaly detection** — Otomatis deteksi anomali storage (sudden space loss, unusual file growth)
- **Personalized weights** — ML-adjusted weights per user behavior
- **Community benchmarks** — Compare score with similar users (anonymous)

### 16.4 Phase 4: Ecosystem (v3.0)

- **Cloud sync** — Score history across devices
- **Team dashboard** — Multi-user health overview
- **Automated remediation** — Schedule clean operations at defined thresholds
- **Third-party API** — Embed health score in other apps
- **Mobile companion** — Push alerts, quick actions

### 16.5 Expansion-Ready Design Patterns

1. **Faktor plugin system:** Faktor baru bisa ditambahkan tanpa mengubah formula inti
2. **Weight injection:** Bobot bisa diganti runtime via konfigurasi
3. **Versioned snapshots:** Skor lama tetap valid meskipun algoritma berubah
4. **Pluggable data sources:** F7 (Disk Health) bisa dapat data dari SMART di masa depan
5. **Extensible recommendations:** Recommendation engine bisa diperluas dengan rule baru

---

## 17. Implementation Constraints (Non-Code)

### 17.1 Performance Budget

| Operasi | Target (1M files) | Target (10M files) |
|---------|-------------------|--------------------|
| Health score calculation | <500ms | <2s |
| Trend computation (7 snapshots) | <100ms | <200ms |
| Recommendation generation | <50ms | <100ms |
| Dashboard query (latest) | <10ms | <10ms |

### 17.2 Memory Budget

| Komponen | Budget |
|----------|--------|
| Factor scores (in-memory calculation) | <1MB |
| Trend data (90 snapshots) | <5MB |
| Recommendation state | <500KB |
| Total health module | <10MB |

### 17.3 Storage Budget

| Data | Growth Rate | 1 Year |
|------|-------------|--------|
| health_snapshots (1 per scan) | ~100 bytes each | ~1MB (10K scans) |
| health_recommendations | ~500 bytes each | ~5MB (10K scans × 5 rec) |
| health_anomalies | ~200 bytes each | ~200KB (1000 anomalies) |

---

## 18. ASCII System Diagram

```
                         STORAGE HEALTH SCORE SYSTEM
                      ───────────────────────────────

                        ┌─────────────────────┐
                        │     DATA SOURCES     │
                        ├─────────────────────┤
                        │  ┌───────────────┐  │
                        │  │   Volumes     │  │
                        │  │  (free space) │  │
                        │  └───────┬───────┘  │
                        │  ┌───────────────┐  │
                        │  │  Scan Entries │  │
                        │  │  (metadata)   │  │
                        │  └───────┬───────┘  │
                        │  ┌───────────────┐  │
                        │  │ Duplicate Grp │  │
                        │  │ (wasted size) │  │
                        │  └───────┬───────┘  │
                        │  ┌───────────────┐  │
                        │  │ Cache Entries │  │
                        │  │  (temp size)  │  │
                        │  └───────┬───────┘  │
                        └──────────┼──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │    FACTOR ENGINE     │
                        ├─────────────────────┤
                        │ F1 Free Space   ──┐  │
                        │   Score: 15/100   │  │
                        │                  │  │
                        │ F2 Fragmentation ─┤  │
                        │   Score: 60/100   │  │
                        │                  ├──┤
                        │ F3 Duplicates   ─┤  │
                        │   Score: 45/100   │  │
                        │                  │  ├──→ Weighted Sum
                        │ F4 Temp/Cache   ─┤  │      │
                        │   Score: 70/100   │  │      │
                        │                  │  │      ▼
                        │ F5 Large Files  ─┤  │  ┌──────────┐
                        │   Score: 85/100   │  │  │ OVERALL  │
                        │                  ├──┤  │ 62/100   │
                        │ F6 File Age     ─┤  │  │ Grade C  │
                        │   Score: 75/100   │  │  │ Fair     │
                        │                  │  │  └──────────┘
                        │ F7 Disk Health  ─┘  │
                        │   Score: 100/100    │
                        └──────────┬──────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                   │
                 ▼                 ▼                   ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
        │ Recommendation│  │     Trend    │  │    History       │
        │   Engine      │  │   Analyzer   │  │    Manager       │
        ├──────────────┤  ├──────────────┤  ├──────────────────┤
        │ Top Impact   │  │ Delta 7d/30d │  │ CRUD Snapshots   │
        │ Priority     │  │ Velocity     │  │ Retention Policy │
        │ Grouped      │  │ Direction    │  │ Version Tracking │
        └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘
               │                 │                   │
               └─────────────────┼───────────────────┘
                                 │
                                 ▼
                        ┌─────────────────────┐
                        │     PERSISTENCE     │
                        ├─────────────────────┤
                        │ health_snapshots    │
                        │ health_recommend    │
                        │ health_anomalies    │
                        └─────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────────┐
                        │    EVENT EMITTER    │
                        ├─────────────────────┤
                        │ health:score_update │
                        │ health:grade_change │
                        │ health:trend_change │
                        │ health:anomaly      │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  UI / DASHBOARD     │
                        ├─────────────────────┤
                        │ Gauge               │
                        │ Factor Breakdown    │
                        │ Trend Chart         │
                        │ Recommendations     │
                        │ What-If Simulator   │
                        └─────────────────────┘
```
