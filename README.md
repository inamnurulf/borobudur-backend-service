# Borobudur Backend Service

Backend service untuk ekosistem **Smart Tourism Borobudur**. Menyediakan REST API modular (v1 dan v2) berbasis Express.js yang melayani aplikasi mobile Borobudur untuk kebutuhan autentikasi, konten heritage (news, articles, events), point of interest, model spasial candi, navigasi multi-level, dan pengumpulan data pengunjung.

---

## Architecture Overview

Backend ini berada di antara aplikasi mobile Borobudur dan dua sumber data: PostgreSQL (data aplikasi) serta Hyperbase dan MQTT (data pengunjung/IoT).

```
Borobudur Mobile App
        |
        v
REST API (/v1, /v2)
        |
        v
Borobudur Backend Service
        |
        +-- Authentication
        +-- Heritage Content / POI
        +-- Temple Spatial Model
        +-- Navigation
        +-- Visitor Data
        |
        +----------+----------------+
        |                           |
        v                           v
   PostgreSQL                Hyperbase + MQTT
 application DB           visitor / IoT data
```

### Fungsi Backend

- **Autentikasi** — registrasi, login, verifikasi (JWT access token + refresh token).
- **Konten Heritage** — CRUD news, articles, events, dan point of interest.
- **Temple Spatial Model** — graph nodes/edges candi, features, dan floor contours (GeoJSON).
- **Navigasi** — shortest path multi-level antar node/POI (termasuk transisi tangga antar lantai).
- **Visitor Data** — menerima data koordinat pengunjung, mengirimnya ke Hyperbase dan broker MQTT.

### Komponen Utama

| Lapisan        | Lokasi          | Fungsi                                                        |
| -------------- | --------------- | ------------------------------------------------------------- |
| Routes         | `src/routes`    | Definisi endpoint HTTP untuk `/v1` dan `/v2`                  |
| Controllers    | `src/controllers` | Orkestrasi request/response per modul                         |
| Repositories   | `src/repositories` | Akses data PostgreSQL (pg Pool)                              |
| Middlewares    | `src/middlewares` | Auth kondisional, upload file (multer)                        |
| Validators     | `src/validator` | Validasi input (express-validator)                            |
| Services       | `src/services`  | Logika bisnis lintas modul (mis. upload gambar ke Hyperbase)  |
| Config         | `src/config`    | Koneksi DB, logger, nodemailer, swagger                       |
| Worker         | `src/worker`    | Background task (login & refresh token Hyperbase)             |
| Utils          | `src/utils`     | Transaksi DB, klien MQTT (publish ke broker)                  |

### Integrasi Eksternal

- **PostgreSQL** — database aplikasi (users, konten, model spasial candi).
- **Hyperbase** — penyimpanan data pengunjung/IoT dan bucket gambar, diakses via REST API (autentikasi token).
- **MQTT** — publish payload data ke broker MQTT (lihat `src/utils/hyperbase.js`).

### Status Fitur

- **Implemented** — Authentication, content CRUD (news/articles/events/POI), temple spatial graph & features, navigation route, nearby POI, visitor data ke Hyperbase/MQTT.
- **Experimental** — floor correction (`/v2/temples/floor-correction`).
- **Planned** — unit & integration tests, caching (Redis), health check endpoint yang dedicated (saat ini belum ada route `/health`).

---

## Tech Stack

- **Node.js** (20+)
- **Express.js**
- **PostgreSQL** (`pg`)
- **Hyperbase** (REST API) & **MQTT** (`mqtt`)
- **JSON Web Token** (`jsonwebtoken`) & **bcrypt** (autentikasi)
- **Multer** & **Sharp** (upload & olah gambar)
- **Swagger** (`swagger-jsdoc`, `swagger-ui-express`)
- **Winston** (logger), **Nodemailer** (email verifikasi), **Helmet**, **CORS**, **Morgan**

---

## Project Structure

