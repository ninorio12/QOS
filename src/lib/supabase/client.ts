import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder'

export function createClient() {
  const url = env.supabaseUrl() || PLACEHOLDER_URL
  const key = env.supabaseAnon() || PLACEHOLDER_KEY
  return createBrowserClient(url, key)
}
