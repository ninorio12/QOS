'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ExternalLink, Copy, Check } from 'lucide-react'

/**
 * Le deck de présentation d'un lead outbound, dans sa fiche.
 *
 * Un seul composant pour les deux endroits où on ouvre une fiche (Contacts et
 * Prospection) : le lien doit se lire pareil des deux côtés, et un changement
 * de règle ne doit pas avoir à être fait deux fois.
 *
 * Ne s'affiche QUE pour un lead outbound (une ligne existe dans le fichier de
 * sourcing). Un lead outbound sans deck le dit : c'est une action à faire, pas
 * un vide à masquer.
 */
export function DeckOutbound({ email, variante = 'fiche' }: { email?: string; variante?: 'fiche' | 'page' }) {
  const lead = useQuery(api.outboundLeads.deckByEmail, email ? { email } : 'skip') as
    { id: string; deckUrl: string | null; etape: string; company: string | null } | null | undefined
  const [copie, setCopie] = useState(false)

  if (!email || !lead) return null

  async function copier() {
    if (!lead?.deckUrl) return
    try {
      await navigator.clipboard.writeText(lead.deckUrl)
      setCopie(true)
      setTimeout(() => setCopie(false), 1600)
    } catch { /* presse-papier refusé : le lien reste cliquable */ }
  }

  const titre = <p className={variante === 'page'
    ? 'text-[10px] font-bold text-soren-subtle uppercase tracking-widest mb-1'
    : 'text-[9.5px] md:text-[10px] font-semibold uppercase tracking-[0.08em] text-soren-subtle mb-2'}>Deck de présentation</p>

  if (!lead.deckUrl) {
    return (
      <div className={variante === 'page' ? 'bg-soren-card rounded-2xl px-6 pt-4 pb-4 mb-4' : 'px-4 md:px-5 pb-3 md:pb-4'}>
        {titre}
        <p className="text-[11px] text-soren-subtle">Pas encore de deck pour ce lead.</p>
      </div>
    )
  }

  const affichage = lead.deckUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div className={variante === 'page' ? 'bg-soren-card rounded-2xl px-6 pt-4 pb-4 mb-4' : 'px-4 md:px-5 pb-3 md:pb-4'}>
      {titre}
      <div className="flex items-center gap-1.5">
        <a href={lead.deckUrl} target="_blank" rel="noreferrer"
          title={lead.deckUrl}
          className="flex-1 min-w-0 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-soren-border text-soren-text hover:border-[#C8CBD0] hover:bg-soren-elevated transition-colors">
          <ExternalLink size={12} className="flex-none text-soren-muted" />
          <span className="truncate text-[11.5px] font-medium">{affichage}</span>
        </a>
        <button onClick={copier} title="Copier le lien"
          className="flex-none inline-flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-soren-border text-soren-muted hover:text-soren-text hover:border-[#C8CBD0] hover:bg-soren-elevated transition-colors">
          {copie ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
        </button>
      </div>
    </div>
  )
}

export default DeckOutbound