```
src/
├── server.js                     # Entry point aplikasi
├── config/
│   ├── db.js                     # Koneksi PostgreSQL
│   ├── logger.js                 # Logger (Winston)
│   ├── nodemailer.js             # Pengiriman email
│   └── swagger.js                # Setup Swagger UI (/api-docs)
├── controllers/
│   ├── v1/                       # Controller untuk API v1
│   │   ├── auth.controller.js
│   │   ├── news.controller.js
│   │   ├── articles.controller.js
│   │   ├── events.controller.js
│   │   ├── coordinate.controller.js
│   │   ├── nodes.controller.js
│   │   ├── edges.controller.js
│   │   ├── point_of_interest.controller.js
│   │   ├── provider.controller.js
│   │   └── temples.controller.js
│   └── v2/                       # Controller untuk API v2 (spatial/navigation)
│       ├── point_of_interest.controller.js
│       └── temples.controller.js
├── routes/
│   ├── v1/                       # Route untuk /v1
│   └── v2/                       # Route untuk /v2
├── repositories/                 # Akses data PostgreSQL
├── middlewares/                  # Auth & multer middleware
├── validator/                    # Validasi input
├── services/                     # Logika bisnis lintas modul
├── worker/                       # Background task (Hyperbase auth)
└── utils/                        # Transaksi DB & MQTT client
```

---

## Quick Start

### Prasyarat

- **Node.js** 20 atau lebih baru
- **npm**
- **PostgreSQL** yang berjalan

### 1. Clone & Install

```bash
git clone https://github.com/inamnurulf/borobudur-backend-service
cd borobudur-backend-service
npm install
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
```

Isi `.env` sesuai environment Anda. Variabel utama:

| Variable                 | Fungsi                                  |
| ------------------------ | --------------------------------------- |
| `DATABASE_URL`           | Connection string PostgreSQL            |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Koneksi PostgreSQL per bagian |
| `DB_SSL`                 | Set `true` jika koneksi butuh SSL       |
| `PORT`                   | Port server (default `3001`)            |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Kunci signing access/refresh token |
| `JWT_ACCESS_EXP` / `JWT_REFRESH_EXP_DAYS` | Durasi token (mis. `15m`, `30`) |
| `SWAGGER_SERVER_URL`     | Base URL untuk Swagger                  |
| `HYPERBASE_HOST`         | Base URL Hyperbase                      |
| `HYPERBASE_EMAIL` / `HYPERBASE_PASSWORD` | Kredensial login Hyperbase |
| `HYPERBASE_PROJECT_ID` / `HYPERBASE_COLLECTION_ID` | Target project & collection Hyperbase |
| `HYPERBASE_BUCKET_ID`    | Bucket gambar Hyperbase                 |
| `MQTT_BROKER_URL`        | URL broker MQTT                         |
| `MQTT_TOPIC`             | Topic publish MQTT                      |
| `GMAIL_USER` / `GMAIL_PASS` | Kredensial email verifikasi (Nodemailer) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth2 Google login (redirect URI dikirim client via body) |

Daftar lengkap beserta status mandatory/optional/secret tersedia di [`docs/deployment.md`](docs/deployment.md).

### 3. Siapkan Database

Buat database PostgreSQL lalu jalankan migration secara berurutan:

```bash
psql "$DATABASE_URL" -f migrations/001_nearby_features_schema.sql
psql "$DATABASE_URL" -f migrations/002_seed_poi_facilities.sql
psql "$DATABASE_URL" -f migrations/003_seed_temple_nodes_floor.sql
psql "$DATABASE_URL" -f migrations/004_create_temple_floor_contours.sql
psql "$DATABASE_URL" -f migrations/005_add_is_stairs_to_temple_edges.sql
```

### 4. Jalankan Server

**Development** (auto-reload):

```bash
npm run dev
```

**Production**:

```bash
node src/server.js
```

Server berjalan di `http://localhost:3001` (atau sesuai `PORT`).

### 5. Docker

```bash
docker build -t borobudur-backend .
docker run --env-file .env -p 3001:3001 borobudur-backend
```

> Pastikan `PORT=3001` di `.env` (aplikasi default ke `3001`). Dockerfile mengekspos port `3000`, sehingga set `PORT=3000` di `.env` juga valid asalkan mapping port disesuaikan.

### 6. Verifikasi

- Buka Swagger UI di `http://localhost:3001/api-docs` untuk daftar endpoint.
- Cek endpoint sederhana, mis. `GET /v1/news` atau `GET /v1/temples/graph`.

---

## API Routes

API tersedia dalam dua versi yang di-mount sebagai berikut:

- **v1** (`/v1`) — autentikasi, konten (news/articles/events), point-of-interest, nodes, edges, coordinate, provider, dan temples.
- **v2** (`/v2`) — point-of-interest dan temples (model spasial/navigasi), meliputi `temples/features/nearby-grouped`, `temples/navigation/route-3d`, dan `temples/floor-correction`.

Untuk daftar endpoint lengkap beserta request/response, lihat Swagger UI di `/api-docs`.
