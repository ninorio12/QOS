'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Check, Save, UserPlus, Eye, Pencil,
  Heading1, List, ListChecks, ListOrdered, Link2, ChevronDown,
} from 'lucide-react'
import MarkdownView from '@/components/agentic/MarkdownView'

// Page blanche : un seul corps Markdown libre (titres, points, checklists, étapes, liens).
type DocStatusKey = 'draft' | 'review' | 'active'
const STATUS: Record<DocStatusKey, { label: string; color: string }> = {
  draft:  { label: 'Brouillon', color: '#9CA3AF' },
  review: { label: 'À revoir',  color: '#D97706' },
  active: { label: 'Validé',    color: '#16A34A' },
}

export default function DocEditor({
  docId, seedTitle, seedBody, seedStatus = 'draft', seedOwner = '', assignees = [],
}: {
  docId: string; seedTitle: string; seedBody: string
  seedStatus?: DocStatusKey; seedOwner?: string; assignees?: string[]
}) {
  const [title, setTitle] = useState(seedTitle)
  const [body, setBody] = useState(seedBody)
  const [status, setStatus] = useState<DocStatusKey>(seedStatus)
  const [owner, setOwner] = useState(seedOwner)
  const [validatedAt, setValidatedAt] = useState<string | undefined>()
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saved, setSaved] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)
  const loadedFor = useRef<string | null>(null)

  // Persistance réelle Convex (remplace l'ancien localStorage non partagé).
  const stored = useQuery(api.osKbDocs.getByDocId, { docId })
  const upsert = useMutation(api.osKbDocs.upsert)

  // Hydrate une fois par docId, dès que la requête Convex a répondu (doc existant ou null → seed).
  useEffect(() => {
    if (stored === undefined) return            // encore en chargement
    if (loadedFor.current === docId) return     // déjà hydraté pour ce doc
    if (stored) {
      setTitle(stored.title ?? seedTitle)
      setBody(stored.body ?? seedBody)
      setStatus((stored.status as DocStatusKey) ?? seedStatus)
      setOwner(stored.owner ?? seedOwner)
      setValidatedAt(stored.validatedAt ?? undefined)
    } else {
      setTitle(seedTitle); setBody(seedBody); setStatus(seedStatus); setOwner(seedOwner); setValidatedAt(undefined)
    }
    loadedFor.current = docId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, stored])

  // Auto-save silencieux (ne perd rien) — le bouton "Enregistrer" donne la confirmation explicite.
  useEffect(() => {
    if (loadedFor.current !== docId) return     // pas encore hydraté pour ce doc
    const t = setTimeout(() => { void persist() }, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, status, owner, validatedAt])

  async function persist(flash = false) {
    try {
      await upsert({ docId, title, body, status, owner: owner || undefined, validatedAt })
      if (flash) { setSaved(true); setTimeout(() => setSaved(false), 1600) }
    } catch { /* erreur réseau : l'autosave réessaiera à la prochaine frappe */ }
  }

  function insert(snippet: string) {
    const el = ta.current
    if (!el) { setBody(b => b + snippet); return }
    const s = el.selectionStart, e = el.selectionEnd
    const next = body.slice(0, s) + snippet + body.slice(e)
    setBody(next)
    requestAnimationFrame(() => { el.focus(); const pos = s + snippet.length; el.setSelectionRange(pos, pos) })
  }

  const st = STATUS[status]
  const INSERTS: { label: string; Icon: typeof List; snip: string }[] = [
    { label: 'Titre',     Icon: Heading1,    snip: '\n## Titre\n' },
    { label: 'Point',     Icon: List,        snip: '\n- ' },
    { label: 'Checklist', Icon: ListChecks,  snip: '\n- [ ] ' },
    { label: 'Étape',     Icon: ListOrdered, snip: '\n1. ' },
    { label: 'Lien',      Icon: Link2,       snip: '[texte](https://)' },
  ]

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Header : titre + statut + actions */}
      <div className="flex items-start gap-3 flex-wrap">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du document"
          className="flex-1 min-w-[200px] bg-transparent text-[22px] font-bold text-soren-text focus:outline-none placeholder:text-soren-subtle tracking-[-0.02em]" />

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: st.color + '1A', color: st.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />{st.label}
          </span>

          {/* Assigner */}
          <div className="relative">
            <button onClick={() => setAssignOpen(o => !o)} className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg border border-soren-border bg-soren-card text-soren-muted hover:text-soren-text transition-colors">
              <UserPlus size={13} />{owner ? owner : 'Assigner'}<ChevronDown size={12} />
            </button>
            {assignOpen && (
              <div className="absolute right-0 mt-1 z-20 w-52 max-h-64 overflow-auto bg-soren-card border border-soren-border rounded-xl shadow-lg py-1">
                {(assignees.length ? assignees : ['Humain']).map(a => (
                  <button key={a} onClick={() => { setOwner(a); setAssignOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-soren-elevated ${owner === a ? 'text-[#FF4D00] font-semibold' : 'text-soren-text'}`}>{a}</button>
                ))}
                {owner && <button onClick={() => { setOwner(''); setAssignOpen(false) }} className="w-full text-left px-3 py-1.5 text-[11px] text-soren-subtle hover:bg-soren-elevated border-t border-soren-border mt-1">Retirer l'assignation</button>}
              </div>
            )}
          </div>

          {/* Enregistrer */}
          <button onClick={() => persist(true)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[#0A0A0A] text-white hover:bg-[#1C1C1E] transition-colors">
            {saved ? <Check size={13} /> : <Save size={13} />}{saved ? 'Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* méta + bascule édition/aperçu */}
      <div className="flex items-center gap-3 flex-wrap text-[11px] text-soren-subtle border-b border-soren-border pb-2">
        {owner && <span>Assigné à <b className="text-soren-muted font-semibold">{owner}</b></span>}
        <div className="ml-auto inline-flex bg-soren-elevated rounded-lg p-0.5">
          {(['edit', 'preview'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${mode === m ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted hover:text-soren-text'}`}>
              {m === 'edit' ? <><Pencil size={11} /> Éditer</> : <><Eye size={11} /> Aperçu</>}
            </button>
          ))}
        </div>
      </div>

      {mode === 'edit' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {INSERTS.map(({ label, Icon, snip }) => (
            <button key={label} onClick={() => insert(snip)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-colors">
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Page blanche */}
      {mode === 'edit' ? (
        <textarea
          ref={ta} value={body} onChange={e => setBody(e.target.value)}
          placeholder="Page blanche — écrivez librement. Utilisez les boutons ci-dessus (titres, points, checklists, étapes, liens) ou tapez en Markdown."
          className="w-full min-h-[60vh] bg-white rounded-2xl border border-soren-border p-6 text-[14px] leading-relaxed text-soren-text placeholder:text-soren-subtle focus:outline-none focus:border-[#C8CBD0] resize-y font-sans"
        />
      ) : (
        <div className="w-full min-h-[60vh] bg-white rounded-2xl border border-soren-border p-6">
          {body.trim() ? <MarkdownView markdown={body} /> : <p className="text-[12px] text-soren-subtle">Document vide.</p>}
        </div>
      )}
    </div>
  )
}
