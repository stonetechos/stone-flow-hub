
-- One-time cleanup: remove duplicate activity_log rows produced by two historical backfills.
-- Scope is strictly limited to the two known backfill timestamps with null actor_id.
-- The earliest id per (entity_type, entity_id, action, created_at) is preserved.
WITH dupes AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY entity_type, entity_id, action, created_at
           ORDER BY id
         ) AS rn
  FROM public.activity_log
  WHERE actor_id IS NULL
    AND created_at IN (
      TIMESTAMPTZ '2026-07-06 23:46:18.067402+00',
      TIMESTAMPTZ '2026-07-10 12:30:37.491769+00'
    )
)
DELETE FROM public.activity_log al
USING dupes
WHERE al.id = dupes.id
  AND dupes.rn > 1;
