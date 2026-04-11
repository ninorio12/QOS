'use client'

import { useState, useTransition } from 'react'
import { X, Mail, Phone, MessageSquare, MessageCircle, Users2, FileText } from 'lucide-react'
import { createConversation } from '@/app/conversations/actions'
import { CHANNEL_META, type Channel } from './types'

const CHANNEL_ICON_MAP: Record<Channel, React.ElementType> = {
  email:    Mail,
  phone:    Phone,
  sms:      MessageSquare,
  whatsapp: MessageCircle,
  meeting:  Users2,
  note:     FileText,
}

const CHANNELS: Channel[] = ['email', 'phone', 'whatsapp', 'sms', 'meeting', 'note']

export default function NewConversationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<Channel>('email')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('channel', channel)
    startTransition(async () => {
      const result = await createConversation(formData)
      if (result?.error) { setError(result.error); return }
      onCreated?.(result.id ?? '')
      onClose()
    })
  }

  const inputCls = 'w-full bg-[#EEF0EB] border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#111111] placeholder-[#3D4F6B] focus:outline-none focus:border-[#3462EE] transition-colors'
  const labelCls = 'block text-xs font-medium text-[#6B7280] mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-[#111111] font-semibold">Nouvelle conversation</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#111111] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Channel */}
          <div>
            <label className={labelCls}>Canal</label>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map(c => {
                const meta = CHANNEL_META[c]
                const active = channel === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChannel(c)}
                    className={`
                      flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all
                      ${active
                        ? 'border-[#3462EE] bg-[#3462EE]/10 text-[#3462EE]'
                        : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#3D4F6B] hover:text-[#111111]'
                      }
                    `}
                  >
                    {(() => { const Icon = CHANNEL_ICON_MAP[c]; return <Icon size={16} style={{ color: meta.color }} /> })()}
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className={labelCls}>Sujet / Titre</label>
            <input name="subject" placeholder="Ex: Devis Résidence Les Chênes" className={inputCls} />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280] hover:text-[#111111] hover:border-[#3D4F6B] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[#3462EE] hover:bg-[#2a50d4] disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
