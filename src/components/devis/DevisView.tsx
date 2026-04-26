// src/components/devis/DevisView.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X } from 'lucide-react'
import DevisListView from './DevisListView'
import DevisDetailView from './DevisDetailView'
import { getAvatarColor } from '@/components/contacts/types'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/shared/Toaster'

type Ligne = {
  quantite:     number
  prixUnitaire: number
  tvaRate:      number
  description:  string
  unite:        string
}

type Devis = {
  id: string; numero: string | null; contact_name: string | null
  contact_email: string | null; contact_phone: string | null
  contact_id: string | null; conversation_id: string | null
  titre: string; contenu: string; lignes: Ligne[]
  notes: string; montant_ht: number | null; statut: string
  created_at: string; envoye_le: string | null; ville: string | null
  date_validite: string | null; adresse_chantier: string | null
  adresse_client: string | null
  pdf_url: string | null; source: string
  signature_statut: 'non_envoye' | 'envoye' | 'vu' | 'signe'
  signature_vu_le: string | null
  signature_signe_le: string | null
}

type Contact = {
  id: string
  contactName:  string | null
  firstName:    string | null
  lastName:     string | null
  email:        string | null
  phone:        string | null
  address1?:    string | null
  city?:        string | null
  postalCode?:  string | null
}

function capitalize(name: string): string {
  return name.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ')
}

function contactDisplayName(c: Contact): string {
  const raw = c.contactName?.trim() ||
    [c.firstName, c.lastName].filter(Boolean).join(' ') ||
    c.email || c.phone || '—'
  return raw === c.email || raw === c.phone || raw === '—' ? raw : capitalize(raw)
}

