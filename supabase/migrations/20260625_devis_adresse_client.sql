-- Ajout de la colonne adresse_client manquante dans devis
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS adresse_client TEXT;
