# Supabase Migrations

This directory contains SQL migrations for the QoS (Qorpo) Next.js CRM application.

## How to Run Migrations

Since the project does not have a Supabase CLI setup, migrations must be run manually via the Supabase Dashboard:

1. **Go to Supabase Dashboard:**
   - Navigate to your Supabase project: https://app.supabase.com/
   - Open the SQL Editor in the left sidebar

2. **Copy the migration file:**
   - Open the migration file (e.g., `20260402_calendar_contact_tables.sql`)
   - Copy all contents

3. **Paste and Execute:**
   - Paste the contents into the SQL Editor
   - Click the "Run" button (or press `Ctrl+Enter`)
   - Wait for the migration to complete

4. **Verify:**
   - Check the Table Editor in the left sidebar to confirm the new tables exist
   - Verify that `calendar_event_links` and `contact_attribution` tables are present

## Migration Files

### `20260402_calendar_contact_tables.sql`
Creates two tables for the calendar sync and contact attribution features:

- **`calendar_event_links`**: Maps GHL appointment IDs to Google Calendar event IDs
  - `id` (uuid): Primary key
  - `ghl_appointment_id` (text): Unique identifier for GHL appointment
  - `google_event_id` (text): Google Calendar event ID
  - `created_at` (timestamptz): Timestamp of creation
  - Index on `ghl_appointment_id` for efficient lookups

- **`contact_attribution`**: Tracks contact ownership and creation
  - `ghl_contact_id` (text): Primary key - GHL contact identifier
  - `created_by` (text): User ID who created the contact
  - `created_at` (timestamptz): Timestamp of creation

## Notes

- Migrations are named with timestamps (`YYYYMMDD_description.sql`) to ensure consistent ordering
- All tables use `timestamptz` for timezone-aware timestamps
- Indexes are created for frequently queried columns to improve performance
- The `if not exists` clause is used for idempotency - migrations can be safely re-run
