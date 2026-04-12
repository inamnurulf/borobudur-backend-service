-- Add floor and zone columns to temple_nodes for nearby-grouped feature
-- Safe to run on existing production DB: preserves all existing data
ALTER TABLE temple_nodes ADD COLUMN IF NOT EXISTS floor INTEGER;
ALTER TABLE temple_nodes ADD COLUMN IF NOT EXISTS zone VARCHAR(50);

-- Add radius column to temple_features for per-feature detection proximity
ALTER TABLE temple_features ADD COLUMN IF NOT EXISTS radius INTEGER DEFAULT 5;

-- Create indexes for floor/zone filtering performance
CREATE INDEX IF NOT EXISTS idx_temple_nodes_floor ON temple_nodes(floor);
CREATE INDEX IF NOT EXISTS idx_temple_nodes_zone ON temple_nodes(zone);
CREATE INDEX IF NOT EXISTS idx_temple_nodes_floor_zone ON temple_nodes(floor, zone);
