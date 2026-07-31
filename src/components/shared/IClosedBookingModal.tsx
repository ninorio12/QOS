'use client'

import { CalendarCheck, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

// Page de booking iClosed : pré-remplit nom + email ; la date, l'heure et le closer
// sont choisis directement sur iClosed. iClosed bloque l'iframe → on ouvre dans un
// nouvel onglet (déclenché par le clic sur « Ouvrir iClosed »).
export const ICLOSED_R1_BOOKING_URL = 'https://app.iclosed.io/e/vividflow/audit-ia-offert'
// R2 : même page que R1 pour l'instant. À remplacer par le lien iClosed R2 dédié quand fourni.
export const ICLOSED_R2_BOOKING_URL = ICLOSED_R1_BOOKING_URL
// Kickoff call (onboarding) : évènement iClosed dédié, hôte = Thomas.
export const ICLOSED_KICKOFF_BOOKING_URL = 'https://app.iclosed.io/e/vividflow/Kick-off'

export function IClosedBookingModal({ fullName, email, phone, label, bookingUrl, onConfirm, onCancel }: {
  fullName?: string | null
  email?: string | null
  phone?: string | null
  label: string            // « R1 » ou « R2 »
  bookingUrl: string
  onConfirm: () => void     // appelé au clic « Ouvrir iClosed » → la carte passe en R1/R2
  onCancel: () => void      // fermeture sans booker → la carte reste à sa place
}) {
  const params = new URLSearchParams()
  // iClosed attend les paramètres `iclosedName` / `iclosedEmail` / `iclosedPhone` (pas `name` / `email`).
  if (fullName) params.set('iclosedName', fullName)
  if (email) params.set('iclosedEmail', email)
  if (phone) params.set('iclosedPhone', phone)
  const url = bookingUrl + (bookingUrl.includes('?') ? '&' : '?') + params.toString()

  return (
    <Modal onClose={onCancel}>
      <div className="relative w-full max-w-sm bg-soren-card rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 text-center">
        <span className="w-12 h-12 rounded-full bg-[#16A34A]/12 flex items-center justify-center"><CalendarCheck size={22} className="text-[#16A34A]" /></span>
        <div>
          <p className="text-[15px] font-bold text-soren-text">Booker le {label}</p>
          <p className="text-[12px] text-soren-muted mt-1">
            {fullName && <span className="font-semibold text-soren-text">{fullName}</span>}{fullName ? ' : ' : ''}choisis la date, l'heure et le closer sur iClosed.
          </p>
          {(email || phone) && <p className="text-[11px] text-soren-subtle mt-1.5">Pré-rempli :{email ? ` ${email}` : ''}{email && phone ? ' ·' : ''}{phone ? ` ${phone}` : ''}</p>}
        </div>
        <a href={url} target="_blank" rel="noreferrer" onClick={onConfirm}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#FF4D00] text-white text-[13px] font-bold hover:bg-[#E64500] transition-colors">
          <ExternalLink size={15} /> Ouvrir iClosed
        </a>
        <button onClick={onCancel} className="text-[11px] font-semibold text-soren-subtle hover:text-soren-text">Annuler</button>
      </div>
    </Modal>
  )
}
