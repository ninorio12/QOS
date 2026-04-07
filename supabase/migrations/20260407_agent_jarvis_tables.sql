-- Agent Jarvis tables — run in Supabase SQL editor or via supabase db push

-- 1. agent_interactions: learning base for weekly self-improvement
CREATE TABLE IF NOT EXISTS agent_interactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent      text NOT NULL CHECK (agent IN ('soren', 'kai', 'mia')),
  lead_id    text,
  type       text NOT NULL,
  outcome    text,
  duration   integer,
  metadata   jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 2. agent_memory: long-term per-lead memory (key/value per agent)
CREATE TABLE IF NOT EXISTS agent_memory (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent      text NOT NULL CHECK (agent IN ('soren', 'kai', 'mia')),
  key        text NOT NULL,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (agent, key)
);

-- 3. soul_versions: history of SOUL.md edits for rollback
CREATE TABLE IF NOT EXISTS soul_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent       text NOT NULL CHECK (agent IN ('soren', 'kai', 'mia')),
  content     text NOT NULL,
  deployed_at timestamptz DEFAULT now(),
  author      text NOT NULL DEFAULT 'thomas'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_interactions_agent ON agent_interactions (agent);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_lead  ON agent_interactions (lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_key   ON agent_memory (agent, key);
CREATE INDEX IF NOT EXISTS idx_soul_versions_agent      ON soul_versions (agent, deployed_at DESC);

-- RLS
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_versions       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for agent_interactions" ON agent_interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for agent_memory"        ON agent_memory        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for soul_versions"        ON soul_versions        FOR ALL USING (true) WITH CHECK (true);
