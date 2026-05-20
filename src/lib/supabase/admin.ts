// Mock Supabase admin - même que le client
import { createClient } from './client'

export function createAdminClient() {
  return createClient()
}