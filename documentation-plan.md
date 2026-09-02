# Borobudur Backend Service --- Dokumentasi yang Perlu Dilengkapi

Repository: `borobudur-dteti/borobudur-backend-service`

## Tujuan Dokumentasi

Dokumentasi backend perlu memungkinkan developer atau peneliti lain
untuk:

-   memahami posisi backend dalam ekosistem Smart Tourism Borobudur;
-   menjalankan sistem pada environment lokal;
-   memahami API dan database;
-   mengembangkan fitur tanpa merusak kompatibilitas;
-   memahami dan mereproduksi model navigasi multi-level Borobudur;
-   memahami aliran data pengunjung menuju Hyperbase;
-   melakukan deployment, testing, dan maintenance sistem.

------------------------------------------------------------------------

## P0 --- Dokumentasi Prioritas Utama

### 1. Architecture Overview

README utama perlu menjelaskan tujuan backend dan hubungannya dengan
komponen lain.

``` text
Borobudur Mobile App
        |
        v
REST API (v1 / v2)
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
        +----------+----------+
        |                     |
        v                     v
   PostgreSQL             Hyperbase
 application DB       visitor / IoT data
```

Dokumentasikan:

-   fungsi backend;
-   hubungan dengan mobile application;
-   PostgreSQL;
-   Hyperbase;
-   MQTT;
-   komponen utama;
-   diagram arsitektur;
-   fitur implemented, experimental, dan planned.

------------------------------------------------------------------------

### 2. API v1 vs API v2

Perlu dibuat dokumentasi khusus yang menjelaskan evolusi API.

Saat ini secara konseptual:

``` text
/api/v1/
  auth
  news
  articles
  events
  coordinates
  nodes
  edges
  point-of-interest
  temples
  ...

/api/v2/
  point-of-interest
  temples
```

Dokumentasi perlu menjawab:

-   endpoint apa yang tersedia di v1;
-   endpoint apa yang tersedia di v2;
-   perbedaan request dan response;
-   alasan endpoint dipindahkan atau dikembangkan ke v2;
-   API mana yang digunakan mobile application saat ini;
-   backward compatibility;
-   status deprecation v1.

Contoh tabel:

  --------------------------------------------------------------------------
  Feature           API v1            API v2            Keterangan
  ----------------- ----------------- ----------------- --------------------
  Authentication    Ya                \-                Tetap menggunakan v1

  News              Ya                \-                

  Articles          Ya                \-                

  Events            Ya                \-                

  POI               Ya                Ya                V2 menggunakan model
                                                        terbaru

  Temple            Ya                Ya                V2 terkait
                                                        spatial/navigation
                                                        model

  Nodes / Edges     Ya                Perlu dijelaskan  Hubungan dengan
                                                        temple model perlu
                                                        didokumentasikan
  --------------------------------------------------------------------------

------------------------------------------------------------------------

### 3. Database Schema / ERD

Perlu tersedia ERD yang menjelaskan hubungan tabel utama.

Minimal mencakup:

``` text
users
roles
user_roles
refresh_tokens
verification_codes

articles
news
events
point_of_interest

temples
temple_nodes
temple_edges
temple_floor_contours
temple_features

coordinates
```

Khusus untuk navigasi Borobudur, dokumentasikan model seperti:

``` text
Temple
 |
 +-- Floor / Level
 |     |
 |     +-- Floor Contour
 |
 +-- Temple Node
 |     +-- latitude
 |     +-- longitude
 |     +-- floor
 |
 +-- Temple Edge
       +-- from_node
       +-- to_node
       +-- is_stairs
```

Untuk setiap tabel sebaiknya dijelaskan:

-   tujuan tabel;
-   primary key;
-   foreign key;
-   atribut penting;
-   constraint;
-   index;
-   hubungan dengan tabel lain.

------------------------------------------------------------------------

### 4. Multi-level Navigation Algorithm

Dokumentasi ini sangat penting karena merupakan salah satu fitur teknis
utama sistem.

Jelaskan:

-   bagaimana `temple_nodes` dibentuk;
-   bagaimana `temple_edges` dibentuk;
-   representasi floor/level;
-   fungsi `temple_floor_contours`;
-   bagaimana `is_stairs` digunakan;
-   bagaimana posisi pengguna dipetakan ke node;
-   bagaimana destination/POI dipetakan ke graph;
-   algoritma shortest path yang digunakan;
-   definisi bobot edge;
-   bagaimana perpindahan antar-level dilakukan;
-   bagaimana route dikirim kembali ke mobile application.