function contactInitials(c: Contact): string {
  const name = contactDisplayName(c)
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

type View = 'list' | 'detail'

// ─── Modal nouveau devis ──────────────────────────────────────────────────────

function NewDevisModal({ onClose, onCreate }: {
  onClose:  () => void
  onCreate: (contact?: Contact) => Promise<void>
}) {
  const [search,   setSearch]   = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading,  setLoading]  = useState(false)
  const [creating, setCreating] = useState(false)
  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!search.trim()) { setContacts([]); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      const q = search.toLowerCase()
      fetch('/api/contact')
        .then(r => r.json())
        .then(d => {
          const all: Contact[] = d.contacts ?? d.data ?? []
          setContacts(
            all.filter(c =>
              contactDisplayName(c).toLowerCase().includes(q) ||
              (c.email ?? '').toLowerCase().includes(q) ||
              (c.phone ?? '').toLowerCase().includes(q)
            ).slice(0, 6)
          )
        })
        .catch(() => setContacts([]))
        .finally(() => setLoading(false))
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  async function pick(contact?: Contact) {
    setCreating(true)
    if (contact) {
      // Fetcher la fiche complète pour avoir l'adresse
      try {
        const res = await fetch(`/api/contact/${contact.id}`)
        if (res.ok) {
          const data = await res.json() as { contact?: Contact }
          if (data.contact) contact = { ...contact, ...data.contact }
        }
      } catch { /* on continue avec les données partielles */ }
    }
    await onCreate(contact)
    setCreating(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-soren-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-[16px] font-extrabold text-[#111]">Nouveau devis</h2>
            <p className="text-[12px] text-soren-subtle mt-0.5">Avec un client existant ou depuis zéro</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f5f5f0] flex items-center justify-center hover:bg-[#e5e7eb] transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* Recherche client */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full bg-[#f9f9f7] border border-[#f0f0eb] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-[#111] placeholder:text-soren-subtle focus:outline-none focus:border-[#3462EE] transition-colors"
            />
          </div>
        </div>

        {/* Résultats */}
        {search.trim() && (
          <div className="mx-6 mb-3 border border-[#f0f0eb] rounded-xl overflow-hidden">
            {loading ? (
              <div className="px-4 py-3 text-[12px] text-soren-subtle">Recherche…</div>
            ) : contacts.length > 0 ? (
              contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => pick(c)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f9f9f7] transition-colors border-b border-[#f0f0eb] last:border-0 text-left disabled:opacity-50"
                >
                  {(() => {
                    const initials = contactInitials(c)
                    const color    = getAvatarColor(initials)
                    return (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ background: color + '22', color }}
                      >
                        {initials}
                      </div>
                    )
                  })()}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#111] truncate">{contactDisplayName(c)}</p>
                    <p className="text-[11px] text-soren-subtle truncate">{c.email ?? c.phone ?? '—'}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-[12px] text-soren-subtle">Aucun contact trouvé</div>
            )}
          </div>
        )}

        {/* Séparateur */}
        <div className="flex items-center gap-3 px-6 mb-4">
          <div className="flex-1 h-px bg-[#f0f0eb]" />
          <span className="text-[11px] text-soren-subtle font-medium">ou</span>
          <div className="flex-1 h-px bg-[#f0f0eb]" />
        </div>

        {/* Depuis zéro */}
        <div className="px-6 pb-6">
          <button
            onClick={() => pick(undefined)}
            disabled={creating}
            className="w-full flex items-center gap-3 bg-[#111] text-white rounded-2xl px-5 py-3.5 hover:bg-[#222] transition-colors disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-full bg-soren-card/10 flex items-center justify-center flex-shrink-0">
              <Plus size={14} />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-bold">Créer depuis zéro</p>
              <p className="text-[11px] text-white/50">Devis vierge sans client pré-rempli</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Vue principale ───────────────────────────────────────────────────────────

export default function DevisView({ devisList: initial, brandColor = '#d28e46' }: { devisList: Devis[]; brandColor?: string }) {
  const [devisList, setDevisList] = useState<Devis[]>(initial)
  const [view, setView]           = useState<View>('list')
  const [selected, setSelected]   = useState<Devis | null>(null)
  const [showModal, setShowModal] = useState(false)
  const { toasts, toast, dismiss } = useToast()

  function handleClose()           { setView('list'); setSelected(null) }
  function handleUpdated(d: Devis) {
    setDevisList(p => p.map(x => x.id === d.id ? d : x))
    setSelected(d)
  }
  function handleDeleted(id: string) {
    setDevisList(p => p.filter(x => x.id !== id))
    handleClose()
  }

  async function handleCreate(contact?: Contact) {
    const name = contact ? contactDisplayName(contact) : null

    // Reconstitue l'adresse depuis les champs GHL si disponibles
    const adresseClient = contact ? [
      contact.address1,
      [contact.postalCode, contact.city].filter(Boolean).join(' '),
    ].filter(Boolean).join('\n') || null : null

    const body: Record<string, unknown> = {
      titre:  name ? `Devis — ${name}` : 'Nouveau devis',
      source: 'manuel',
      lignes: [],
      notes:  '',
      statut: 'brouillon',
    }
    if (contact) {
      body.contact_id     = contact.id
      body.contact_name   = name
      body.contact_email  = contact.email
      body.contact_phone  = contact.phone
      if (adresseClient) body.adresse_client = adresseClient
    }

    const res  = await fetch('/api/devis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    if (!res.ok) {
      toast('Erreur lors de la création du devis', 'error')
      return
    }

    const newDevis = json.devis as Devis
    setDevisList(p => [newDevis, ...p])
    setShowModal(false)
    setSelected(newDevis)
    setView('detail')
    toast('Devis créé', 'success')
  }

  return (
    <div className="h-full flex flex-col bg-soren-app">
      <Toaster toasts={toasts} dismiss={dismiss} />
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === 'list' && (
          <DevisListView
            devisList={devisList}
            brandColor={brandColor}
            onNew={() => setShowModal(true)}
            onSelect={d => { setSelected(d as unknown as Devis); setView('detail') }}
            onDelete={id => setDevisList(p => p.filter(x => x.id !== id))}
          />
        )}
        {view === 'detail' && selected && (
          <DevisDetailView
            devis={selected}
            onClose={handleClose}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            brandColor={brandColor}
            toast={toast}
          />
        )}
      </div>

      {showModal && (
        <NewDevisModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
