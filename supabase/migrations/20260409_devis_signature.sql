-- supabase/migrations/20260409_devis_signature.sql
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS signature_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS signature_statut TEXT NOT NULL DEFAULT 'non_envoye'
    CHECK (signature_statut IN ('non_envoye','envoye','vu','signe')),
  ADD COLUMN IF NOT EXISTS signature_vu_le TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_signe_le TIMESTAMPTZ;
