# Multi-level Navigation Algorithm

Dokumen ini menjelaskan algoritma navigasi multi-level Candi Borobudur: bagaimana graph dibentuk, bagaimana posisi pengguna dipetakan ke graph, bagaimana rute shortest path dihitung (termasuk transisi antar lantai melalui tangga), dan bagaimana hasilnya dikirim ke aplikasi mobile.

## 1. Konsep Graph Multi-level

Sistem navigasi merepresentasikan Candi Borobudur sebagai **graph multi-level** (multi-floor):

- **Node** (`temple_nodes`) = titik navigasi (persimpangan, pintu, titik tangga, dll).
- **Edge** (`temple_edges`) = jalur yang menghubungkan dua node.
- **Floor/Level** = lantai candi (1..8), diwakili oleh kolom `floor` pada node dan poligon `temple_floor_contours`.
- **Tangga** = edge lintas lantai, ditandai `is_stairs = true`.

```
Level 3
   o-----o----- Destination
         |
       stairs
         |
Level 2
   o-----o-----o
         |
       stairs
         |
Level 1
  Start---o-----o
```

## 2. Pembentukan `temple_nodes`

`temple_nodes` adalah vertex graph. Kolom penting:

| Kolom        | Fungsi                                             |
| ------------ | -------------------------------------------------- |
| `geom`       | Posisi (POINT, SRID 4326)                          |
| `altitude_m` | Ketinggian dalam meter (dipakai untuk Z/3D)        |
| `floor`      | Nomor lantai (1..8)                                |
| `zone`       | Nama zona di dalam lantai                          |

Nilai `floor` diisi melalui migration `003_seed_temple_nodes_floor.sql` dengan aturan:

| Pola nama node      | floor |
| ------------------- | ----- |
| `LANTAI n`          | n     |
| `DASAR_STUPA*`      | 5     |
| `STUPA1*`           | 6     |
| `STUPA2*`           | 7     |
| `STUPA3*`           | 8     |

Migration menjamin **tidak ada node dengan `floor` NULL** (gagal jika masih ada).

## 3. Pembentukan `temple_edges`

`temple_edges` adalah edge graph. Kolom penting: `source`, `target`, `cost`, `reverse_cost`, `geom`, `is_stairs`.

Nilai `is_stairs` diisi otomatis melalui migration `005_add_is_stairs_to_temple_edges.sql`: sebuah edge dianggap **tangga** jika node asal dan tujuan berada di lantai berbeda:

```sql
UPDATE temple_edges e
SET is_stairs = true
FROM temple_nodes ns, temple_nodes nt
WHERE e.source = ns.id
  AND e.target = nt.id
  AND ns.floor != nt.floor;
```

> **Catatan**: skema `temple_edges` **tidak memiliki kolom `type`** (lihat `docs/database-schema.md`). Kolom `type` hanya ada di `temple_features`.

## 4. Representasi Floor dan `temple_floor_contours`

`temple_floor_contours` menyimpan **poligon batas tiap lantai** (`geom` POLYGON 4326, `floor` unik, `altitude_m`).

Fungsi utamanya:
- **Deteksi lantai** dari posisi pengguna menggunakan `ST_Contains`.
- **Koreksi lantai** (`floor-correction`): mencocokkan altitude pengguna ke kontur terdekat.

## 5. Workflow Navigasi

```
GPS / User Position
        |
        v
Determine Temple / Floor      (ST_Contains pada temple_floor_contours)
        |
        v
Find Nearest Navigable Node   (snap ke node terdekat / ENTRY fallback)
        |
        v
Select Destination / POI      (toNodeId | toFeaturesId -> node_id)
        |
        v
Construct / Query Graph       (pgRouting: pgr_dijkstra)
        |
        v
Shortest Path
        |
        +-- normal edge
        |
        +-- stairs -> floor transition
        |
        v
Ordered Navigation Nodes
        |
        v
Mobile Application (GeoJSON)
```

## 6. Pemetaan Posisi Pengguna ke Node

Pengguna memberikan koordinat (`latitude`, `longitude`) — belum tentu tepat di atas node. Proses mapping (lihat `src/repositories/temple_edges.repository.js`):

