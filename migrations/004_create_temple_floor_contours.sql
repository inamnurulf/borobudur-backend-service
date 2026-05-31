BEGIN;

CREATE TABLE IF NOT EXISTS temple_floor_contours (
  id SERIAL PRIMARY KEY,
  floor INTEGER NOT NULL UNIQUE,
  altitude_m DOUBLE PRECISION NOT NULL,
  name VARCHAR(100),
  geom geometry(Polygon, 4326) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temple_floor_contours_floor ON temple_floor_contours(floor);
CREATE INDEX IF NOT EXISTS idx_temple_floor_contours_geom ON temple_floor_contours USING GIST(geom);

DO $$
BEGIN
  RAISE NOTICE 'temple_floor_contours table created successfully.';
END $$;

COMMIT;
