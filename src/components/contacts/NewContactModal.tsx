'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createContact } from '@/app/contacts/actions'

export default function NewContactModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    if (!formData.get('first_name') || !formData.get('last_name')) {
      setError('Le prénom et le nom sont requis.')
      return
    }
    startTransition(async () => {
      const result = await createContact(formData)
      if (result?.error) { setError(result.error); return }
      onClose()
    })
  }

  const inputCls = 'w-full bg-[#121721] border border-[#232D3F] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3D4F6B] focus:outline-none focus:border-[#3462EE] transition-colors'
  const labelCls = 'block text-xs font-medium text-[#8896AB] mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1A2235] border border-[#232D3F] rounded-2xl w-full max-w-md shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232D3F]">
          <h2 className="text-white font-semibold">Nouveau contact</h2>
          <button onClick={onClose} className="text-[#3D4F6B] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Prénom *</label>
              <input name="first_name" required placeholder="Jean" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nom *</label>
              <input name="last_name" required placeholder="Dupont" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Entreprise</label>
              <input name="company" placeholder="Dupont Construction" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Titre / Poste</label>
              <input name="job_title" placeholder="Directeur Technique" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input name="email" type="email" placeholder="jean@exemple.fr" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Téléphone</label>
              <input name="phone" type="tel" placeholder="+33 6 00 00 00 00" className={inputCls} />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-[#232D3F] text-sm text-[#8896AB] hover:text-white hover:border-[#3D4F6B] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[#3462EE] hover:bg-[#2a50d4] disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {isPending ? 'Création...' : 'Créer le contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
