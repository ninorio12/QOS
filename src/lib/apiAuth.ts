import { auth, clerkClient } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'

// Crée un client Convex serveur PORTANT l'identité Clerk de l'appelant (template JWT "convex").
// Indispensable pour appeler une mutation gardée par requireAdmin depuis une route API :
// sans ce token, Convex ne voit aucune identité et la mutation est refusée.
export async function authedConvexClient(): Promise<ConvexHttpClient> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  const client = new ConvexHttpClient(url)
  const { getToken } = await auth()
  const token = await getToken({ template: 'convex' })
  if (token) client.setAuth(token)
  return client
}

// Vérifie que l'appelant d'une route API est un administrateur authentifié (Clerk).
// Source du rôle : publicMetadata.role (posé à l'invitation, synchronisé vers Convex).
// Renvoie false si non authentifié, non-admin, ou en cas d'erreur (fail-closed).
export async function isApiCallerAdmin(): Promise<boolean> {
  try {
    const { userId } = await auth()
    if (!userId) return false
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    return user.publicMetadata?.role === 'admin'
  } catch {
    return false
  }
}
