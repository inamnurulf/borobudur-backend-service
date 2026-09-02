# Migration Guide

Dokumen ini menjelaskan perubahan database yang tersedia di repository, urutan eksekusinya, serta cara menjalankan dan memverifikasinya.

## Model Migration

Database Borobudur dibangun melalui **dua jalur** yang berbeda:

1. **Skema dasar (framework migration eksternal)** — tabel-tabel utama (`users`, `roles`, `news`, `temple_nodes`, `temple_edges`, dll.) dibuat oleh framework migration terpisah yang **tidak tersedia di repository ini**. Jejaknya tercatat pada tabel `migrations` (kolom `name`, `run_on`), misalnya:

   ```
   /20250724131931-baseline-schema
   /20250726143958-seed-roles
   /20250726150832-create-server-error
   /20250727125047-create-navigation-tables
   /20250812112613-create-poi-tables
   /20250819193313-create-news-and-events-tables
   /20250824142505-temple-nodes-edges
   /20250915130506-create-articles-table
   ```

2. **Migration inkremental (file di repo)** — file `*.sql` di direktori ini berisi perubahan tambahan (ALTER / seed / CREATE TABLE baru) di atas skema dasar. Ini yang dijelaskan di bawah.

> **Catatan**: untuk membangun database dari nol, skema dasar harus direplikasi dari database yang sudah berjalan (misal `pg_dump`), karena file migration dasarnya tidak ada di repo. Lihat `docs/deployment.md`.

## Urutan Migration

Migration **harus dijalankan berurutan** sesuai nomor prefix:

```text
001_nearby_features_schema.sql
        |
        v
002_seed_poi_facilities.sql
        |
        v
003_seed_temple_nodes_floor.sql
        |
        v
004_create_temple_floor_contours.sql
        |
        v
005_add_is_stairs_to_temple_edges.sql
```

| File                                          | Jenis   | Tabel yang terdampak              | Dependency |
| --------------------------------------------- | ------- | --------------------------------- | ---------- |
| `001_nearby_features_schema.sql`              | Schema  | `temple_nodes`, `temple_features` | Skema dasar |
| `002_seed_poi_facilities.sql`                 | Seed    | `nodes`, `points_of_interest`     | Skema dasar |
| `003_seed_temple_nodes_floor.sql`             | Seed    | `temple_nodes`                    | `001`      |
| `004_create_temple_floor_contours.sql`        | Schema  | `temple_floor_contours` (baru)    | —          |
| `005_add_is_stairs_to_temple_edges.sql`       | Schema  | `temple_edges`                    | `003`      |

## Cara Menjalankan

Gunakan `psql` dengan connection string (lihat `.env`):

```bash
psql "$DATABASE_URL" -f migrations/001_nearby_features_schema.sql
psql "$DATABASE_URL" -f migrations/002_seed_poi_facilities.sql
psql "$DATABASE_URL" -f migrations/003_seed_temple_nodes_floor.sql
psql "$DATABASE_URL" -f migrations/004_create_temple_floor_contours.sql
psql "$DATABASE_URL" -f migrations/005_add_is_stairs_to_temple_edges.sql
```

### Verifikasi keberhasilan

```bash
psql "$DATABASE_URL" -c "\d temple_nodes"                                  # kolom floor & zone
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM points_of_interest;"         # seed fasilitas
psql "$DATABASE_URL" -c "SELECT floor, COUNT(*) FROM temple_nodes GROUP BY floor;"  # floor terisi
psql "$DATABASE_URL" -c "\d temple_floor_contours"                         # tabel contours
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM temple_edges WHERE is_stairs = true;"  # tangga terdeteksi
```

## Detail per Migration

### `001_nearby_features_schema.sql`

