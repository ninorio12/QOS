-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: statut devis natif pending_human_validation
-- Idempotente — safe à rejouer plusieurs fois
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Étendre le CHECK constraint (DROP + ADD est idempotent avec IF EXISTS)
ALTER TABLE devis DROP CONSTRAINT IF EXISTS devis_statut_check;
ALTER TABLE devis ADD CONSTRAINT devis_statut_check
  CHECK (statut IN (
    'brouillon',
    'envoyé',
    'accepté',
    'refusé',
    'pending_human_validation'
  ));

-- 2. Backfill: notes contient le flag → passer au statut natif
--    Condition stricte: statut='brouillon' ET notes ILIKE '%pending_human_validation%'
--    Seuls les vrais workarounds sont migrés.
UPDATE devis
SET
  statut = 'pending_human_validation',
  notes  = TRIM(
             REGEXP_REPLACE(
               COALESCE(notes, ''),
               '\s*pending_human_validation\s*',
               '',
               'gi'
             )
           )
WHERE
  statut = 'brouillon'
  AND notes ILIKE '%pending_human_validation%';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (copier/coller manuellement si nécessaire):
--
-- UPDATE devis
-- SET statut = 'brouillon',
--     notes  = TRIM(COALESCE(notes,'') || ' pending_human_validation')
-- WHERE statut = 'pending_human_validation';
--
-- ALTER TABLE devis DROP CONSTRAINT IF EXISTS devis_statut_check;
-- ALTER TABLE devis ADD CONSTRAINT devis_statut_check
--   CHECK (statut IN ('brouillon','envoyé','accepté','refusé'));
-- ─────────────────────────────────────────────────────────────────────────────
