// Client Supabase manquant - même mock
import { createClient } from './client'

export function createMissingSupabaseClient() {
  return createClient()
}