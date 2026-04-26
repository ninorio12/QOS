-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION : Multi-tenant — Organisations + Profils utilisateurs
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. TABLE ORGANIZATIONS
-- Chaque client = 1 organisation avec ses propres clés GHL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  ghl_api_key     text,
  ghl_location_id text,
  created_at      timestamptz DEFAULT now()
);

-- 2. TABLE USER_PROFILES
-- Lie chaque utilisateur Supabase à une organisation + rôle
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations ON DELETE SET NULL,
  role            text NOT NULL DEFAULT 'client'
                    CHECK (role IN ('superadmin', 'client')),
  created_at      timestamptz DEFAULT now()
);

-- 3. AJOUT organization_id SUR TOUTES LES TABLES DE DONNÉES
-- Nullable pour ne pas casser les données existantes
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE agent_tasks         ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations ON DELETE CASCADE;
ALTER TABLE devis                ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations ON DELETE CASCADE;
ALTER TABLE devis_relances       ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations ON DELETE CASCADE;
ALTER TABLE company_settings     ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations ON DELETE CASCADE;
ALTER TABLE agent_interactions   ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations ON DELETE CASCADE;
ALTER TABLE agent_memory         ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations ON DELETE CASCADE;
ALTER TABLE soul_versions        ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations ON DELETE CASCADE;
ALTER TABLE contact_attribution  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations ON DELETE CASCADE;
ALTER TABLE calendar_event_links ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations ON DELETE CASCADE;

-- Index pour les requêtes filtrées par org
CREATE INDEX IF NOT EXISTS idx_agent_tasks_org        ON agent_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_devis_org              ON devis(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_org ON agent_interactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_org       ON agent_memory(organization_id);

-- 4. FONCTIONS HELPER RLS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM user_profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. ACTIVATION RLS + POLICIES
-- Règle : superadmin voit tout, client voit seulement son org
-- ─────────────────────────────────────────────────────────────────────────────

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access" ON organizations;
CREATE POLICY "org_access" ON organizations FOR ALL USING (
  is_superadmin() OR id = get_user_org_id()
);

-- User profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_access" ON user_profiles;
CREATE POLICY "profile_access" ON user_profiles FOR ALL USING (
  user_id = auth.uid() OR is_superadmin()
);

-- Agent tasks
DROP POLICY IF EXISTS "Allow all for agent_tasks" ON agent_tasks;
CREATE POLICY "org_access" ON agent_tasks FOR ALL USING (
  is_superadmin() OR organization_id = get_user_org_id()
) WITH CHECK (
  is_superadmin() OR organization_id = get_user_org_id()
);

-- Devis
DROP POLICY IF EXISTS "open" ON devis;
CREATE POLICY "org_access" ON devis FOR ALL USING (
  is_superadmin() OR organization_id = get_user_org_id()
) WITH CHECK (
  is_superadmin() OR organization_id = get_user_org_id()
);

-- Devis relances
DROP POLICY IF EXISTS "open" ON devis_relances;
CREATE POLICY "org_access" ON devis_relances FOR ALL USING (
  is_superadmin() OR organization_id = (
    SELECT organization_id FROM devis WHERE id = devis_id
  )
) WITH CHECK (
  is_superadmin() OR organization_id = (
    SELECT organization_id FROM devis WHERE id = devis_id
  )
);

-- Company settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access" ON company_settings;
CREATE POLICY "org_access" ON company_settings FOR ALL USING (
  is_superadmin() OR organization_id = get_user_org_id()
) WITH CHECK (
  is_superadmin() OR organization_id = get_user_org_id()
);

-- Agent interactions
DROP POLICY IF EXISTS "Allow all for agent_interactions" ON agent_interactions;
CREATE POLICY "org_access" ON agent_interactions FOR ALL USING (
  is_superadmin() OR organization_id = get_user_org_id()
) WITH CHECK (
  is_superadmin() OR organization_id = get_user_org_id()
);

-- Agent memory
DROP POLICY IF EXISTS "Allow all for agent_memory" ON agent_memory;
CREATE POLICY "org_access" ON agent_memory FOR ALL USING (
  is_superadmin() OR organization_id = get_user_org_id()
) WITH CHECK (
  is_superadmin() OR organization_id = get_user_org_id()
);

-- Soul versions (superadmin only)
DROP POLICY IF EXISTS "Allow all for soul_versions" ON soul_versions;
CREATE POLICY "superadmin_only" ON soul_versions FOR ALL USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Calendar event links
ALTER TABLE calendar_event_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access" ON calendar_event_links;
CREATE POLICY "org_access" ON calendar_event_links FOR ALL USING (
  is_superadmin() OR organization_id = get_user_org_id()
) WITH CHECK (
  is_superadmin() OR organization_id = get_user_org_id()
);

-- Contact attribution
ALTER TABLE contact_attribution ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access" ON contact_attribution;
CREATE POLICY "org_access" ON contact_attribution FOR ALL USING (
  is_superadmin() OR organization_id = get_user_org_id()
) WITH CHECK (
  is_superadmin() OR organization_id = get_user_org_id()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- APRÈS LA MIGRATION : exécuter ce bloc avec ton user_id Supabase
-- (Remplacer 'TON_USER_ID' par l'UUID de ton compte dans auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT INTO organizations (name, slug) VALUES ('Qorpo IA', 'qorpo-ia')
--   RETURNING id;
-- -- Utiliser l'id retourné ci-dessus :
-- INSERT INTO user_profiles (user_id, organization_id, role)
--   VALUES ('TON_USER_ID', 'ORG_ID_RETOURNÉ', 'superadmin');
-- ─────────────────────────────────────────────────────────────────────────────
