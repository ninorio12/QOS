-- Bridge de communication inter-agents (QOS ↔ Hermes)
create table if not exists agent_messages (
  id          bigserial primary key,
  from_agent  text        not null,          -- 'qos' | 'hermes'
  to_agent    text        not null,          -- 'qos' | 'hermes'
  type        text        not null,          -- 'audit' | 'result' | 'task' | 'context' | 'status'
  subject     text,                          -- titre court lisible
  payload     jsonb       not null default '{}',
  read        boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- Index pour polling rapide (messages non lus pour un agent)
create index agent_messages_to_unread
  on agent_messages (to_agent, read, created_at desc)
  where read = false;

-- RLS : accès libre côté service role (agents)
alter table agent_messages enable row level security;
create policy "service_full" on agent_messages
  using (true) with check (true);
