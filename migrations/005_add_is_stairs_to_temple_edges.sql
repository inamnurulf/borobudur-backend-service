BEGIN;

ALTER TABLE temple_edges ADD COLUMN is_stairs BOOLEAN NOT NULL DEFAULT false;

UPDATE temple_edges e
SET is_stairs = true
FROM temple_nodes ns, temple_nodes nt
WHERE e.source = ns.id
  AND e.target = nt.id
  AND ns.floor != nt.floor;

COMMIT;
