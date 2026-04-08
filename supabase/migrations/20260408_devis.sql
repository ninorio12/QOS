CREATE TABLE IF NOT EXISTS devis (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id       TEXT,
  conversation_id  TEXT,
  contact_name     TEXT,
  contact_email    TEXT,
  contact_phone    TEXT,
  titre            TEXT NOT NULL DEFAULT 'Devis',
  contenu          TEXT NOT NULL DEFAULT '',
  montant_ht       NUMERIC(10,2),
  statut           TEXT NOT NULL DEFAULT 'brouillon'
                   CHECK (statut IN ('brouillon', 'envoyé', 'accepté', 'refusé')),
  envoye_le        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON devis USING (true);
