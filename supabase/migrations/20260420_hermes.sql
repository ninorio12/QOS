-- supabase/migrations/20260420_hermes.sql

-- Table agent_logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid REFERENCES agent_tasks(id) ON DELETE SET NULL,
  agent           text NOT NULL,
  level           text NOT NULL DEFAULT 'info',
  message         text NOT NULL,
  tool_used       text,
  tool_input      jsonb,
  tool_output     jsonb,
  created_at      timestamptz DEFAULT now(),
  organization_id uuid
);
CREATE INDEX IF NOT EXISTS idx_agent_logs_task_id    ON agent_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at DESC);

-- Table knowledge_docs
CREATE TABLE IF NOT EXISTS knowledge_docs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  content         text NOT NULL,
  updated_at      timestamptz DEFAULT now(),
  updated_by      text DEFAULT 'system',
  organization_id uuid
);

-- Étendre agent_tasks
ALTER TABLE agent_tasks
  ADD COLUMN IF NOT EXISTS priority    int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at  timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS result      text,
  ADD COLUMN IF NOT EXISTS context     jsonb DEFAULT '{}';
