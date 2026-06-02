import { cookies } from 'next/headers'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export async function createClient() {
  const cookieStore = cookies()

  const url = env.supabaseUrl() || 'https://placeholder.supabase.co'
  const key = env.supabaseAnon() || 'placeholder'
  return createSupabaseServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot always write cookies. Middleware refreshes sessions.
        }
      },
    },
  })
}

export { createSupabaseServerClient as createServerClient }
