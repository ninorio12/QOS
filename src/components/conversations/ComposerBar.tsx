'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, ChevronDown, X } from 'lucide-react'
import { type Conversation } from './types'
import { fetchJSON } from '@/lib/fetchJSON'
import { type ToastType } from '@/hooks/useToast'

type SendChannel = 'WhatsApp' | 'SMS' | 'Email'

const CHANNEL_OPTIONS: { value: SendChannel; label: string; color: string; icon: React.ReactNode }[] = [
  {
    value: 'WhatsApp', label: 'Whatsapp', color: '#22c55e',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="#22c55e">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    value: 'SMS', label: 'SMS', color: '#0EA5E9',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <line x1="9" y1="10" x2="9" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/>
      </svg>
    ),
  },
  {
    value: 'Email', label: 'Email', color: '#F43F5E',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="2,4 12,13 22,4"/>
      </svg>
    ),
  },
]

function defaultChannel(conv: Conversation): SendChannel {
  if (conv.channel === 'whatsapp') return 'WhatsApp'
  if (conv.channel === 'sms')      return 'SMS'
  if (conv.channel === 'email')    return 'Email'
  return 'WhatsApp'
}

// ── Email header field row ───────────────────────────────────────────────────
function EmailRow({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-0 border-b border-[#F3F4F6] last:border-0">
      <span className="text-[11px] font-medium text-soren-subtle w-[88px] flex-shrink-0 py-2 px-3">
        {label}
      </span>
      <div className="flex-1 py-1.5 pr-3">{children}</div>
    </div>
  )
}

// ── Email pill (address) ─────────────────────────────────────────────────────
function EmailPill({
  address,
  label,
  onRemove,
}: { address: string; label?: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[#F0F4FF] border border-[#DBEAFE] text-[#3462EE] rounded-full px-2 py-0.5 text-[11px] font-medium max-w-full">
      <span className="truncate max-w-[200px]">
        {address}
        {label && <span className="text-[#93B4FB] ml-0.5">({label})</span>}
      </span>
      <button type="button" onClick={onRemove} className="flex-shrink-0 ml-0.5 hover:text-[#1a3abf] transition-colors">
        <X size={10} />
      </button>
    </span>
  )
}

// ── Multi-email input ────────────────────────────────────────────────────────
function EmailListInput({
  emails,
  onChange,
  placeholder,
}: { emails: string[]; onChange: (emails: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')

  function commit() {
    const v = draft.trim()
    if (v && !emails.includes(v)) onChange([...emails, v])
    setDraft('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
    if (e.key === 'Backspace' && !draft && emails.length) {
      onChange(emails.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap gap-1 items-center min-h-[28px]">
      {emails.map((em, i) => (
        <EmailPill key={i} address={em} onRemove={() => onChange(emails.filter((_, j) => j !== i))} />
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={emails.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[100px] text-[12px] text-soren-text placeholder-[#C4C9D4] outline-none bg-transparent py-0.5"
      />
    </div>
  )
}

// ── Email composer header ────────────────────────────────────────────────────
type EmailFields = {
  fromName:  string
  fromEmail: string
  to:        string[]
  cc:        string[]
  bcc:       string[]
  subject:   string
}

function EmailHeader({
  fields,
  onChange,
}: { fields: EmailFields; onChange: (f: EmailFields) => void }) {
  const [showCc,  setShowCc]  = useState(false)
  const [showBcc, setShowBcc] = useState(false)

  function set<K extends keyof EmailFields>(key: K, val: EmailFields[K]) {
    onChange({ ...fields, [key]: val })
  }

  return (
    <div className="border-b border-soren-border bg-soren-card text-[12px]">

      {/* From Name */}
      <EmailRow label="From Name:">
        <input
          value={fields.fromName}
          onChange={e => set('fromName', e.target.value)}
          className="w-full text-[12px] text-soren-text outline-none bg-transparent py-0.5"
        />
      </EmailRow>

      {/* From Email */}
      <EmailRow label="From email:">
        <input
          value={fields.fromEmail}
          onChange={e => set('fromEmail', e.target.value)}
          className="w-full text-[12px] text-soren-text outline-none bg-transparent py-0.5"
        />
      </EmailRow>

      {/* To */}
      <EmailRow label="To:">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <EmailListInput
              emails={fields.to}
              onChange={v => set('to', v)}
              placeholder="Adresse email..."
            />
          </div>
          <div className="flex gap-2 flex-shrink-0 pt-0.5">
            {!showCc  && <button type="button" onClick={() => setShowCc(true)}  className="text-[10px] text-soren-subtle hover:text-[#3462EE] transition-colors font-medium">CC</button>}
            {!showBcc && <button type="button" onClick={() => setShowBcc(true)} className="text-[10px] text-soren-subtle hover:text-[#3462EE] transition-colors font-medium">BCC</button>}
          </div>
        </div>
      </EmailRow>

      {/* CC */}
      {showCc && (
        <EmailRow label="CC">
          <EmailListInput emails={fields.cc} onChange={v => set('cc', v)} placeholder="Adresse email..." />
        </EmailRow>
      )}

      {/* BCC */}
      {showBcc && (
        <EmailRow label="BCC">
          <EmailListInput emails={fields.bcc} onChange={v => set('bcc', v)} placeholder="Adresse email..." />
        </EmailRow>
      )}

      {/* Subject */}
      <EmailRow label="Subject:">
        <input
          value={fields.subject}
          onChange={e => set('subject', e.target.value)}
          placeholder="Objet de l'email"
          className="w-full text-[12px] text-soren-text placeholder-[#C4C9D4] outline-none bg-transparent py-0.5"
        />
      </EmailRow>
    </div>
  )
}

// ── Main ComposerBar ─────────────────────────────────────────────────────────

interface Props {
  conversation:  Conversation
  onMessageSent: (content: string, channel: SendChannel) => void
  onAiToggle?:   (enabled: boolean) => void
  aiEnabled?:    boolean
  disabled?:     boolean
  toast:         (message: string, type: ToastType) => void
}

export default function ComposerBar({ conversation, onMessageSent, disabled, toast }: Props) {
  const [input,       setInput]       = useState('')
  const [sending,     setSending]     = useState(false)
  const [channel,     setChannel]     = useState<SendChannel>(() => defaultChannel(conversation))
  const [error, setError] = useState<string | null>(null)

  // Email-specific state
  const [emailFields, setEmailFields] = useState<EmailFields>({
    fromName:  'Thomas Alves Do Rio',
    fromEmail: 'thomas@qorpoia.com',
    to:        conversation.contact_email ? [conversation.contact_email] : [],
    cc:        [],
    bcc:       [],
    subject:   '',
  })

  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch default sender info from server
  useEffect(() => {
    void fetch('/api/send-message')
      .then(r => r.json())
      .then((d: { fromName: string; fromAddress: string }) => {
        setEmailFields(prev => ({
          ...prev,
          fromName:  d.fromName  ?? prev.fromName,
          fromEmail: d.fromAddress ?? prev.fromEmail,
        }))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setChannel(defaultChannel(conversation))
    setInput('')
    setError(null)
    setEmailFields(prev => ({
      ...prev,
      to:      conversation.contact_email ? [conversation.contact_email] : [],
      cc:      [],
      bcc:     [],
      subject: '',
    }))
  }, [conversation.id, conversation.channel, conversation.contact_email])


  async function handleSend() {
    const content = input.trim()
    if (!content || sending || disabled) return
    if (channel === 'Email' && !emailFields.subject.trim()) {
      setError("L'objet de l'email est requis")
      return
    }
    setSending(true)
    setError(null)
    try {
      await fetchJSON('/api/send-message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          contactId:      conversation.contact_id ?? undefined,
          message:        content,
          type:           channel,
          ...(channel === 'Email' ? {
            subject:       emailFields.subject,
            emailFrom:     emailFields.fromEmail,
            emailFromName: emailFields.fromName,
            emailTo:       emailFields.to[0],
            emailCc:       emailFields.cc.length  ? emailFields.cc  : undefined,
            emailBcc:      emailFields.bcc.length ? emailFields.bcc : undefined,
          } : {}),
        }),
      })
      setInput('')
      if (channel === 'Email') {
        setEmailFields(prev => ({ ...prev, subject: '', cc: [], bcc: [] }))
      }
      onMessageSent(content, channel)
      inputRef.current?.focus()
      toast('Message envoyé', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi')
      toast("Erreur lors de l'envoi", 'error')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() }
  }

  const isEmail = channel === 'Email'

  return (
    <div className="flex-shrink-0 px-4 pb-3">
      {error && (
        <div className="mb-2 px-3 py-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-soren-card rounded-2xl border border-soren-border shadow-sm overflow-hidden">

        {/* ── Tabs canal style GHL ── */}
        <div className="flex items-center justify-between px-3 pt-2 border-b border-[#F0F0EE]">
          <div className="flex items-center gap-0">
            {CHANNEL_OPTIONS.map(opt => {
              const active = channel === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setChannel(opt.value)}
                  className="relative flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold transition-colors"
                  style={{ color: active ? opt.color : '#9CA3AF' }}
                >
                  {opt.icon}
                  {opt.label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                      style={{ background: opt.color }}
                    />
                  )}
                </button>
              )
            })}
          </div>
          <span className="text-[11px] text-soren-subtle font-medium pb-1">Commentaire interne</span>
        </div>

        {/* ── From / To row (SMS + WhatsApp) ── */}
        {!isEmail && (
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#F0F0EE] bg-[#FAFAF9]">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-soren-subtle font-medium">From:</span>
              <button className="flex items-center gap-1 text-[11px] font-medium text-[#374151] hover:text-[#111] transition-colors">
                No Number Available
                <ChevronDown size={10} className="text-[#C4C9D4]" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-soren-subtle font-medium">To:</span>
              <button className="flex items-center gap-1 text-[11px] font-medium text-[#374151] hover:text-[#111] transition-colors">
                {conversation.contact_phone ?? 'No Number Available'}
                <ChevronDown size={10} className="text-[#C4C9D4]" />
              </button>
            </div>
          </div>
        )}

        {/* ── Email header fields ── */}
        {isEmail && (
          <EmailHeader fields={emailFields} onChange={setEmailFields} />
        )}

        {/* ── Textarea ── */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isEmail ? "Corps de l'email..." : 'Type messages here ..'}
          rows={isEmail ? 4 : 2}
          disabled={disabled}
          className="w-full resize-none bg-soren-card px-4 py-2 text-[13px] text-soren-text placeholder-[#C4C9D4] outline-none disabled:opacity-50"
          style={{ maxHeight: isEmail ? 200 : 100, overflowY: 'auto' }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, isEmail ? 200 : 100)}px`
          }}
        />

        {/* ── Toolbar bas ── */}
        <div className="flex items-center justify-end px-3 pb-2.5">
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending || disabled}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#1a2b4a' }}
          >
            {sending
              ? <Loader2 size={15} className="text-white animate-spin" />
              : <Send size={15} className="text-white" />
            }
          </button>
        </div>

      </div>
    </div>
  )
}
