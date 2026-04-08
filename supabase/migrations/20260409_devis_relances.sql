-- supabase/migrations/20260409_devis_relances.sql
CREATE TABLE IF NOT EXISTS devis_relances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id    UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  delai_jours INTEGER NOT NULL,
  canal       TEXT NOT NULL CHECK (canal IN ('whatsapp','email','sms')),
  statut      TEXT NOT NULL DEFAULT 'programmee'
    CHECK (statut IN ('programmee','envoyee','annulee','ignoree')),
  message     TEXT,
  envoye_le   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE devis_relances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON devis_relances FOR ALL USING (true) WITH CHECK (true);
