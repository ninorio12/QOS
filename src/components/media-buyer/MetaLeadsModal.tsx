'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { X, Mail, Phone, ArrowUpRight, Users } from 'lucide-react'
import MetaLogo from './MetaLogo'

const STATUT: Record<string, { label: string; cls: string }> = {
  lead:   { label: 'Lead',   cls: 'bg-amber-100 text-amber-700' },
  client: { label: 'Client', cls: 'bg-emerald-100 text-emerald-700' },
  perdu:  { label: 'Perdu',  cls: 'bg-red-100 text-red-700' },
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: '2-digit' }) }
  catch { return iso.slice(0, 10) }
}

export default function MetaLeadsModal({ onClose }: { onClose: () => void }) {
  const rows = useQuery(api.mediaBuyer.metaInboundContacts) ?? null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={onClose}
      style={{ animation: 'fadeSlideUp 160ms ease-out both' }}
    >
      <div
        className="relative w-full max-w-[680px] max-h-[88vh] flex flex-col overflow-hidden rounded-3xl bg-soren-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-soren-border/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-soren-elevated grid place-items-center"><MetaLogo size={18} /></div>
            <div>
              <h3 className="text-[15px] font-bold tracking-tight text-soren-text">Leads inbound — Meta Ads</h3>
              <p className="text-[11.5px] text-soren-muted mt-0.5">
                {rows === null ? 'Chargement…' : `${rows.length} contact${rows.length > 1 ? 's' : ''} issu${rows.length > 1 ? 's' : ''} des formulaires Meta`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full grid place-items-center text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-colors"><X size={17} /></button>
        </div>

        {/* liste */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {rows === null ? (
            <div className="py-16 text-center text-[12.5px] text-soren-subtle">Chargement…</div>
          ) : rows.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-11 h-11 rounded-2xl bg-soren-elevated grid place-items-center mx-auto mb-3"><Users size={20} className="text-soren-subtle" /></div>
              <p className="text-[13px] font-semibold text-soren-text">Aucun lead Meta pour l'instant</p>
              <p className="text-[12px] text-soren-muted mt-1 max-w-[360px] mx-auto leading-relaxed">
                Dès qu'un prospect remplit un formulaire Meta, son contact apparaît ici et dans la pipeline commerciale (lead inbound).
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {rows.map(r => (
                <a
                  key={r.id}
                  // Une soumission de test n'a pas de fiche : la ligne existe pour
                  // expliquer le compteur Meta, elle ne mène nulle part.
                  href={r.test ? undefined : `/contacts/${r.id}`}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${r.test ? 'opacity-60 cursor-default' : 'hover:bg-soren-elevated'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-soren-accent/10 text-soren-accent grid place-items-center text-[11px] font-bold flex-none">
                    {r.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-soren-text truncate">
                        {r.name}{r.test && <span className="text-soren-subtle font-normal"> (test)</span>}
                      </span>
                      {r.statut && STATUT[r.statut] && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUT[r.statut].cls}`}>{STATUT[r.statut].label}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[11.5px] text-soren-muted mt-0.5 truncate">
                      {r.email && <span className="inline-flex items-center gap-1 truncate"><Mail size={11} />{r.email}</span>}
                      {r.phone && <span className="inline-flex items-center gap-1 flex-none"><Phone size={11} />{r.phone}</span>}
                    </div>
                  </div>
                  <span className="text-[11px] text-soren-subtle tabular-nums flex-none">{fmtDate(r.createdAt)}</span>
                  <ArrowUpRight size={15} className="text-soren-subtle group-hover:text-soren-accent flex-none transition-colors" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