1. **Deteksi lantai** (floor-aware route) via `ST_Contains(geom_contour, point)`.
2. **Cari node terdekat** (`getNearestNodeInfo`) pada lantai tersebut, diurutkan dengan operator `<->` (KNN).
3. Jika jarak node terdekat **≤ 4 meter** (`ENTRY_DISTANCE_THRESHOLD_M`), gunakan node itu.
4. Jika lebih jauh, **fallback ke node "ENTRY"** (`getNearestEntryNodeInfo`, pola nama `^ENTRY...`), lalu node terdekat.

## 7. Pemetaan Destination / POI ke Graph

Destination dapat berupa:

- `toNodeId` — langsung node tujuan.
- `toFeaturesId` — id `temple_features`, di-resolve ke `node_id` terkait.
- `toLat`/`toLon` (floor-aware route) — di-snap ke node terdekat pada lantai yang terdeteksi.

## 8. Algoritma Shortest Path (pgRouting)

Rute dihitung menggunakan **`pgr_dijkstra`** (`src/repositories/temple_edges.repository.js`):

```sql
SELECT * FROM pgr_dijkstra(
  'SELECT id, source, target,
          CASE WHEN is_stairs THEN cost * 5 ELSE cost END AS cost,
          CASE WHEN is_stairs THEN COALESCE(reverse_cost, cost) * 5
               ELSE COALESCE(reverse_cost, cost) END AS reverse_cost
   FROM temple_edges',
  $1::int, $2::int, true
)
```

Kemudian edge-edge hasil dirangkai (`ST_Union` → `ST_LineMerge`) menjadi satu LineString.

## 9. Definisi Bobot Edge

- `cost` / `reverse_cost` adalah bobot dasar edge.
- **Penalti tangga**: edge dengan `is_stairs = true` dikalikan **5×** (`cost * 5`). Ini membuat algoritma *menghindari* tangga kecuali memang diperlukan untuk pindah lantai.
- **Estimasi durasi** dihitung dari jarak dan profil kecepatan (`secondsFromMeters`):

| Profile      | Kecepatan (m/s) |
| ------------ | --------------- |
| `walking`    | 1.35            |
| `wheelchair` | 1.1             |
| `guided`     | 1.2             |
| default      | 1.3             |

`duration_s = round(distance_m / speed)`.

## 10. Perpindahan Antar-level

Perpindahan antar lantai terjadi **hanya melalui edge tangga** (`is_stairs = true`), yaitu edge yang menghubungkan dua node dengan `floor` berbeda. Karena edge tangga diberi penalti 5×, rute akan memilih tangga terdekat/seperlunya untuk berpindah lantai, lalu melanjutkan di lantai tujuan.

## 11. Response ke Mobile Application

Rute dikembalikan sebagai **GeoJSON FeatureCollection**:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[110.2, -7.6], [110.21, -7.61]]
      },
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

Pada endpoint **3D** (`/v2/temples/navigation/route-3d` dan `/v2/temples/graph`), koordinat Z (ketinggian) disuntikkan ke geometri. Untuk LineString, Z **diinterpolasi** antara `zStart` dan `zEnd` (altitude node sumber & tujuan) — lihat `to3DGeometry` di `src/controllers/v2/temples.controller.js`.

## 12. Pseudo-code Ringkas

```
resolveStart(lon, lat):
    floor = detectFloor(lon, lat)
    node  = nearestNode(lon, lat, floor)
    if distance(node) <= 4m: return node
    return nearestEntryNode(lon, lat, floor) or node

resolveDest(to):
    if to is featureId: return feature.node_id
    if to is nodeId:    return to

route = pgr_dijkstra(edges with stairs penalty, start, dest)
return GeoJSON(merged edges, distance_m, duration_s, segments)
```

## 13. Referensi File

| Komponen                | File                                              |
| ----------------------- | ------------------------------------------------- |
| Route & snapping logic  | `src/repositories/temple_edges.repository.js`     |
| Controller (v1)         | `src/controllers/v1/temples.controller.js`        |
| Controller (v2, 3D)     | `src/controllers/v2/temples.controller.js`        |
| Floor contour repo      | `src/repositories/temple_floor_contours.repository.js` |
| Migration floor         | `migrations/003_seed_temple_nodes_floor.sql`      |
| Migration is_stairs     | `migrations/005_add_is_stairs_to_temple_edges.sql` |
