import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { api } from '../../../../../convex/_generated/api'
import { sendInviteEmail } from '@/lib/resend'
import { isApiCallerAdmin, authedConvexClient } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Sécurité : inviter un utilisateur (rôle/admin) est réservé aux administrateurs.
    if (!(await isApiCallerAdmin())) return NextResponse.json({ ok: false, error: 'Réservé aux administrateurs.' }, { status: 403 })
    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      firstName?: string
      lastName?: string
      role?: string
      allowedModules?: string[]
      message?: string
    }

    const { email, firstName, lastName, role, allowedModules, message } = body
    if (!email || !role) {
      return NextResponse.json({ ok: false, error: 'email and role required' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://data-os.vividflow.co'
    let inviteUrl = `${appUrl}/inscription`

    // 1) Invitation Clerk avec notify:false → Clerk N'ENVOIE PAS son email générique ;
    //    on récupère le lien d'invitation pour l'envoyer dans NOTRE email personnalisé.
    try {
      const client = await clerkClient()
      const inv = await client.invitations.createInvitation({
        emailAddress: email,
        ignoreExisting: true,
        notify: false,
        publicMetadata: { role, allowedModules },
        redirectUrl: `${appUrl}/inscription`,
      })
      if (inv?.url) inviteUrl = inv.url
    } catch (clerkErr) {
      // Non-bloquant : l'utilisateur peut déjà être membre/invité. On garde le lien fallback.
      console.error('[invite-user] Clerk invitation failed:', clerkErr)
    }

    // 2) Pré-création de la ligne Convex "pending" (liée par email au login via syncFromClerk).
    const convex = await authedConvexClient()
    await convex.mutation(api.users.adminUpsertPending, {
      email,
      firstName,
      lastName,
      role,
      allowedModules,
    })

    // 3) Email d'invitation VividFlow personnalisé (prénom + message libre) via Resend.
    await sendInviteEmail({
      to: email,
      firstName: firstName ?? null,
      message: message?.trim() || null,
      inviteUrl,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[invite-user] failed:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
