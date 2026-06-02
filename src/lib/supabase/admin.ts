import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRole(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