Contoh workflow:

``` text
GPS / User Position
        |
        v
Determine Temple / Floor
        |
        v
Find Nearest Navigable Node
        |
        v
Select Destination / POI
        |
        v
Construct / Query Navigation Graph
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
Mobile Application
```

Contoh representasi multi-level:

``` text
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

Dokumentasi ini juga dapat menjadi dasar bagian **System Design /
Implementation** pada publikasi ilmiah.

------------------------------------------------------------------------

### 5. Installation and Deployment

README perlu menyediakan prosedur reproduktif.

Contoh:

``` bash
git clone <repository>
cd borobudur-backend-service
npm install
cp .env.example .env
```

Kemudian jelaskan:

-   konfigurasi PostgreSQL;
-   pembuatan database;
-   menjalankan migration;
-   menjalankan development server;
-   menjalankan production server;
-   Docker build;
-   Docker run/deployment;
-   health check.

Deployment flow dapat didokumentasikan sebagai:

``` text
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
Health Check
```

------------------------------------------------------------------------

## P1 --- Dokumentasi Sangat Disarankan

### 6. Swagger / API Documentation

Swagger sudah menjadi bagian dari backend, sehingga seluruh endpoint
idealnya mempunyai:

-   endpoint URL;
-   HTTP method;
-   description;
-   authentication requirement;
-   path parameter;
-   query parameter;
-   request body;
-   response schema;
-   success example;
-   error responses.

Contoh:

``` text
GET /api/v2/temples/:id/nearby

Parameters:
- latitude
- longitude
- floor
- radius

Response:
{
  "poi": [...],
  "floor": 3
}
```

Dokumentasi Swagger harus dijadikan **single source of truth** untuk
kontrak komunikasi backend-mobile.

------------------------------------------------------------------------

### 7. Migration Guide

Tambahkan:

`migrations/README.md`

Jelaskan urutan perubahan database:

``` text
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

Untuk setiap migration jelaskan:

-   tujuan;
-   tabel yang berubah;
-   apakah schema migration atau seed data;
-   dependency terhadap migration sebelumnya;
-   cara menjalankan;
-   cara memeriksa keberhasilan;
-   rollback procedure jika tersedia.

Secara umum migration dapat berisi:

``` sql
CREATE TABLE ...
ALTER TABLE ...
CREATE INDEX ...
```

atau perubahan/seed data:

``` sql
INSERT INTO ...
UPDATE ...
```

------------------------------------------------------------------------

### 8. Visitor Data & Hyperbase

Dokumentasikan struktur data yang dikirim ke Hyperbase.

Minimal jelaskan apakah data mencakup:

``` text
visitor_id / hashed UUID
session_id
timestamp
latitude
longitude
floor
POI
location accuracy
device metadata
```

Selain schema data, jelaskan:

``` text
Mobile App
    |
    v
Backend API
    |
    v
Validation / anonymization
    |
    v
Hyperbase
    |
    v
Analytics / EDA / ML
```

Dokumentasi juga perlu mencakup:

-   sampling frequency;
-   mekanisme anonymous identifier;
-   kapan data dikirim;
-   buffering;
-   retry jika koneksi gagal;
-   duplicate handling;
-   retention;
-   privacy;
-   akses data untuk analitik.

------------------------------------------------------------------------

### 9. Environment Variables

`.env.example` sebaiknya disertai deskripsi.

Contoh:

  Variable                    Fungsi
  --------------------------- --------------------------
  `DATABASE_URL`              PostgreSQL connection
  `DB_HOST`                   PostgreSQL host
  `DB_PORT`                   PostgreSQL port
  `JWT_SECRET`                Signing access token
  `HYPERBASE_PROJECT_ID`      Hyperbase project
  `HYPERBASE_TOKEN_ID`        Hyperbase authentication
  `HYPERBASE_COLLECTION_ID`   Target collection
  `MQTT_BROKER_URL`           MQTT broker
  `MQTT_TOPIC`                MQTT topic

Jelaskan juga mana yang:

-   mandatory;
-   optional;
-   development only;
-   production only;
-   secret dan tidak boleh masuk Git.

------------------------------------------------------------------------

### 10. Testing Documentation

Dokumentasikan jenis pengujian:

-   unit testing;
-   repository/database testing;
-   API integration testing;
-   authentication testing;
-   migration testing;
-   navigation testing;
-   Hyperbase integration testing.

Khusus navigation, gunakan reproducible test cases.

Contoh:

