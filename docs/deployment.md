# Installation & Deployment

Dokumen ini menjelaskan prosedur reproduktif untuk menjalankan Borobudur Backend Service pada environment lokal hingga production, termasuk konfigurasi PostgreSQL, migration, Docker, dan health check.

## 1. Prasyarat

- **Node.js** 20 atau lebih baru
- **npm**
- **PostgreSQL** dengan ekstensi:
  - **PostGIS** (tipe `geometry`, SRID 4326)
  - **pgRouting** (shortest path)
- (Opsional) **Docker** untuk deployment containerized

## 2. Instalasi Lokal

```bash
git clone <repository>
cd borobudur-backend-service
npm install
cp .env.example .env
```

Edit `.env` sesuai environment (lihat tabel environment variables di bawah).

## 3. Konfigurasi PostgreSQL

### Buat database

```bash
createdb borobudur
```

### Aktifkan ekstensi

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgrouting;
```

### Atur koneksi di `.env`

Gunakan salah satu:

```env
# Cara 1: connection string
DATABASE_URL=postgres://user:password@host:5432/borobudur?sslmode=require

# Cara 2: per bagian
DB_HOST=host
DB_PORT=5432
DB_USER=user
DB_PASSWORD=password
DB_NAME=borobudur
DB_SSL=true
```

## 4. Migration

Terdapat **dua jalur migration** yang perlu dipahami:

### A. Migration inkremental (file di repo)

Repo ini menyediakan file SQL di `migrations/` untuk perubahan inkremental. Jalankan berurutan:

```bash
psql "$DATABASE_URL" -f migrations/001_nearby_features_schema.sql
psql "$DATABASE_URL" -f migrations/002_seed_poi_facilities.sql
psql "$DATABASE_URL" -f migrations/003_seed_temple_nodes_floor.sql
psql "$DATABASE_URL" -f migrations/004_create_temple_floor_contours.sql
psql "$DATABASE_URL" -f migrations/005_add_is_stairs_to_temple_edges.sql
```

### B. Skema dasar (framework migration eksternal)

> **Penting**: skema dasar tabel (`users`, `roles`, `news`, `temple_nodes`, dll.) **tidak ada di repo**. Database production dibangun melalui framework migration terpisah, yang tercatat pada tabel `migrations` dengan nama seperti:
>
> ```
> /20250724131931-baseline-schema
> /20250726143958-seed-roles
> /20250726150832-create-server-error
> /20250727125047-create-navigation-tables
> /20250812112613-create-poi-tables
> /20250819193313-create-news-and-events-tables
> /20250824142505-temple-nodes-edges
> /20250915130506-create-articles-table
> ```
>
> Untuk membangun database dari nol, skema dasar harus direplikasi dari database yang sudah ada atau di-export (`pg_dump`), karena file migration dasarnya tidak tersedia di repository ini.

### Verifikasi migration

```bash
psql "$DATABASE_URL" -c "SELECT name, run_on FROM migrations ORDER BY id;"
```

## 5. Menjalankan Development Server

```bash
npm run dev
```

Menggunakan `nodemon` untuk auto-reload. Server berjalan di `http://localhost:3001` (atau sesuai `PORT`).

## 6. Menjalankan Production Server

```bash
node src/server.js
```

Untuk production, set `NODE_ENV=production` jika diperlukan.

## 7. Docker

### Build

```bash
docker build -t borobudur-backend .
```

### Run

```bash
docker run --env-file .env -p 3001:3001 borobudur-backend
```

> **Catatan port**: aplikasi default ke `PORT=3001`, sedangkan Dockerfile `EXPOSE 3000`. Pastikan `PORT` di `.env` konsisten dengan mapping `-p` (contoh di atas menggunakan `3001:3001`).

## 8. Health Check

> **Belum ada route `/health`.** `src/server.js` tidak mendefinisikan endpoint health check. Akibatnya, `HEALTHCHECK` pada Dockerfile (`curl http://localhost:3000/health`) **akan gagal**.

