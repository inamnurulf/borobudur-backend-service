# Environment Variables

Dokumen ini adalah referensi lengkap seluruh environment variable yang dibaca oleh Borobudur Backend Service. Daftar ini juga tercantum (dengan contoh nilai) di `.env.example`.

## Cara Menggunakan

```bash
cp .env.example .env
```

Isi `.env` sesuai environment Anda. Variabel dibaca lewat `dotenv` (`dotenv.config()` di `src/server.js`).

## Kategori

- **Mandatory** — wajib diisi, aplikasi tidak berjalan/berfungsi penuh tanpa variabel ini.
- **Optional** — memiliki nilai default atau hanya diperlukan untuk fitur tertentu.
- **Secret** — nilai rahasia, **wajib tidak masuk ke Git** (`.env` tercantum di `.gitignore`).
- **Lingkungan** — cakupan pemakaian: umum (semua), development, atau production.

## Tabel Variabel

### Server

| Variable  | Fungsi                              | Kategori | Lingkungan | Secret |
| --------- | ----------------------------------- | -------- | ---------- | ------ |
| `PORT`    | Port server berjalan                 | Optional | Umum       | Tidak  |
| `NODE_ENV`| Mode environment (`development`/`production`) | Optional | Production | Tidak  |

### Database (PostgreSQL)

| Variable       | Fungsi                                     | Kategori  | Lingkungan | Secret |
| -------------- | ------------------------------------------ | --------- | ---------- | ------ |
| `DATABASE_URL` | Connection string PostgreSQL               | Optional* | Umum       | **Ya** |
| `DB_HOST`      | Host PostgreSQL                            | Mandatory | Umum       | Tidak  |
| `DB_PORT`      | Port PostgreSQL (default `5432`)           | Mandatory | Umum       | Tidak  |
| `DB_USER`      | User PostgreSQL                            | Mandatory | Umum       | Tidak  |
| `DB_PASSWORD`  | Password PostgreSQL                        | Mandatory | Umum       | **Ya** |
| `DB_NAME`      | Nama database                              | Mandatory | Umum       | Tidak  |
| `DB_SSL`       | `true` jika koneksi butuh SSL              | Optional  | Umum       | Tidak  |

\* `DATABASE_URL` adalah alternatif dari kumpulan `DB_*`; salah satu harus tersedia.

### JWT Authentication

| Variable              | Fungsi                              | Kategori  | Lingkungan | Secret |
| --------------------- | ----------------------------------- | --------- | ---------- | ------ |
| `JWT_SECRET`          | Kunci signing access token          | Mandatory | Umum       | **Ya** |
| `JWT_REFRESH_SECRET`  | Kunci signing refresh token         | Mandatory | Umum       | **Ya** |
| `JWT_ACCESS_EXP`      | Durasi access token (default `15m`) | Optional  | Umum       | Tidak  |
| `JWT_REFRESH_EXP_DAYS`| Durasi refresh token dalam hari (default `30`) | Optional | Umum | Tidak |

### Swagger

| Variable             | Fungsi                                   | Kategori | Lingkungan | Secret |
| -------------------- | ---------------------------------------- | -------- | ---------- | ------ |
| `SWAGGER_SERVER_URL` | Base URL server untuk Swagger UI         | Optional | Umum       | Tidak  |

### Hyperbase (BaaS / ScyllaDB)

| Variable                  | Fungsi                                       | Kategori  | Lingkungan | Secret |
| ------------------------- | -------------------------------------------- | --------- | ---------- | ------ |
| `HYPERBASE_HOST`          | Base URL Hyperbase                           | Mandatory | Umum       | Tidak  |
| `HYPERBASE_EMAIL`         | Email login Hyperbase (untuk auth token)     | Mandatory | Umum       | **Ya** |
| `HYPERBASE_PASSWORD`      | Password login Hyperbase                     | Mandatory | Umum       | **Ya** |
| `HYPERBASE_PROJECT_ID`    | Project Hyperbase target                     | Mandatory | Umum       | Tidak  |
| `HYPERBASE_COLLECTION_ID` | Collection Hyperbase (visitor data)          | Mandatory | Umum       | Tidak  |
| `HYPERBASE_BUCKET_ID`     | Bucket gambar Hyperbase                      | Optional  | Umum       | Tidak  |

### MQTT

| Variable          | Fungsi                     | Kategori | Lingkungan | Secret |
| ----------------- | -------------------------- | -------- | ---------- | ------ |
| `MQTT_BROKER_URL` | URL broker MQTT            | Optional | Umum       | Tidak  |
| `MQTT_TOPIC`      | Topic publish MQTT         | Optional | Umum       | Tidak  |

> **Catatan**: saat ini kode MQTT (`src/utils/hyperbase.js`) **belum dipanggil** dari controller manapun (dead code). Variabel ini disediakan untuk integrasi MQTT yang direncanakan.

### Email (Nodemailer)

| Variable     | Fungsi                                  | Kategori | Lingkungan | Secret |
| ------------ | --------------------------------------- | -------- | ---------- | ------ |
| `GMAIL_USER` | Email pengirim verifikasi               | Optional | Umum       | **Ya** |
| `GMAIL_PASS` | App password Gmail                      | Optional | Umum       | **Ya** |

### Google OAuth2 (Login provider)

| Variable              | Fungsi                                                        | Kategori | Lingkungan | Secret |
| --------------------- | ------------------------------------------------------------- | -------- | ---------- | ------ |
| `GOOGLE_CLIENT_ID`    | Client ID OAuth2 Google                                       | Optional | Umum       | Tidak  |
| `GOOGLE_CLIENT_SECRET`| Client secret OAuth2 Google                                   | Optional | Umum       | **Ya** |

> `redirect_uri` Google **tidak di-set di server**; dikirim oleh client melalui request body (`POST /v1/provider/google`).

## Aturan Keamanan

- Variabel bertanda **Secret** (JWT, password DB, kredensial Hyperbase/Gmail/Google) **wajib tidak dikomit ke Git**.
- Gunakan `.env` lokal (tercantum di `.gitignore`) untuk nilai sebenarnya; `.env.example` hanya berisi placeholder.
- Pada production, kelola secret melalui secret manager atau environment variable platform (bukan file di container image).
