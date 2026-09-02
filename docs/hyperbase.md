# Visitor Data & Hyperbase

Dokumen ini menjelaskan aliran data pengunjung dari aplikasi mobile hingga tersimpan di **Hyperbase** (Backend-as-a-Service berbasis **ScyllaDB**), termasuk skema data, mekanisme autentikasi, serta aspek privacy dan retensi.

## Aliran Data

```text
Mobile App
    |
    v
Backend API (POST /v1/coordinate)
    |
    v
Validation (express-validator) + Hyperbase token
    |
    v
Hyperbase (ScyllaDB collection "coordinate data")
    |
    v
Analytics / EDA / ML
```

Data koordinat pengunjung **tidak disimpan di PostgreSQL**, melainkan dikirim ke Hyperbase melalui REST API. Detail struktur collection tersedia di `docs/database-schema.md` bagian 6.

## Collection "coordinate data"

| Properti             | Nilai                                      |
| -------------------- | ------------------------------------------ |
| Project ID           | `01999716-74a3-7381-b727-6b3296a254cf`     |
| Collection ID        | `01999717-f4d5-7ed3-b511-efc297b4ca94`     |
| Nama collection      | `coordinate data`                          |
| `opt_auth_column_id` | `false`                                    |
| `opt_ttl`            | `null` (tanpa TTL)                         |
| Tabel fisik ScyllaDB | `records_01999717f4d57ed3b511efc297b4ca94` |

### Schema fields

| Field        | Tipe   | required | indexed | unique | hashed | auth_column |
| ------------ | ------ | -------- | ------- | ------ | ------ | ----------- |
| `client_id`  | string | false    | false   | false  | false  | false       |
| `latitude`   | double | false    | false   | false  | false  | false       |
| `longitude`  | double | false    | false   | false  | false  | false       |
| `floor`      | int    | false    | false   | false  | false  | false       |
| `altitude_m` | double | false    | false   | false  | false  | false       |

### System fields (dikelola Hyperbase)

- `_id` — UUIDv7 (identitas record)
- `_collection_id` — ID collection pemilik record
- `_created_by` — ID user/service pembuat record
- `_created_at`, `_updated_at` — timestamp

## Autentikasi Hyperbase

Backend mengakses Hyperbase menggunakan **token** yang diperoleh dari login password-based:

1. Login: `POST {HYPERBASE_HOST}/api/rest/auth/password-based` dengan body `{ email, password }`.
2. Respons berisi token pada `data.token`.
3. Token disimpan di memori dan di-refresh setiap **24 jam** oleh worker `src/worker/hyperbaseAuthWorker.js`.

> Token **tidak disimpan ke `.env` atau Git**; hanya ada di memori proses (`HYPERBASE_AUTH_TOKEN`).

## Aliran Data Backend

1. Mobile mengirim `POST /v1/coordinate` dengan body `{ client_id, latitude, longitude, floor, altitude_m }`.
2. Validasi input dilakukan oleh `src/validator/coordinate.js` (express-validator).
3. `src/controllers/v1/coordinate.controller.js` meneruskan payload sebagai record ke:

   ```
   POST {HYPERBASE_HOST}/api/rest/project/{project_id}/collection/{collection_id}/record
   ```

   dengan header `Authorization: Bearer {token}`.

4. Hyperbase menyimpan record ke tabel `records_{collection_id}` dan mengembalikan record hasil.

## Catatan / Gap

1. **MQTT tidak aktif (dead code)** — `src/utils/hyperbase.js` mendefinisikan `sendToBroker` (publish MQTT) tetapi **tidak pernah dipanggil** dari controller manapun. Impor `sendMessage` pada `src/routes/v1/coordinate.routes.js` juga tidak didefinisikan di `coordinate.controller.js`. Saat ini data pengunjung **hanya** dikirim ke Hyperbase, tidak ke broker MQTT. (Klaim MQTT di README perlu ditinjau ulang.)
2. **Tanpa index** — tidak ada satu pun schema field yang di-index; query berbasis `client_id`/`floor` akan memindai seluruh records.
3. **Semua field `required: false`** — Hyperbase menerima record walau sebagian field kosong.
4. **`client_id` plain string** — belum ada identitas anonim yang konsisten/hashed; perlu evaluasi dari sisi privasi sebelum data dipakai untuk analitik publik.
