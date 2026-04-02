'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'

const inputCls = 'w-full bg-[#F5F5F0] border-0 rounded-xl px-3 py-2.5 text-sm text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#E2FF8D] transition-all'
const labelCls = 'block text-xs font-medium text-[#6B7280] mb-1.5'

export default function NewContactModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd:   (c: GHLContact) => void
}) {
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState<string | null>(null)
  const [form,   setForm]     = useState({
    firstName: '', lastName: '', email: '', phone: '', companyName: '',
  })

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim()) { setError('Le prénom est requis.'); return }
    setSaving(true)
    setError(null)

    try {
      const res  = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json() as { contact?: { id: string; dateAdded: string }; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erreur création')
      if (!data.contact) throw new Error('Réponse invalide du serveur')

      const newContact: GHLContact = {
        id:          data.contact.id,
        contactName: `${form.firstName} ${form.lastName}`.trim(),
        firstName:   form.firstName || null,
        lastName:    form.lastName  || null,
        email:       form.email      || null,
        phone:       form.phone      || null,
        companyName: form.companyName || null,
        dateAdded:   data.contact.dateAdded,
        dateUpdated: null,
        tags:        [],
      }
      onAdd(newContact)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Ajouter un contact</h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Créé directement dans GHL</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F5F0] flex items-center justify-center hover:bg-[#E5E7EB] transition-colors">
            <X size={14} className="text-[#6B7280]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prénom *</label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="Jean" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nom</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="Dupont" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Entreprise</label>
            <input value={form.companyName} onChange={set('companyName')} placeholder="Dupont Construction" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>E-mail</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="jean@exemple.fr" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Téléphone</label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+33 6 00 00 00 00" className={inputCls} />
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#EF4444] bg-[#FEF2F2] rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-[#E5E7EB] text-sm text-[#6B7280] hover:border-[#D1D5DB] hover:text-[#111111] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving || !form.firstName.trim()}
              className="flex-1 py-2.5 rounded-full bg-[#111111] hover:bg-[#2a2a2a] disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {saving ? 'Création...' : 'Créer le contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
