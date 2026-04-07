import type { SessionManager } from '../sessions/SessionManager'
import { getActivePipeline } from '../skills/ghl'

/**
 * buildDailyDigest: formats the GHL pipeline into a Telegram message for Soren to post.
 * Called by the 07h00 cron — Soren uses its telegram_send tool to post the result.
 */
export async function triggerDailyDigest(sorenSession: SessionManager): Promise<void> {
  const opps = await getActivePipeline()

  const open  = opps.filter(o => o.status === 'open')
  const total = open.reduce((sum, o) => sum + o.monetaryValue, 0)

  // Build the digest text — Soren will post this via telegram_send tool
  const digestPrompt = [
    'Génère et envoie le digest quotidien du pipeline. Utilise le tool telegram_send pour poster ce message EXACTEMENT dans le groupe :',
    '',
    `📊 *Digest pipeline — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}*`,
    '',
    `• ${open.length} leads actifs — valeur totale : *${total.toLocaleString('fr-FR')}€*`,
    ...open.slice(0, 5).map(o =>
      `  • ${o.contact?.name ?? o.name} | ${o.monetaryValue.toLocaleString('fr-FR')}€ | ↺ ${formatAge(o.updatedAt)}`
    ),
    open.length > 5 ? `  … et ${open.length - 5} autres` : '',
    '',
    'Bonne journée Thomas, je surveille le pipeline.',
  ].filter(Boolean).join('\n')

  await sorenSession.send(digestPrompt)
}

function formatAge(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffH  = Math.floor(diffMs / (60 * 60 * 1000))
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}j`
}
