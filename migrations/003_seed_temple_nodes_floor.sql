BEGIN;

UPDATE temple_nodes
SET floor = CAST(substring(name FROM 'LANTAI\s*(\d+)') AS INTEGER)
WHERE name ~ 'LANTAI';

UPDATE temple_nodes SET floor = 5 WHERE name LIKE 'DASAR_STUPA%';
UPDATE temple_nodes SET floor = 6 WHERE name LIKE 'STUPA1%';
UPDATE temple_nodes SET floor = 7 WHERE name LIKE 'STUPA2%';
UPDATE temple_nodes SET floor = 8 WHERE name LIKE 'STUPA3%';

DO $$
DECLARE
  null_floors INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_floors FROM temple_nodes WHERE floor IS NULL;

  IF null_floors > 0 THEN
    RAISE EXCEPTION 'Found % nodes with NULL floor after migration!', null_floors;
  END IF;

  RAISE NOTICE 'Migration successful. All nodes have floor values assigned.';
END $$;

COMMIT;
