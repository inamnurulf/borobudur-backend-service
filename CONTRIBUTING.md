# Contributing

Panduan kontribusi untuk **Borobudur Backend Service**. Ikuti konvensi di bawah agar perubahan mudah ditinjau dan menjaga konsistensi antar fitur.

## Bahasa

- **Code & komentar code (termasuk JSDoc/Swagger)** — ditulis dalam **Bahasa Inggris**.
- **Dokumentasi** (`README.md`, `docs/`, `migrations/README.md`, dll.) — ditulis dalam **Bahasa Indonesia**.

## Branch Strategy

- Trunk utama adalah `master`.
- Buat branch fitur dari `master` dengan pola `feat/<nama>` untuk fitur baru dan `fix/<nama>` untuk perbaikan.
- Contoh: `feat/init-bolofind`, `feat/forgot-password`.
- Gabungkan perubahan melalui **Pull Request** ke `master`.

## Commit Convention

Gunakan [Conventional Commits](https://www.conventionalcommits.org/). Awali pesan commit dengan tipe, diikuti deskripsi singkat (huruf kecil, imperatif).

| Tipe       | Penggunaan                                        |
| ---------- | ------------------------------------------------- |
| `feat`     | Fitur baru                                        |
| `fix`      | Perbaikan bug                                     |
| `refactor` | Perubahan struktur tanpa mengubah perilaku        |
| `docs`     | Perubahan dokumentasi                             |
| `chore`    | Pemeliharaan (dependency, konfigurasi, dll.)      |
| `perf`     | Peningkatan performa                              |
| `test`     | Perubahan/penambahan test                         |

Contoh:

```
feat: implement articles management with CRUD operations
fix: refresh token system
refactor: conditional auth on app.use
docs: add comprehensive backend service documentation
```

> Catatan: sebagian commit lama masih memakai prefix `add:`. Mulai sekarang gunakan `feat:` untuk fitur baru.

## Pull Request Process

1. Buat branch dari `master` sesuai konvensi di atas.
2. Kerjakan perubahan, lalu commit secara granular.
3. Pastikan aplikasi masih dapat dijalankan (`npm run dev`) dan file yang diubah lolos pemeriksaan sintaks (`node --check <file>`).
4. Perbarui dokumentasi yang relevan bila berubah kontrak API atau skema database.
5. Buka Pull Request ke `master` dengan deskripsi yang menjelaskan *apa* dan *mengapa*.

> **Belum ada CI.** Repo ini belum memiliki konfigurasi `.github/` (tanpa workflow/action), sehingga tidak ada pengecekan otomatis pada PR.

## Struktur Proyek

```
src/
├── server.js                     # Entry point aplikasi
├── config/                       # Koneksi DB, logger, nodemailer, swagger
├── controllers/
│   ├── v1/                       # Controller API v1
│   └── v2/                       # Controller API v2 (spatial/navigation)
├── routes/
│   ├── v1/                       # Route /v1
│   └── v2/                       # Route /v2
├── repositories/                 # Akses data PostgreSQL
├── middlewares/                  # Auth kondisional, upload file (multer)
├── validator/                    # Validasi input (express-validator)
├── services/                     # Logika bisnis lintas modul
├── worker/                       # Background task (Hyperbase auth)
└── utils/                        # Transaksi DB & klien MQTT
```

Alur request: `Route` → `Validator` → `Controller` → `Repository` → PostgreSQL/Hyperbase.

## Menambahkan Endpoint Baru

Ikuti urutan berikut (lihat juga `documentation-plan.md`):

```text
Database / Migration (jika perlu)
     |
     v
Repository
     |
     v
Controller
     |
     v
Validator
     |
     v
Route
     |
     v
Swagger (JSDoc)
```

1. **Repository** — tambahkan method akses data di `src/repositories/`.
2. **Controller** — tambahkan handler di `src/controllers/v1/` atau `v2/`.
3. **Validator** — tambahkan `case` pada file validator terkait di `src/validator/`.
4. **Route** — daftarkan endpoint di `src/routes/v1/` atau `v2/`.
5. **Swagger** — tambahkan blok `@swagger` di atas route (Bahasa Inggris) agar endpoint muncul di `/api-docs`.

## Menambahkan Migration

1. Buat file baru di `migrations/` dengan nama `NNN_deskripsi.sql` (prefix 3 digit berurutan).
2. Tentukan jenis: **schema** (CREATE/ALTER/INDEX) atau **seed** (INSERT/UPDATE).
3. Usahakan **idempotent** (gunakan `IF NOT EXISTS`, guard `DO $$`, atau `BEGIN ... COMMIT`).
4. Perbarui `migrations/README.md`.

Detail lengkap (urutan, dependency, rollback) tersedia di [`migrations/README.md`](migrations/README.md).

## Aturan Versioning API

- **v1** (`/v1`) — autentikasi dan konten (news, articles, events, POI dasar, nodes, edges, coordinate). Pertahankan **stabil**; perubahan bersifat aditif/backward-compatible.
- **v2** (`/v2`) — model spasial & navigasi (nearby-grouped, 3D GeoJSON, route floor-aware, floor-correction).
- Path di-mount **tanpa** prefix `/api` (lihat `src/server.js`).
- Fitur baru yang bersifat spatial/navigation masuk ke **v2**; fitur konten/autentikasi tetap di **v1**.

## Testing

> **Saat ini belum ada test suite.** Script `npm test` masih placeholder (`"Error: no test specified"`), dan belum ada framework/test file.

Yang dapat dilakukan sekarang untuk memverifikasi perubahan:

- Pemeriksaan sintaks per file: `node --check src/<path>/<file>.js`
- Menjalankan server: `npm run dev`, lalu cek endpoint via Swagger UI (`/api-docs`) atau HTTP client.

Bila menambahkan test di masa mendatang, gunakan struktur test yang mencerminkan modul (unit, integrasi repository/API, navigasi, integrasi Hyperbase) — tetapi belum ada konvensi baku yang ditetapkan di repo ini.
