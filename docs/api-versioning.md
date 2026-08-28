# API Versioning (v1 vs v2)

Dokumen ini menjelaskan evolusi REST API Borobudur Backend Service, perbedaan antara API v1 dan v2, serta alasan keberadaan keduanya.

## Konteks

Backend pada awalnya hanya memiliki satu versi API (`v1`) yang mencakup autentikasi, konten heritage, dan CRUD dasar. Seiring berkembangnya kebutuhan *spatial model* dan *multi-level navigation* untuk Candi Borobudur, dikembangkan versi baru (`v2`) yang berfokus pada model spasial dan navigasi 3D.

Kedua versi tetap berjalan secara bersamaan (backward compatible) dan di-mount pada path yang berbeda:

- **v1** — `/v1/*`
- **v2** — `/v2/*`

> Catatan: path di-mount **tanpa** prefix `/api`. Yaitu `/v1/...` dan `/v2/...` (lihat `src/server.js`).

## Ringkasan Per Fitur

| Feature            | v1  | v2  | Keterangan                                        |
| ------------------ | :-: | :-: | ------------------------------------------------- |
| Authentication     | Ya  | —   | Tetap menggunakan v1                               |
| News               | Ya  | —   | —                                                  |
| Articles           | Ya  | —   | —                                                  |
| Events             | Ya  | —   | —                                                  |
| Nodes / Edges      | Ya  | —   | Graph dasar (non-temple), dipakai POI v1           |
| Point of Interest  | Ya  | Ya  | v2 menyederhanakan response nearby                 |
| Temple             | Ya  | Ya  | v2 fokus spatial/navigation (3D, floor-aware)      |
| Visitor Data       | Ya  | —   | `POST /v1/coordinate` → Hyperbase                  |

## Endpoint v1

### Auth — `/v1/auth`

| Method | Endpoint                    | Deskripsi                                   |
| ------ | --------------------------- | ------------------------------------------- |
| POST   | `/v1/auth/register`         | Registrasi pengguna baru                     |
| POST   | `/v1/auth/login`            | Login (email + password)                     |
| POST   | `/v1/auth/refresh-token`    | Rotate access token dengan refresh token     |
| POST   | `/v1/auth/logout`           | Logout (revoke refresh token)                |
| GET    | `/v1/auth/me`               | Profil pengguna saat ini                     |
| POST   | `/v1/auth/verify-email`     | Verifikasi email dengan kode                 |
| POST   | `/v1/auth/resend-verification` | Kirim ulang kode verifikasi              |
| POST   | `/v1/auth/forgot-password`  | Minta kode reset password                    |
| POST   | `/v1/auth/reset-password`   | Reset password dengan kode                   |

### Provider — `/v1/provider`

| Method | Endpoint              | Deskripsi                  |
| ------ | --------------------- | -------------------------- |
| POST   | `/v1/provider/google` | Login/registrasi via Google OAuth2 |

### Konten — News / Articles / Events

| Method | Endpoint                  | Deskripsi                              |
| ------ | ------------------------- | -------------------------------------- |
| GET    | `/v1/news`                | Daftar berita (paginated)              |
| GET    | `/v1/news/slug/:slug`     | Berita berdasarkan slug                |
| GET    | `/v1/news/:id`            | Berita berdasarkan id                  |
| POST   | `/v1/news`                | Buat berita (multipart, `headerImage`) |
| PUT    | `/v1/news/:id`            | Ubah berita                            |
| DELETE | `/v1/news/:id`            | Hapus berita                           |

`articles` dan `events` mengikuti pola yang sama dengan path `/v1/articles` dan `/v1/events` (GET `/`, GET `/slug/:slug`, GET `/:id`, POST `/`, PUT `/:id`, DELETE `/:id`).

### Spatial Dasar — Nodes / Edges / POI

