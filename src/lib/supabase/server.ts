// Mock Supabase server - même que le client
import { createClient as createBrowserClient } from './client'

export async function createClient() {
  return createBrowserClient()
}

export function createServerClient(url: string, key: string, options: any) {
  return createBrowserClient()
}