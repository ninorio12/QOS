import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

// Suppression COMPLÈTE d'un utilisateur : compte Clerk + invitations en attente + ligne Convex.
// (Sans ça, supprimer côté Convex laissait le compte Clerk actif → l'utilisateur gardait l'accès
//  et "compte déjà existant" à la ré-invitation.)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { convexId?: string; email?: string }
    const { convexId, email } = body

    // 1) Clerk : supprimer le(s) user(s) avec cet email + révoquer les invitations en attente.
    if (email) {
      try {
        const client = await clerkClient()
        const users = await client.users.getUserList({ emailAddress: [email] })
        for (const u of users.data) {
          try { await client.users.deleteUser(u.id) } catch (e) { console.error('[remove-user] deleteUser', e) }
        }
        const invs = await client.invitations.getInvitationList({ status: 'pending' })
        for (const inv of invs.data) {
          if ((inv.emailAddress ?? '').toLowerCase() === email.toLowerCase()) {
            try { await client.invitations.revokeInvitation(inv.id) } catch (e) { console.error('[remove-user] revoke', e) }
          }
        }
      } catch (e) {
        console.error('[remove-user] Clerk cleanup failed:', e)
      }
    }

    // 2) Convex : supprimer la ligne.
    if (convexId) {
      const url = process.env.NEXT_PUBLIC_CONVEX_URL
      if (url) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await new ConvexHttpClient(url).mutation(api.users.adminRemove, { id: convexId as any })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