- **Tujuan**: menambah kolom `floor` dan `zone` pada `temple_nodes` serta `radius` pada `temple_features` untuk mendukung fitur `nearby-grouped`.
- **Tabel yang berubah**: `temple_nodes` (+ `floor INTEGER`, + `zone VARCHAR(50)`), `temple_features` (+ `radius INTEGER DEFAULT 5`).
- **Jenis**: schema migration (ALTER + CREATE INDEX).
- **Dependency**: skema dasar (tabel `temple_nodes` dan `temple_features` harus sudah ada).
- **Index**: `idx_temple_nodes_floor`, `idx_temple_nodes_zone`, `idx_temple_nodes_floor_zone`.
- **Idempotent**: ya — memakai `ADD COLUMN IF NOT EXISTS` dan `CREATE INDEX IF NOT EXISTS` dalam blok `DO $$`.
- **Rollback**: aman dijalankan ulang; tidak menyediakan `DOWN` otomatis.

### `002_seed_poi_facilities.sql`

- **Tujuan**: seed node & point-of-interest fasilitas (toilet, museum, parkir, dll.) di sekitar kawasan candi.
- **Tabel yang berubah**: `nodes` (28 baris), `points_of_interest` (28 baris).
- **Jenis**: seed data.
- **Dependency**: skema dasar (`nodes`, `points_of_interest`).
- **Idempotent**: ya — ada guard `IF EXISTS (SELECT 1 FROM nodes WHERE name = 'Pintu Masuk Utama')` yang membatalkan bila sudah ter-seed.
- **Rollback**: hapus baris dengan nama-nama pada daftar seed, atau hapus tabel `points_of_interest`/`nodes` terkait.

### `003_seed_temple_nodes_floor.sql`

- **Tujuan**: mengisi kolom `floor` pada `temple_nodes` berdasarkan pola nama node (`LANTAI n`, `DASAR_STUPA`, `STUPA1/2/3`).
- **Tabel yang berubah**: `temple_nodes` (kolom `floor`).
- **Jenis**: seed data (UPDATE).
- **Dependency**: `001_nearby_features_schema.sql` (kolom `floor` harus sudah ada).
- **Aturan pemetaan floor**:
  - `LANTAI n` → `n`
  - `DASAR_STUPA%` → `5`
  - `STUPA1%` → `6`, `STUPA2%` → `7`, `STUPA3%` → `8`
- **Verifikasi bawaan**: blok `DO $$` melempar exception bila masih ada node dengan `floor IS NULL`.
- **Rollback**: `UPDATE temple_nodes SET floor = NULL;` (mengembalikan ke kondisi sebelum seed).

### `004_create_temple_floor_contours.sql`

- **Tujuan**: membuat tabel `temple_floor_contours` untuk deteksi lantai berbasis polygon + altitude.
- **Tabel yang berubah**: `temple_floor_contours` (baru).
- **Jenis**: schema migration (CREATE TABLE).
- **Dependency**: ekstensi **PostGIS** (tipe `geometry(Polygon, 4326)`).
- **Index**: `idx_temple_floor_contours_floor`, `idx_temple_floor_contours_geom` (GIST).
- **Rollback**: `DROP TABLE IF EXISTS temple_floor_contours;`.

### `005_add_is_stairs_to_temple_edges.sql`

- **Tujuan**: menambah kolom `is_stairs` pada `temple_edges` dan menandai edge antar-lantai sebagai tangga.
- **Tabel yang berubah**: `temple_edges` (+ `is_stairs BOOLEAN NOT NULL DEFAULT false`).
- **Jenis**: schema migration (ALTER + UPDATE).
- **Dependency**: `003_seed_temple_nodes_floor.sql` (butuh `floor` pada node untuk mendeteksi perbedaan lantai).
- **Logika**: edge ditandai `is_stairs = true` bila `source.floor != target.floor`.
- **Rollback**: `ALTER TABLE temple_edges DROP COLUMN IF EXISTS is_stairs;`.

## Catatan / Gap

- **Skema dasar tidak ada di repo** — hanya migration inkremental (di atas) yang tersedia.
- **Tidak ada tooling migration otomatis** di `package.json` (tanpa `db-migrate`/`knex`/`umzug`); migration dijalankan manual via `psql`.
- Migration `001` dan `002` bersifat **idempotent**, sedangkan `003`, `004`, `005` dibungkus `BEGIN ... COMMIT` dan tidak menyediakan prosedur rollback otomatis (rollback manual sesuai catatan di atas).
