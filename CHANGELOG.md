# Changelog

Semua perubahan penting pada proyek ini dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/) dan [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **REST API dasar** — setup Express dengan `helmet`, `cors`, `morgan`, logging (`winston`), dan dokumentasi Swagger UI (`/api-docs`).
- **Autentikasi** — registrasi, login, logout, refresh token, `GET /auth/me`, aktivasi akun, lupa/reset password, verifikasi email & kirim ulang kode, serta login provider Google OAuth2.
- **Konten heritage** — CRUD `news`, `articles`, dan `events`, termasuk upload & olah gambar (`multer` + `sharp`), parsing metadata SEO, dan penghitung views.
- **Point of Interest** — CRUD POI, pencarian POI terdekat (`nearby`), dan shortest path menuju POI.
- **Graph dasar (nodes/edges)** — CRUD node & edge serta shortest path berbasis pgRouting.
- **Temples** — manajemen temples, graph (nodes + edges) sebagai GeoJSON, daftar/terdekat feature, dan navigasi.
- **API v2 (spatial/navigation)** — endpoint POI `nearby` dengan respons yang disederhanakan, temple graph 3D (Z pada geometry), `features/nearby-grouped`, route floor-aware, `navigation/route-3d`, dan `floor-correction`.
- **Visitor data → Hyperbase** — endpoint `POST /v1/coordinate` untuk mengirim koordinat pengunjung ke Hyperbase (ScyllaDB), termasuk kolom `floor` dan `altitude_m`.
- **Skrip migration** — schema `nearby features`, seed POI facilities, pengisian kolom `floor` pada temple nodes, pembuatan `temple_floor_contours`, dan kolom `is_stairs` pada temple edges.
- **Navigasi sadar tangga** — edge tangga diberi bobot (cost ×5) pada path finding.
- **Dokumentasi** — `README` (arsitektur & quick start), `docs/api-versioning.md`, `docs/database-schema.md`, `docs/navigation.md`, `docs/hyperbase.md`, `docs/deployment.md`, `docs/environment-variables.md`, `migrations/README.md`, diagram ERD, serta pelengkapan JSDoc Swagger.

### Changed

- **Refactor autentikasi** — autentikasi kondisional diterapkan global (`app.use`) dengan whitelist route publik.
- **Respons POI v2** — respons `nearby` disederhanakan menjadi `{ facilities: [...] }` dan tidak lagi melempar `404` saat kosong.
- **Dockerfile** — penyesuaian untuk build & runtime.

### Fixed

- **Sistem refresh token** — perbaikan alur rotasi/penyimpanan refresh token.
- **Dependency MQTT** — perbaikan package MQTT.
- **Dockerfile** — perbaikan konfigurasi image.