| Method | Endpoint                              | Deskripsi                                  |
| ------ | ------------------------------------- | ------------------------------------------ |
| GET    | `/v1/nodes`                           | Daftar node                                |
| GET    | `/v1/nodes/:id`                       | Node by id                                 |
| POST   | `/v1/nodes`                           | Buat node (name, type, lat/lon)            |
| PUT    | `/v1/nodes/:id`                       | Ubah node                                  |
| DELETE | `/v1/nodes/:id`                       | Hapus node                                 |
| GET    | `/v1/edges`                           | Daftar edge                                |
| GET    | `/v1/edges/:id`                       | Edge by id                                 |
| GET    | `/v1/edges/path`                      | Shortest path (pgRouting) via `source` & `target` |
| POST   | `/v1/edges`                           | Buat edge                                  |
| PUT    | `/v1/edges/:id`                       | Ubah edge                                  |
| DELETE | `/v1/edges/:id`                       | Hapus edge                                 |
| GET    | `/v1/point-of-interest`               | Daftar POI (paginated)                     |
| POST   | `/v1/point-of-interest`               | Buat POI                                   |
| GET    | `/v1/point-of-interest/nearby`        | POI terdekat (lat, lon, radius, limit)     |
| GET    | `/v1/point-of-interest/:poiId/route`  | Shortest path dari posisi ke POI           |
| GET    | `/v1/point-of-interest/:id`           | POI by id                                  |
| PUT    | `/v1/point-of-interest/:id`           | Ubah POI                                   |
| DELETE | `/v1/point-of-interest/:id`           | Hapus POI                                  |

### Temples — `/v1/temples`

| Method | Endpoint                        | Deskripsi                              |
| ------ | ------------------------------- | -------------------------------------- |
| GET    | `/v1/temples/graph`             | Graph (nodes + edges) sebagai GeoJSON  |
| GET    | `/v1/temples/features`          | Daftar temple features (GeoJSON)       |
| GET    | `/v1/temples/features/nearest`  | Feature terdekat (lat, lon, radius)    |
| GET    | `/v1/temples/navigation/route`  | Route navigasi (fromLat/fromLon → toNodeId) |

### Visitor Data — `/v1/coordinate`

| Method | Endpoint          | Deskripsi                                   |
| ------ | ----------------- | ------------------------------------------- |
| POST   | `/v1/coordinate`  | Kirim koordinat pengunjung → disimpan di Hyperbase (ScyllaDB) |

---

## Endpoint v2

### Point of Interest — `/v2/point-of-interest`

| Method | Endpoint                       | Deskripsi                                  |
| ------ | ------------------------------ | ------------------------------------------ |
| GET    | `/v2/point-of-interest/nearby` | POI terdekat (response disederhanakan)     |

### Temples — `/v2/temples`

| Method | Endpoint                                | Deskripsi                                              |
| ------ | --------------------------------------- | ------------------------------------------------------ |
| GET    | `/v2/temples/graph`                     | Graph 3D (nodes + edges dengan Z/altitude) sebagai GeoJSON |
| GET    | `/v2/temples/features`                  | Daftar temple features (3D GeoJSON)                    |
| GET    | `/v2/temples/features/nearest`          | Feature terdekat (3D)                                  |
| GET    | `/v2/temples/features/nearby-grouped`   | Feature terdekat dikelompokkan per floor & zone        |
| GET    | `/v2/temples/navigation/route-3d`       | Route 3D (fromLat/fromLon → toNodeId)                  |
| GET    | `/v2/temples/navigation/route`          | Route floor-aware (fromLat/fromLon → toLat/toLon)      |
| POST   | `/v2/temples/floor-correction`          | Koreksi lantai berdasarkan longitude/latitude/altitude |

---

## Perbedaan Request & Response

### 1. POI `nearby`

**v1** — melempar error `404` jika tidak ada POI di sekitar:

```json
{
  "status": "error",
  "message": "No nearby POIs found"
}
```

**v2** — selalu sukses, mengembalikan struktur yang disederhanakan:

