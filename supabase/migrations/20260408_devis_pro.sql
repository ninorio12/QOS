-- Champs pro pour devis BTP
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS numero          TEXT,
  ADD COLUMN IF NOT EXISTS ville           TEXT,
  ADD COLUMN IF NOT EXISTS date_validite   DATE,
  ADD COLUMN IF NOT EXISTS adresse_chantier TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url         TEXT,
  ADD COLUMN IF NOT EXISTS source          TEXT NOT NULL DEFAULT 'manuel';
