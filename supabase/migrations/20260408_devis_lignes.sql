-- Ajoute les colonnes lignes et notes au tableau devis
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS lignes JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS notes  TEXT  NOT NULL DEFAULT '';
