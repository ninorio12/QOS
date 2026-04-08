-- supabase/migrations/20260408_company_settings.sql

CREATE TABLE IF NOT EXISTS company_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'Soren',
  tagline     TEXT NOT NULL DEFAULT 'Construction · Rénovation · Aménagement',
  address     TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  siret       TEXT NOT NULL DEFAULT '',
  capital     TEXT NOT NULL DEFAULT '',
  tva_intra   TEXT NOT NULL DEFAULT '',
  assurance   TEXT NOT NULL DEFAULT '',
  brand_color TEXT NOT NULL DEFAULT '#d28e46',
  logo_svg    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ligne admin par défaut (idempotente)
INSERT INTO company_settings (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Soren')
ON CONFLICT (id) DO NOTHING;

-- Ajout website_url (migration additionnelle)
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website_url TEXT NOT NULL DEFAULT '';
