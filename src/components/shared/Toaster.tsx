'use client'
import { X } from 'lucide-react'
import type { Toast } from '@/hooks/useToast'

const STYLES: Record<string, string> = {
  success: 'bg-soren-sidebar border-[#FF4D00]/40 text-white',
  error:   'bg-soren-sidebar border-red-500/40 text-white',
  info:    'bg-soren-sidebar border-white/10 text-white',
}

const DOT: Record<string, string> = {
  success: 'bg-[#FF4D00]',
  error:   'bg-red-400',
  info:    'bg-blue-400',
}

interface ToasterProps {
  toasts:   Toast[]
  dismiss:  (id: number) => void
}

export function Toaster({ toasts, dismiss }: ToasterProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-xl pointer-events-auto
            vf-toast-in ${STYLES[t.type]}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[t.type]}`} />
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
