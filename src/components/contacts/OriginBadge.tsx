'use client'

/**
 * Provenance réelle d'un lead, sous la rangée Source.
 *
 * « Inbound » et « Outbound » disent la famille, pas le canal. Cette zone dit par
 * où la personne est arrivée, et quand on le sait, PAR QUELLE PUBLICITÉ : le
 * parcours porte l'identifiant de l'annonce, la table des créas porte son nom.
 * Les logos sont dessinés en SVG (traces officielles Simple Icons, CC0) : aucun
 * appel réseau, aucune image à charger.
 */

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

function MetaLogo({ size = 18 }: { size?: number }) {
  // Tracé officiel Meta (Simple Icons, CC0), couleur de marque #0467DF.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Meta">
      <path fill="#0467DF" d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z" />
    </svg>
  )
}

function GmailLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M1.636 5.455 12 13.09l10.364-7.636A1.64 1.64 0 0 0 20.727 4.5H3.273a1.64 1.64 0 0 0-1.637.955Z" />
      <path fill="#FBBC04" d="M1.5 6.3v11.564c0 .904.732 1.636 1.636 1.636h1.773V8.59L1.5 6.3Z" />
      <path fill="#34A853" d="M19.091 8.59v10.91h1.773c.904 0 1.636-.732 1.636-1.636V6.3l-3.409 2.29Z" />
      <path fill="#4285F4" d="M4.909 19.5V8.59L12 13.91l7.091-5.32V19.5H4.909Z" />
    </svg>
  )
}

type Origin = {
  funnel: string
  formName: string | null
  adId: string | null
  adName: string | null
  campaignName: string | null
  isOrganic: boolean | null
} | null

export default function OriginBadge({ source, contactId }: { source: string | null | undefined; contactId?: string }) {
  const origin = useQuery(api.leadIngest.originFor, contactId ? { contactId } : 'skip') as Origin | undefined

  if (!source) return null
  const isInbound = source === 'inbound'
  const isOutbound = source === 'outbound'
  if (!isInbound && !isOutbound) return null

  const Logo = isInbound ? MetaLogo : GmailLogo
  const canal = isInbound ? 'Formulaire Facebook' : 'Emailing'

  return (
    <div className="flex items-start gap-2.5 mt-1 px-3 py-2.5 rounded-xl bg-soren-elevated border border-soren-border">
      <span className="w-8 h-8 rounded-lg bg-soren-card border border-soren-border flex items-center justify-center flex-shrink-0">
        <Logo size={18} />
      </span>
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="text-[12.5px] font-semibold text-soren-text leading-none">{canal}</span>
        {origin?.adName ? (
          <span className="text-[10.5px] text-soren-muted truncate">
            Publicité <span className="font-medium text-soren-text">{origin.adName}</span>
            {origin.campaignName && <> · {origin.campaignName}</>}
          </span>
        ) : origin?.isOrganic ? (
          <span className="text-[10.5px] text-soren-subtle">Arrivé sans publicité (organique)</span>
        ) : (
          <span className="text-[10.5px] text-soren-subtle">Publicité d&apos;origine non identifiée</span>
        )}
      </div>
    </div>
  )
}