``` text
Test: Inter-floor navigation

Start:
Level 1, Node A

Destination:
Level 3, POI X

Expected route:
Node A
 -> Node B
 -> Stair S1
 -> Level 2
 -> Node C
 -> Stair S2
 -> Level 3
 -> POI X
```

Test juga perlu mencakup:

-   destination pada floor yang sama;
-   destination berbeda floor;
-   nearest-node selection;
-   invalid coordinate;
-   unreachable destination;
-   stair transition;
-   POI discovery berdasarkan floor.

------------------------------------------------------------------------

## P2 --- Dokumentasi Maintenance

### 11. CONTRIBUTING.md

Dokumentasikan aturan pengembangan:

-   branch strategy;
-   commit convention;
-   pull-request process;
-   naming convention;
-   struktur controller;
-   struktur repository;
-   cara menambahkan endpoint;
-   cara menambahkan migration;
-   API versioning rules;
-   testing requirement.

Contoh flow fitur baru:

``` text
Feature Request
     |
     v
Database / Migration
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
Swagger
     |
     v
Tests
     |
     v
Pull Request
```

------------------------------------------------------------------------

### 12. CHANGELOG / Release Notes

Tambahkan `CHANGELOG.md`.

Contoh:

``` markdown
## v2.x

### Added
- Multi-level temple navigation
- Temple floor contours
- Stair-aware edges
- Nearby POI API

### Changed
- POI response structure

### Fixed
- ...

## v1.x

### Added
- Initial REST API
- Authentication
- News and articles
- Basic nodes and edges
```

Ini akan membantu menjelaskan alasan keberadaan API v1 dan v2.

------------------------------------------------------------------------

## Struktur Dokumentasi yang Disarankan

``` text
borobudur-backend-service/
|
+-- README.md
+-- CONTRIBUTING.md
+-- CHANGELOG.md
|
+-- docs/
|   |
|   +-- architecture.md
|   +-- database-schema.md
|   +-- api-versioning.md
|   +-- navigation.md
|   +-- hyperbase.md
|   +-- deployment.md
|   +-- testing.md
|   |
|   +-- diagrams/
|       +-- system-architecture.png
|       +-- erd.png
|       +-- navigation-graph.png
|       +-- data-flow.png
|
+-- migrations/
|   +-- README.md
|   +-- 001_...
|   +-- 002_...
|   +-- ...
|
+-- src/
```

------------------------------------------------------------------------

## Prioritas Implementasi Dokumentasi

### P0 --- Segera

1.  `README.md` --- Architecture Overview + Quick Start
2.  `docs/api-versioning.md` --- API v1 vs v2
3.  `docs/database-schema.md` --- ERD dan spatial schema
4.  `docs/navigation.md` --- multi-level navigation algorithm
5.  `docs/deployment.md` --- installation dan deployment

### P1 --- Berikutnya

6.  Lengkapi Swagger/OpenAPI
7.  `migrations/README.md`
8.  `docs/hyperbase.md`
9.  Environment-variable documentation
10. `docs/testing.md`

### P2 --- Maintenance

11. `CONTRIBUTING.md`
12. `CHANGELOG.md`

------------------------------------------------------------------------

## Dokumentasi yang Paling Penting untuk Publikasi

Untuk kebutuhan publikasi ilmiah proyek Smart Tourism Borobudur, tiga
dokumentasi teknis paling bernilai adalah:

### A. System Architecture

Menjelaskan hubungan:

``` text
Mobile Application
       |
       v
REST Backend
       |
 +-----+------+---------+
 |            |         |
 v            v         v
Content    Navigation  Visitor Data
 |            |         |
 v            v         v
PostgreSQL  Spatial   Hyperbase
            Graph
```

### B. Borobudur Spatial Data Model

Menjelaskan representasi domain:

``` text
Temple
  |
  +-- Floor
  |     +-- Floor Contour
  |
  +-- Nodes
  |
  +-- Edges
  |     +-- normal
  |     +-- stairs
  |
  +-- POIs / Features
```

### C. Multi-level Navigation Algorithm

Menjelaskan proses:

``` text
User Location
     |
     v
Level Detection
     |
     v
Nearest Node
     |
     v
Destination POI
     |
     v
Multi-level Graph Search
     |
     v
Stair-aware Route
     |
     v
Mobile Navigation
```

Ketiga dokumentasi tersebut dapat menjadi basis langsung untuk bagian
**System Architecture**, **Spatial Representation**, dan **Navigation
Implementation** pada paper Smart Tourism Borobudur.