Alternatif verifikasi bahwa service berjalan:

- Buka Swagger UI: `http://localhost:3001/api-docs`
- Panggil endpoint publik, mis. `GET /v1/news` atau `GET /v1/temples/graph`

Penambahan endpoint health check dedicated tercatat sebagai fitur *planned* di README.

## 9. Deployment Flow

```
Git Pull
   |
   v
Install / Docker Build
   |
   v
Database Migration
   |
   v
Start Application
   |
   v
Health Check (Swagger / endpoint publik)
```

## 10. Environment Variables

Berikut variabel lengkap yang dibaca kode (lihat `.env.example`).

| Variable                     | Kategori     | Keterangan                                      |
| ---------------------------- | ------------ | ----------------------------------------------- |
| `PORT`                       | optional     | Port server (default `3001`)                    |
| `DATABASE_URL`               | optional*    | Connection string PostgreSQL                    |
| `DB_HOST`                    | mandatory    | Host PostgreSQL                                 |
| `DB_PORT`                    | mandatory    | Port PostgreSQL (default `5432`)                |
| `DB_USER`                    | mandatory    | User PostgreSQL                                 |
| `DB_PASSWORD`                | mandatory    | Password PostgreSQL                             |
| `DB_NAME`                    | mandatory    | Nama database                                   |
| `DB_SSL`                     | optional     | `true` jika koneksi butuh SSL                   |
| `JWT_SECRET`                 | mandatory    | Signing access token (**secret**)               |
| `JWT_REFRESH_SECRET`         | mandatory    | Signing refresh token (**secret**)              |
| `JWT_ACCESS_EXP`             | optional     | Durasi access token (default `15m`)             |
| `JWT_REFRESH_EXP_DAYS`       | optional     | Durasi refresh token hari (default `30`)        |
| `SWAGGER_SERVER_URL`         | optional     | Base URL Swagger (default `http://localhost:3000`) |
| `HYPERBASE_HOST`             | mandatory    | Base URL Hyperbase (BaaS/ScyllaDB)              |
| `HYPERBASE_EMAIL`            | mandatory    | Kredensial login Hyperbase (**secret**)         |
| `HYPERBASE_PASSWORD`         | mandatory    | Password Hyperbase (**secret**)                 |
| `HYPERBASE_PROJECT_ID`       | mandatory    | Project Hyperbase                               |
| `HYPERBASE_COLLECTION_ID`    | mandatory    | Collection Hyperbase (visitor data)             |
| `HYPERBASE_BUCKET_ID`        | optional     | Bucket gambar Hyperbase                         |
| `MQTT_BROKER_URL`            | optional     | URL broker MQTT                                 |
| `MQTT_TOPIC`                 | optional     | Topic MQTT publish                              |
| `GMAIL_USER`                 | optional     | Email pengirim (Nodemailer) (**secret**)        |
| `GMAIL_PASS`                 | optional     | App password Gmail (**secret**)                 |
| `GOOGLE_CLIENT_ID`           | optional     | OAuth2 Google (login provider)                  |
| `GOOGLE_CLIENT_SECRET`       | optional     | OAuth2 Google (**secret**)                      |

\* `DATABASE_URL` alternatif dari kumpulan `DB_*`; salah satu harus tersedia.

> Variabel bertanda **secret** wajib **tidak masuk ke Git**. Gunakan `.env` (tercantum di `.gitignore`).

## 11. Catatan / Gap

1. **Route `/health` belum ada** (lihat §8).
2. **Skema dasar database tidak ada di repo** — hanya tersedia via database yang sudah berjalan (lihat §4).
3. **Port mismatch** — Dockerfile `EXPOSE 3000` vs default aplikasi `3001`; samakan lewat `PORT` dan mapping `-p`.
4. **`HYPERBASE_TOKEN_ID`** yang dulu ada di `.env.example` tidak lagi dipakai kode (auth token didapat dari login `HYPERBASE_EMAIL`/`HYPERBASE_PASSWORD`).
