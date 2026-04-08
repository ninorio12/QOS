// src/components/devis/InfoSection.tsx

type TimelineEvent = {
  label:  string
  detail: string
  date:   string | null
  color:  string
  done:   boolean
}

interface InfoSectionProps {
  devisId:         string
  contactId:       string | null
  contactName:     string | null
  conversationId:  string | null
  source:          string
  createdAt:       string
  envoyeLe:        string | null
  pdfUrl:          string | null
  montantHt:       number | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function InfoSection({
  devisId, contactId, contactName, conversationId, source,
  createdAt, envoyeLe, pdfUrl, montantHt,
}: InfoSectionProps) {
  const acompte30 = montantHt != null ? montantHt * 0.3 : null

  const timeline: TimelineEvent[] = [
    {
      label: 'Créé',
      detail: source === 'n8n' ? 'par IA depuis conversation' : 'manuellement',
      date: createdAt,
      color: '#E2FF8D',
      done: true,
    },
    {
      label: 'PDF généré',
      detail: pdfUrl ? '2.3 Mo' : 'non généré',
      date: pdfUrl ? createdAt : null,
      color: '#3462EE',
      done: !!pdfUrl,
    },
    {
      label: 'Envoyé',
      detail: envoyeLe ? 'par WhatsApp' : 'non envoyé',
      date: envoyeLe,
      color: '#4A91A8',
      done: !!envoyeLe,
    },
  ]

  return (
    <div className="border border-[#f0f0eb] rounded-2xl p-4 flex flex-col gap-3">
      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Informations</p>

      {/* Contact */}
      {contactName && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Contact
          </span>
          <a
            href={contactId ? `/contacts/${contactId}` : '#'}
            className="text-[12px] font-semibold text-[#3462EE] hover:underline underline-offset-2"
          >
            {contactName} →
          </a>
        </div>
      )}

      {/* Conversation GHL */}
      {conversationId && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Conversation
          </span>
          <a
            href={`/conversations?id=${conversationId}`}
            className="text-[12px] font-semibold text-[#3462EE] hover:underline underline-offset-2"
          >
            Voir dans GHL →
          </a>
        </div>
      )}

      {/* Source */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-semibold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Source
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={source === 'n8n'
            ? { background: '#f3e8ff', color: '#7c3aed' }
            : { background: '#f3f4f6', color: '#6b7280' }
          }
        >
          {source === 'n8n' ? 'IA · N8N' : 'Manuel'}
        </span>
      </div>

      <div className="h-px bg-[#f0f0eb]" />

      {/* Timeline */}
      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Historique</p>
      <div className="flex flex-col gap-2">
        {timeline.map((ev) => (
          <div key={ev.label} className="flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: ev.done ? ev.color : '#e5e7eb',
                boxShadow: ev.done && ev.label === 'Créé' ? '0 0 0 2px #111' : 'none',
              }}
            />
            <span className="text-[11px] text-[#6B7280] flex-1">
              <strong className={ev.done ? 'text-[#111111]' : 'text-[#d1d5db]'}>{ev.label}</strong>
              {ev.done && ` · ${ev.detail}`}
            </span>
            {ev.date && (
              <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">{fmtDate(ev.date)}</span>
            )}
          </div>
        ))}
      </div>

      <div className="h-px bg-[#f0f0eb]" />

      {/* Acompte + PDF */}
      {acompte30 != null && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Acompte 30%
          </span>
          <span className="text-[12px] font-semibold text-[#111111]">{fmtEUR(acompte30)}</span>
        </div>
      )}

      {pdfUrl && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            PDF
          </span>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-semibold text-[#3462EE] hover:underline underline-offset-2"
          >
            Télécharger →
          </a>
        </div>
      )}
    </div>
  )
}
