import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      firstName?: string
      lastName?: string
      role?: string
      allowedModules?: string[]
    }

    const { email, firstName, lastName, role, allowedModules } = body
    if (!email || !role) {
      return NextResponse.json({ ok: false, error: 'email and role required' }, { status: 400 })
    }

    // 1) Invitation Clerk (envoie l'email nativement). Non-bloquant si déjà membre/invité.
    try {
      const client = await clerkClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://data-os.vividflow.co'
      await client.invitations.createInvitation({
        emailAddress: email,
        ignoreExisting: true,
        publicMetadata: { role, allowedModules },
        // Lien d'invitation → page d'acceptation custom (même design que /login).
        redirectUrl: `${appUrl}/inscription`,
      })
    } catch (clerkErr) {
      // On continue sans throw — l'utilisateur peut déjà être membre/invité.
      console.error('[invite-user] Clerk invitation failed:', clerkErr)
    }

    // 2) Pré-création de la ligne Convex "pending" (liée par email au login via syncFromClerk).
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return NextResponse.json({ ok: false, error: 'no convex' }, { status: 500 })
    const convex = new ConvexHttpClient(url)
    await convex.mutation(api.users.adminUpsertPending, {
      email,
      firstName,
      lastName,
      role,
      allowedModules,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
