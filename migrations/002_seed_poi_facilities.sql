-- Seed POI facilities into production DB.
-- Uses CTEs to auto-generate node IDs and link POIs by name.
-- Safe to re-run: checks for existing data before inserting.
-- No hardcoded IDs — will not conflict with existing rows.

DO $$
BEGIN
  -- Guard: skip if facilities already seeded (check by name)
  IF EXISTS (SELECT 1 FROM nodes WHERE name = 'Pintu Masuk Utama') THEN
    RAISE NOTICE 'POI facilities already seeded — skipping.';
    RETURN;
  END IF;

  -- Insert nodes (auto-generated IDs) and capture them
  WITH inserted_nodes AS (
    INSERT INTO nodes (name, type, geom)
    VALUES
      ('Pintu Masuk Utama', 'entrance', ST_SetSRID(ST_MakePoint(110.2037, -7.6091), 4326)),
      ('Loket Tiket', 'ticket_booth', ST_SetSRID(ST_MakePoint(110.2038, -7.6093), 4326)),
      ('Toilet Area Utara', 'toilet', ST_SetSRID(ST_MakePoint(110.2035, -7.6070), 4326)),
      ('Toilet Area Selatan', 'toilet', ST_SetSRID(ST_MakePoint(110.2040, -7.6095), 4326)),
      ('Toilet Dekat Parkir', 'toilet', ST_SetSRID(ST_MakePoint(110.2033, -7.6098), 4326)),
      ('Museum Karmawibhangga', 'museum', ST_SetSRID(ST_MakePoint(110.2025, -7.6085), 4326)),
      ('Museum Samudraraksa', 'museum', ST_SetSRID(ST_MakePoint(110.2028, -7.6100), 4326)),
      ('Auditorium Borobudur', 'auditorium', ST_SetSRID(ST_MakePoint(110.2020, -7.6088), 4326)),
      ('Manohara Theater', 'theater', ST_SetSRID(ST_MakePoint(110.2018, -7.6095), 4326)),
      ('Resto Patio', 'restaurant', ST_SetSRID(ST_MakePoint(110.2042, -7.6092), 4326)),
      ('Cafe Gowes', 'cafe', ST_SetSRID(ST_MakePoint(110.2044, -7.6096), 4326)),
      ('Food Court', 'food_court', ST_SetSRID(ST_MakePoint(110.2036, -7.6097), 4326)),
      ('Toko Souvenir Utama', 'shop', ST_SetSRID(ST_MakePoint(110.2039, -7.6094), 4326)),
      ('Galeri Kerajinan', 'shop', ST_SetSRID(ST_MakePoint(110.2046, -7.6090), 4326)),
      ('Parkir Bus', 'parking', ST_SetSRID(ST_MakePoint(110.2032, -7.6102), 4326)),
      ('Parkir Mobil', 'parking', ST_SetSRID(ST_MakePoint(110.2036, -7.6100), 4326)),
      ('Parkir Motor', 'parking', ST_SetSRID(ST_MakePoint(110.2038, -7.6099), 4326)),
      ('Mushola Al-Hikmah', 'prayer_room', ST_SetSRID(ST_MakePoint(110.2034, -7.6093), 4326)),
      ('Pusat Informasi Wisata', 'information', ST_SetSRID(ST_MakePoint(110.2037, -7.6092), 4326)),
      ('Tourist Guide Post', 'information', ST_SetSRID(ST_MakePoint(110.2041, -7.6087), 4326)),
      ('Klinik Kesehatan', 'medical', ST_SetSRID(ST_MakePoint(110.2032, -7.6089), 4326)),
      ('Pos Keamanan', 'security', ST_SetSRID(ST_MakePoint(110.2041, -7.6091), 4326)),
      ('Taman Lumbini', 'park', ST_SetSRID(ST_MakePoint(110.2025, -7.6105), 4326)),
      ('Area Foto Spot', 'photo_spot', ST_SetSRID(ST_MakePoint(110.2043, -7.6082), 4326)),
      ('Manohara Hotel', 'hotel', ST_SetSRID(ST_MakePoint(110.2050, -7.6095), 4326)),
      ('ATM Center', 'atm', ST_SetSRID(ST_MakePoint(110.2035, -7.6094), 4326)),
      ('Bike Rental', 'rental', ST_SetSRID(ST_MakePoint(110.2041, -7.6096), 4326)),
      ('Pintu Akses Masuk Candi', 'entrance', ST_SetSRID(ST_MakePoint(110.204449199786, -7.6079520369167275), 4326))
    RETURNING id, name
  )
  INSERT INTO points_of_interest (node_id, description)
  SELECT n.id, d.description
  FROM inserted_nodes n
  JOIN (
    VALUES
      ('Pintu Masuk Utama', 'Pintu masuk utama kompleks Candi Borobudur'),
      ('Loket Tiket', 'Tempat pembelian tiket masuk'),
      ('Toilet Area Utara', 'Fasilitas toilet di area utara'),
      ('Toilet Area Selatan', 'Fasilitas toilet di area selatan'),
      ('Toilet Dekat Parkir', 'Fasilitas toilet dekat area parkir'),
      ('Museum Karmawibhangga', 'Museum yang menyimpan foto-foto relief Karmawibhangga'),
      ('Museum Samudraraksa', 'Museum kapal Samudraraksa yang berlayar ke Afrika'),
      ('Auditorium Borobudur', 'Auditorium untuk pertunjukan dan presentasi'),
      ('Manohara Theater', 'Theater multimedia tentang sejarah Borobudur'),
      ('Resto Patio', 'Restoran dengan pemandangan candi'),
      ('Cafe Gowes', 'Kafe dengan menu ringan dan minuman'),
      ('Food Court', 'Area food court dengan berbagai pilihan makanan'),
      ('Toko Souvenir Utama', 'Toko souvenir dan oleh-oleh khas Borobudur'),
      ('Galeri Kerajinan', 'Galeri kerajinan lokal dan seni'),
      ('Parkir Bus', 'Area parkir khusus bus wisata'),
      ('Parkir Mobil', 'Area parkir kendaraan mobil'),
      ('Parkir Motor', 'Area parkir sepeda motor'),
      ('Mushola Al-Hikmah', 'Mushola untuk ibadah umat muslim'),
      ('Pusat Informasi Wisata', 'Pusat informasi dan panduan wisata'),
      ('Tourist Guide Post', 'Pos pemandu wisata'),
      ('Klinik Kesehatan', 'Klinik kesehatan dan P3K'),
      ('Pos Keamanan', 'Pos keamanan dan petugas'),
      ('Taman Lumbini', 'Taman dengan berbagai stupa mini'),
      ('Area Foto Spot', 'Lokasi foto dengan pemandangan terbaik'),
      ('Manohara Hotel', 'Hotel terdekat dengan akses sunrise'),
      ('ATM Center', 'Anjungan tunai mandiri'),
      ('Bike Rental', 'Rental sepeda untuk berkeliling area'),
      ('Pintu Akses Masuk Candi', 'Pintu akses untuk masuk ke area candi utama')
  ) AS d(name, description) ON n.name = d.name;

  RAISE NOTICE 'POI facilities seeded successfully.';
END
$$;
