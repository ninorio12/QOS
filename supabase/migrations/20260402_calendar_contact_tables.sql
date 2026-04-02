-- Migration: Create calendar_event_links and contact_attribution tables
-- Date: 2026-04-02
-- Purpose: Store mappings between GHL appointments and Google Calendar events,
--          and track contact attribution for CRM

-- Table 1: calendar_event_links
-- Maintains a bidirectional mapping between GHL appointment IDs and Google Calendar event IDs
create table if not exists calendar_event_links (
  id                  uuid primary key default gen_random_uuid(),
  ghl_appointment_id  text unique not null,
  google_event_id     text not null,
  created_at          timestamptz default now()
);

-- Index for efficient lookups by GHL appointment ID
create index if not exists idx_calendar_event_links_ghl
  on calendar_event_links (ghl_appointment_id);


-- Table 2: contact_attribution
-- Tracks which user created each contact in the CRM system
create table if not exists contact_attribution (
  ghl_contact_id  text primary key,
  created_by      text not null,
  created_at      timestamptz default now()
);

-- Index for efficient lookups by created_by user
create index if not exists idx_contact_attribution_created_by
  on contact_attribution (created_by);