```json
{
  "status": "success",
  "message": "Nearby POIs fetched",
  "data": {
    "facilities": [
      {
        "id": 1,
        "name": "Museum Karmawibhangga",
        "type": "museum",
        "latitude": -7.6085,
        "longitude": 110.2025,
        "description": "..."
      }
    ]
  }
}
```

### 2. Temples `graph` (3D)

**v1** — GeoJSON tanpa koordinat Z; altitude disimpan di `properties`:

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [110.2, -7.6] },
  "properties": { "id": 1, "name": "NODE-1", "altitude_m": 3.2 }
}
```

**v2** — GeoJSON 3D; altitude disuntikkan ke koordinat Z (`[lon, lat, z]`):

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [110.2, -7.6, 3.2] },
  "properties": { "id": 1, "name": "NODE-1" }
}
```

### 3. Temples `navigation/route`

**v1** — `GET /v1/temples/navigation/route`

- Parameter: `fromLat`, `fromLon`, `toNodeId`, `profile`.
- Tujuan berupa node id (`toNodeId`).
- Menggunakan `edgesRepo.findRoute` (snap ke node terdekat / entry node).

**v2** — `GET /v2/temples/navigation/route`

- Parameter: `fromLat`, `fromLon`, `toLat`, `toLon`, `profile`.
- Tujuan berupa koordinat (`toLat`/`toLon`), dengan deteksi lantai otomatis.
- Menggunakan `edgesRepo.findRouteFloorAware`.

**v2** — `GET /v2/temples/navigation/route-3d`

- Parameter: `fromLat`, `fromLon`, `toNodeId`, `profile`.
- Sama seperti v1 `navigation/route` namun hasil geometri diubah menjadi 3D (Z diinterpolasi dari altitude node).

Response umum (dari `edgesRepo`) berbentuk:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "LineString", "coordinates": [[110.2, -7.6], [110.21, -7.61]] },
      "properties": {
        "distance_m": 45.2,
        "duration_s": 33,
        "profile": "walking",
        "segments": [
          { "edge_id": 10, "length_m": 20.1 },
          { "edge_id": 12, "length_m": 25.1 }
        ]
      }
    }
  ]
}
```

### 4. Temples `features/nearby-grouped` (khusus v2)

Mengelompokkan feature terdekat berdasarkan lantai dan zona:

```json
{
  "floor_detected": 3,
  "detected_areas": [
    {
      "zone_name": "Lantai 3 Zona A",
      "features": [
        {
          "id": 5,
          "type": "Feature",
          "geometry": { "type": "Point", "coordinates": [110.2, -7.6] },
          "properties": {
            "label": "Stupa Utama",
            "floor": 3,
            "radius": 5,
            "distance_m": 12.3,
            "cultural_site": { "name": "...", "description": "...", "image_url": "..." }
          }
        }
      ]
    }
  ]
}
```

---

## Penggunaan oleh Mobile Application

Aplikasi mobile Borobudur **menggunakan kedua versi API**:

- **v1** — untuk autentikasi dan konten (news, articles, events).
- **v2** — untuk **path finding / navigasi** dan fitur spasial (route 3D, nearby-grouped, floor-correction).

## Backward Compatibility & Deprecation

- **v1 tetap dipertahankan** dan tidak dihapus; perubahan di v2 bersifat aditif (menambah endpoint baru).
- **Belum ada status deprecation resmi** untuk endpoint v1.
- Karena path berbeda (`/v1` vs `/v2`), keduanya dapat berjalan berdampingan tanpa konflik.

## Catatan / Gap

- Kolom `type` pada `temple_edges` dirujuk oleh kode (`e.type` dan filter query `type` di `getGraph`), tetapi **tidak ada** di skema database (lihat `docs/database-schema.md`). Filter `type` pada endpoint temple graph dapat menyebabkan error SQL jika dipakai.
- Dokumentasi Swagger (`/api-docs`) masih menyebut beberapa path sebagai `/v1/temples/...` pada route v2 (copy-paste dari v1); path aktual mengikuti versi mount-nya.
