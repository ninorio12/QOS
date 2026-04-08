'use client'

import { useState } from 'react'
import { FileText, Plus, X, Send, Trash2, Sparkles, ChevronLeft, Save } from 'lucide-react'

type Devis = {
  id: string
  contact_name: string | null
  titre: string
  contenu: string
  montant_ht: number | null
  statut: string
  created_at: string
  envoye_le: string | null
  conversation_id: string | null
  contact_id: string | null
  contact_email: string | null
  contact_phone: string | null
}

type View = 'list' | 'create' | 'detail'

const STATUT_CONFIG: Record<string, { label: string; classes: string }> = {
  brouillon: { label: 'Brouillon', classes: 'bg-gray-100 text-gray-600' },
  'envoyé':  { label: 'Envoyé',   classes: 'bg-blue-100 text-blue-700' },
  'accepté': { label: 'Accepté',  classes: 'bg-green-100 text-green-700' },
  'refusé':  { label: 'Refusé',   classes: 'bg-red-100 text-red-700' },
}

function formatEUR(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Statut Badge ────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const cfg = STATUT_CONFIG[statut] ?? { label: statut, classes: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}

// ─── List View ───────────────────────────────────────────────────────────────

function DevisList({
  devisList,
  onNew,
  onSelect,
}: {
  devisList: Devis[]
  onNew: () => void
  onSelect: (d: Devis) => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#3462EE]/10 flex items-center justify-center">
            <FileText size={16} className="text-[#3462EE]" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-[#111111]">Devis IA</h1>
            <p className="text-[12px] text-[#6B7280]">{devisList.length} devis</p>
          </div>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 bg-[#111111] text-white rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-[#222222] transition-colors"
        >
          <Plus size={14} />
          Nouveau devis
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {devisList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <FileText size={24} className="text-gray-400" />
            </div>
            <p className="text-[15px] font-semibold text-[#111111] mb-1">Aucun devis</p>
            <p className="text-[13px] text-[#6B7280]">Créez votre premier devis avec l'aide de Kai</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Contact</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Titre</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Montant HT</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Statut</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Date</th>
                </tr>
              </thead>
              <tbody>
                {devisList.map((d, i) => (
                  <tr
                    key={d.id}
                    onClick={() => onSelect(d)}
                    className={`cursor-pointer hover:bg-[#EEF0EB]/50 transition-colors ${i < devisList.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium text-[#111111]">
                        {d.contact_name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#111111]">{d.titre}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-semibold text-[#111111]">
                        {d.montant_ht != null ? formatEUR(d.montant_ht) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatutBadge statut={d.statut} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[#6B7280]">{formatDate(d.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Create Panel ─────────────────────────────────────────────────────────────

function CreatePanel({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (d: Devis) => void
}) {
  const [form, setForm] = useState({
    contact_name:    '',
    contact_email:   '',
    contact_phone:   '',
    conversation_id: '',
    titre:           '',
    montant_ht:      '',
  })
  const [contenu, setContenu]       = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  function setField(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleGenerate() {
    setGenerating(true)
    setContenu('')
    setError(null)
    try {
      const res = await fetch('/api/devis/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contactName:    form.contact_name,
          contactCompany: '',
          history:        form.conversation_id ? `ID conversation GHL : ${form.conversation_id}` : '',
        }),
      })
      if (!res.ok || !res.body) throw new Error('Erreur génération')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value, { stream: true })
        setContenu(result)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!contenu.trim()) { setError('Le contenu du devis est vide'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/devis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contact_name:    form.contact_name || null,
          contact_email:   form.contact_email || null,
          contact_phone:   form.contact_phone || null,
          conversation_id: form.conversation_id || null,
          titre:           form.titre || 'Devis',
          contenu,
          montant_ht:      form.montant_ht ? parseFloat(form.montant_ht) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      onSaved(json.devis as Devis)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-[#6B7280] hover:text-[#111111] hover:border-gray-300 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-[16px] font-bold text-[#111111]">Nouveau devis</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !contenu.trim()}
          className="flex items-center gap-1.5 bg-[#111111] text-white rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-[#222222] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={14} />
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px]">
            {error}
          </div>
        )}

        {/* Contact fields */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h3 className="text-[13px] font-bold text-[#111111]">Informations contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Nom *</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={e => setField('contact_name', e.target.value)}
                placeholder="Jean Dupont"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111111] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={e => setField('contact_email', e.target.value)}
                placeholder="jean@exemple.fr"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111111] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Téléphone</label>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={e => setField('contact_phone', e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111111] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">ID Conversation GHL</label>
              <input
                type="text"
                value={form.conversation_id}
                onChange={e => setField('conversation_id', e.target.value)}
                placeholder="Optionnel — pour générer depuis l'historique"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111111] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Devis fields */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h3 className="text-[13px] font-bold text-[#111111]">Détails du devis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Titre</label>
              <input
                type="text"
                value={form.titre}
                onChange={e => setField('titre', e.target.value)}
                placeholder="Devis Rénovation Salle de Bain"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111111] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Montant HT (€)</label>
              <input
                type="number"
                value={form.montant_ht}
                onChange={e => setField('montant_ht', e.target.value)}
                placeholder="5000"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111111] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors"
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-[#3462EE] text-white rounded-xl px-4 py-2.5 text-[13px] font-semibold hover:bg-[#2550CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} />
            {generating ? 'Génération en cours…' : 'Générer avec Kai ✨'}
          </button>

          {/* Content textarea */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
              Contenu du devis
              {generating && <span className="ml-2 text-[#3462EE] normal-case font-normal">Génération en cours…</span>}
            </label>
            <textarea
              value={contenu}
              onChange={e => setContenu(e.target.value)}
              rows={14}
              placeholder="Le contenu du devis apparaîtra ici après la génération, ou saisissez-le manuellement…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] text-[#111111] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors resize-none font-mono leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  devis: initial,
  onClose,
  onUpdated,
  onDeleted,
}: {
  devis: Devis
  onClose: () => void
  onUpdated: (d: Devis) => void
  onDeleted: (id: string) => void
}) {
  const [contenu, setContenu]       = useState(initial.contenu)
  const [montantHT, setMontantHT]   = useState(initial.montant_ht?.toString() ?? '')
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [sending, setSending]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState<string | null>(null)
  const [channel, setChannel]       = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp')
  const [convId, setConvId]         = useState(initial.conversation_id ?? '')
  const [contactId, setContactId]   = useState(initial.contact_id ?? '')

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/devis/${initial.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contenu,
          montant_ht: montantHT ? parseFloat(montantHT) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      onUpdated(json.devis as Devis)
      setSuccess('Modifications sauvegardées')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce devis ?')) return
    setDeleting(true)
    try {
      await fetch(`/api/devis/${initial.id}`, { method: 'DELETE' })
      onDeleted(initial.id)
    } catch {
      setError('Erreur lors de la suppression')
      setDeleting(false)
    }
  }

  async function handleSend() {
    if (!convId.trim()) { setError('ID conversation requis pour l\'envoi'); return }
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/devis/${initial.id}/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          channel,
          conversationId: convId,
          contactId:      contactId || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      setSuccess(`Devis envoyé via ${channel} avec succès`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-[#6B7280] hover:text-[#111111] hover:border-gray-300 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h2 className="text-[16px] font-bold text-[#111111]">{initial.titre}</h2>
            {initial.contact_name && (
              <p className="text-[12px] text-[#6B7280]">{initial.contact_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatutBadge statut={initial.statut} />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-[#111111] text-white rounded-full px-4 py-2 text-[13px] font-semibold hover:bg-[#222222] transition-colors disabled:opacity-40"
          >
            <Save size={13} />
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px]">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-[13px]">
            {success}
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-[#111111]">Contenu du devis</h3>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#6B7280]">Montant HT (€)</label>
              <input
                type="number"
                value={montantHT}
                onChange={e => setMontantHT(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-28 px-3 py-1.5 rounded-xl border border-gray-200 text-[13px] text-[#111111] text-right focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors"
              />
            </div>
          </div>
          <textarea
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            rows={16}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors resize-none font-mono leading-relaxed"
          />
        </div>

        {/* Send section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h3 className="text-[13px] font-bold text-[#111111]">Envoyer via GHL</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Canal</label>
              <select
                value={channel}
                onChange={e => setChannel(e.target.value as 'WhatsApp' | 'SMS' | 'Email')}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors bg-white"
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="Email">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">ID Conversation GHL *</label>
              <input
                type="text"
                value={convId}
                onChange={e => setConvId(e.target.value)}
                placeholder="conv_xxxxxxxx"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111111] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">ID Contact GHL</label>
              <input
                type="text"
                value={contactId}
                onChange={e => setContactId(e.target.value)}
                placeholder="Optionnel"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111111] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE] transition-colors"
              />
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 bg-[#3462EE] text-white rounded-xl px-4 py-2.5 text-[13px] font-semibold hover:bg-[#2550CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
            {sending ? 'Envoi en cours…' : `Envoyer via ${channel}`}
          </button>
          {initial.envoye_le && (
            <p className="text-[12px] text-[#6B7280]">
              Dernière envoi : {formatDate(initial.envoye_le)}
            </p>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
          <h3 className="text-[13px] font-bold text-red-600 mb-3">Zone de danger</h3>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 bg-red-500 text-white rounded-xl px-4 py-2.5 text-[13px] font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            {deleting ? 'Suppression…' : 'Supprimer ce devis'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DevisView({ devisList: initial }: { devisList: Devis[] }) {
  const [devisList, setDevisList] = useState<Devis[]>(initial)
  const [view, setView]           = useState<View>('list')
  const [selected, setSelected]   = useState<Devis | null>(null)

  function handleNew() { setView('create') }

  function handleSelect(d: Devis) {
    setSelected(d)
    setView('detail')
  }

  function handleClose() {
    setView('list')
    setSelected(null)
  }

  function handleSaved(d: Devis) {
    setDevisList(prev => [d, ...prev])
    setSelected(d)
    setView('detail')
  }

  function handleUpdated(d: Devis) {
    setDevisList(prev => prev.map(x => x.id === d.id ? d : x))
    setSelected(d)
  }

  function handleDeleted(id: string) {
    setDevisList(prev => prev.filter(x => x.id !== id))
    handleClose()
  }

  return (
    <div className="min-h-screen bg-[#EEF0EB]">
      <div className="ml-[236px] h-screen flex flex-col">
        <div className="flex-1 overflow-hidden bg-[#EEF0EB]">
          {view === 'list' && (
            <DevisList devisList={devisList} onNew={handleNew} onSelect={handleSelect} />
          )}
          {view === 'create' && (
            <CreatePanel onClose={handleClose} onSaved={handleSaved} />
          )}
          {view === 'detail' && selected && (
            <DetailPanel
              devis={selected}
              onClose={handleClose}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          )}
        </div>
      </div>
    </div>
  )
}
