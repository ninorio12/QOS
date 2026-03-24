'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { type Lead, type ColumnId, COLUMNS } from './types'

type Props = {
  onClose: () => void
  onAdd: (lead: Lead) => void
}

const SOURCES: Lead['source'][] = ['Meta Ads', 'WhatsApp', 'LinkedIn', 'Téléphone', 'Site web', 'Referral', 'Email']

export default function NewLeadModal({ onClose, onAdd }: Props) {
  const [form, setForm] = useState({
    name: '',
    company: '',
    value: '',
    source: 'Meta Ads' as Lead['source'],
    columnId: 'nouveau' as ColumnId,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    onAdd({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      company: form.company.trim(),
      value: parseFloat(form.value) || 0,
      source: form.source,
      columnId: form.columnId,
      createdAt: new Date().toISOString().split('T')[0],
      initials: [form.name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()],
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#1A2235] border border-[#232D3F] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232D3F]">
          <h2 className="text-white font-semibold text-base">Nouveau lead</h2>
          <button onClick={onClose} className="text-[#3D4F6B] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-[#8896AB] mb-1.5 font-medium">Nom du prospect *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jean Dupont"
                className="w-full bg-[#121721] border border-[#232D3F] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3D4F6B] focus:outline-none focus:border-[#3462EE] transition-colors"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-[#8896AB] mb-1.5 font-medium">Entreprise</label>
              <input
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Dupont Construction"
                className="w-full bg-[#121721] border border-[#232D3F] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3D4F6B] focus:outline-none focus:border-[#3462EE] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8896AB] mb-1.5 font-medium">Valeur (€)</label>
              <input
                type="number"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder="50000"
                min="0"
                className="w-full bg-[#121721] border border-[#232D3F] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3D4F6B] focus:outline-none focus:border-[#3462EE] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8896AB] mb-1.5 font-medium">Source</label>
              <select
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value as Lead['source'] }))}
                className="w-full bg-[#121721] border border-[#232D3F] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3462EE] transition-colors"
              >
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-[#8896AB] mb-1.5 font-medium">Colonne initiale</label>
              <select
                value={form.columnId}
                onChange={e => setForm(f => ({ ...f, columnId: e.target.value as ColumnId }))}
                className="w-full bg-[#121721] border border-[#232D3F] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3462EE] transition-colors"
              >
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-[#232D3F] text-sm text-[#8896AB] hover:text-white hover:border-[#3D4F6B] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-[#3462EE] hover:bg-[#2a50d4] text-white text-sm font-semibold transition-colors"
            >
              Créer le lead
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
