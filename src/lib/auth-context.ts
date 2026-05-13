import { createClient }      from '@/lib/supabase/server'
import { createAdminClient }  from '@/lib/supabase/admin'
import { env }                from '@/lib/env'

export type UserRole = 'superadmin' | 'client'

export type AuthContext = {
  userId:         string
  orgId:          string | null
  role:           UserRole
  ghlApiKey:      string
  ghlLocationId:  string
  isSuperAdmin:   boolean
}

/**
 * À utiliser dans les API routes et Server Components.
 * Retourne null si l'utilisateur n'est pas connecté.
 * Retourne les credentials GHL de son organisation (ou les env vars pour le superadmin).
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Dev bypass: pas de session mais env vars réels → superadmin automatique
  if (!user) {
    const ghlKey = process.env.GHL_API_KEY ?? ''
    const ghlLoc = process.env.GHL_LOCATION_ID ?? ''
    if (ghlKey && ghlLoc && ghlKey !== 'placeholder_ghl_key') {
      return {
        userId:        'dev-bypass',
        orgId:         null,
        role:          'superadmin',
        ghlApiKey:     ghlKey,
        ghlLocationId: ghlLoc,
        isSuperAdmin:  true,
      }
    }
  }

  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('organization_id, role, organizations(ghl_api_key, ghl_location_id)')
    .eq('user_id', user.id)
    .single()

  // Pas encore de profil → on crée un profil superadmin pour le premier utilisateur
  if (!profile) {
    const { count } = await admin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    const role: UserRole = (count ?? 0) === 0 ? 'superadmin' : 'client'
    await admin.from('user_profiles').insert({ user_id: user.id, role })

    return {
      userId:         user.id,
      orgId:          null,
      role,
      ghlApiKey:      env.ghlApiKey(),
      ghlLocationId:  env.ghlLocationId(),
      isSuperAdmin:   role === 'superadmin',
    }
  }

  const orgRaw = profile.organizations
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
    ghl_api_key:      string | null
    ghl_location_id:  string | null
  } | null

  const role = (profile.role ?? 'client') as UserRole

  return {
    userId:         user.id,
    orgId:          profile.organization_id ?? null,
    role,
    // Superadmin utilise les env vars ; client utilise les clés de son org
    ghlApiKey:      (role === 'superadmin' ? null : org?.ghl_api_key) ?? env.ghlApiKey(),
    ghlLocationId:  (role === 'superadmin' ? null : org?.ghl_location_id) ?? env.ghlLocationId(),
    isSuperAdmin:   role === 'superadmin',
  }
}

/**
 * Version qui lève une erreur 401 si non connecté.
 * Usage : const ctx = await requireAuth()
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) throw new Response('Non autorisé', { status: 401 })
  return ctx
}
