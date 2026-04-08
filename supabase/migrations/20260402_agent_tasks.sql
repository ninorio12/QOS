-- Agent tasks table
-- Run this in Supabase SQL editor: https://app.supabase.com → SQL Editor

CREATE TABLE IF NOT EXISTS agent_tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  agent      text NOT NULL CHECK (agent IN ('soren', 'kai', 'mia')),
  col        text NOT NULL DEFAULT 'todo' CHECK (col IN ('todo', 'inprogress', 'error', 'done')),
  human      boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: allow all for now (lock down per user in production)
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for agent_tasks" ON agent_tasks FOR ALL USING (true) WITH CHECK (true);

-- Seed with some example tasks
INSERT INTO agent_tasks (title, agent, col, human) VALUES
  ('Qualifier lead Jean Dupont',        'kai',   'inprogress', false),
  ('Envoyer devis Rénovation façade',   'mia',   'todo',       false),
  ('Relancer Xavier Alvarez',           'kai',   'todo',       false),
  ('Analyser pipeline ACQUISITION',     'soren', 'done',       false),
  ('Générer rapport hebdo',             'soren', 'done',       false),
  ('Créer fiche contact Didier Dubois', 'mia',   'done',       false),
  ('Appel vocal Jean Dupont',           'kai',   'error',      true),
  ('Mettre à jour Knowledge Base',      'mia',   'inprogress', false);
