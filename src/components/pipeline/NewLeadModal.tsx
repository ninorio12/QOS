'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { type GHLPipelineData, type Opportunity, type Lead } from './types'

interface Props {
  pipeline?: GHLPipelineData
  onClose:  () => void
  onAdd:    (opp: Opportunity | Lead) => void
}

const SOURCES = ['Direct', 'Meta Ads', 'WhatsApp', 'LinkedIn', 'Téléphone', 'Site web', 'Referral', 'Email']

function Field({
  label, placeholder, value, onChange, type = 'text',
}: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#6B7280] mb-1.5 font-medium">{label}</label>
      <input
        type={type}
        required={label.endsWith('*')}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#F5F5F0] border-0 rounded-xl px-3 py-2.5 text-sm text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 transition-all"
      />
    </div>
  )
}

export default function NewLeadModal({ pipeline, onClose, onAdd }: Props) {
  const [form, setForm] = useState({
    name:    '',
    company: '',
    value:   '',
    source:  'Direct',
    stageId: pipeline?.stages[0]?.id ?? '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const initials = form.name.trim().split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
    onAdd({
      id:         crypto.randomUUID(),
      name:       form.name.trim(),
      company:    form.company.trim(),
      value:      parseFloat(form.value) || 0,
      source:     form.source,
      stageId:    form.stageId,
      pipelineId: pipeline?.id ?? '',
      createdAt:  new Date().toISOString().split('T')[0],
      initials,
      email:      '',
      phone:      '',
      contactId:  '',
      tags:       [],
      status:     'open',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Ajouter une opportunité</h2>
            {pipeline && <p className="text-xs text-[#9CA3AF] mt-0.5">{pipeline.name}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] flex items-center justify-center hover:bg-[#E5E7EB] transition-colors"
          >
            <X size={14} className="text-[#6B7280]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-3.5">
          <Field
            label="Nom du prospect *"
            placeholder="Jean Dupont"
            value={form.name}
            onChange={v => setForm(f => ({ ...f, name: v }))}
          />
          <Field
            label="Entreprise"
            placeholder="Dupont Construction"
            value={form.company}
            onChange={v => setForm(f => ({ ...f, company: v }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Valeur (€)"
              placeholder="50000"
              value={form.value}
              type="number"
              onChange={v => setForm(f => ({ ...f, value: v }))}
            />
            <div>
              <label className="block text-xs text-[#6B7280] mb-1.5 font-medium">Source</label>
              <select
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="w-full bg-[#F5F5F0] border-0 rounded-xl px-3 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 appearance-none transition-all"
              >
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#6B7280] mb-1.5 font-medium">Stage</label>
            <select
              value={form.stageId}
              onChange={e => setForm(f => ({ ...f, stageId: e.target.value }))}
              className="w-full bg-[#F5F5F0] border-0 rounded-xl px-3 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 appearance-none transition-all"
            >
              {pipeline?.stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-[#E5E7EB] text-sm text-[#6B7280] hover:text-[#111111] hover:border-[#D1D5DB] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-full bg-[#111111] hover:bg-[#2a2a2a] text-white text-sm font-semibold transition-colors"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
