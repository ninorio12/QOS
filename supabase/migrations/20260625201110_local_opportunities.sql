CREATE TABLE IF NOT EXISTS local_opportunities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  company    TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  value      NUMERIC(10,2) NOT NULL DEFAULT 0,
  source     TEXT NOT NULL DEFAULT '',
  stage_id   TEXT NOT NULL DEFAULT 'stage-nouveau',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);