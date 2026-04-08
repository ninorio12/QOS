'use client'

import { useState, useEffect } from 'react'
import { Bot, Mic, Smartphone, Wallet, FileText, RefreshCw } from 'lucide-react'

const PERIODS = [
  { label: 'Cette semaine', key: 'week' },
  { label: 'Ce mois',       key: 'month' },
  { label: 'Trimestre',     key: 'quarter' },
] as const
type PeriodKey = typeof PERIODS[number]['key']

type BudgetData = {
  period:    string
  startDate: string
  endDate:   string
  services: {
    claude:      { cost: number; details: { messages: number; devis: number } }
    twilio:      { cost: number; details: { sms: number; calls: number } }
    vapi:        { cost: number; details: { note: string } }
    apitemplate: { cost: number; details: { pdfs: number } }
  }
  total: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 4,
  }).format(n)
}

function ServiceCard({ label, cost, sub, color, Icon, loading }: {
  label: string; cost: number; sub: string; color: string; Icon: React.ElementType; loading: boolean
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon size={16} style={{ color }} />
        </div>
        {loading
          ? <div className="h-6 w-20 bg-[#EEF0EB] rounded-lg animate-pulse" />
          : <span className="text-xl font-bold text-[#111111]">{fmt(cost)}</span>
        }
      </div>
      <p className="text-sm font-semibold text-[#111111]">{label}</p>
      <p className="text-xs text-[#6B7280] mt-0.5">{sub}</p>
    </div>
  )
}

export default function BudgetView() {
  const [period,  setPeriod]  = useState<PeriodKey>('month')
  const [data,    setData]    = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  async function load(p: PeriodKey) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/budget?period=${p}`)
      if (!res.ok) throw new Error('Erreur serveur')
      setData(await res.json() as BudgetData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(period) }, [period])

  const s = data?.services

  const cards = [
    {
      label: 'Claude API',
      cost:  s?.claude.cost ?? 0,
      sub:   s ? `${s.claude.details.messages} messages · ${s.claude.details.devis} devis générés` : '—',
      color: '#3462EE',
      Icon:  Bot,
    },
    {
      label: 'Twilio',
      cost:  s?.twilio.cost ?? 0,
      sub:   s ? `SMS ${fmt(s.twilio.details.sms)} · Appels ${fmt(s.twilio.details.calls)}` : '—',
      color: '#E8836A',
      Icon:  Smartphone,
    },
    {
      label: 'Vapi',
      cost:  s?.vapi.cost ?? 0,
      sub:   s?.vapi.details.note ?? 'Voice AI',
      color: '#14B8A6',
      Icon:  Mic,
    },
    {
      label: 'APITemplate',
      cost:  s?.apitemplate.cost ?? 0,
      sub:   s ? `${s.apitemplate.details.pdfs} devis PDF générés` : '—',
      color: '#8B5CF6',
      Icon:  FileText,
    },
  ]

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Budget</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Dépenses API en temps réel</p>
        </div>
        <button
          onClick={() => void load(period)}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#111111] transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm w-fit mb-6">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p.key ? 'bg-[#111111] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111111]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 text-sm text-red-600">{error}</div>
      )}

      {/* Total */}
      <div className="bg-[#111111] rounded-2xl p-6 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E2FF8D] flex items-center justify-center">
            <Wallet size={18} className="text-[#111111]" />
          </div>
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wide">
              Total {PERIODS.find(p => p.key === period)?.label}
            </p>
            {loading
              ? <div className="h-8 w-28 bg-white/10 rounded-lg animate-pulse mt-1" />
              : <p className="text-white text-3xl font-bold">{fmt(data?.total ?? 0)}</p>
            }
          </div>
        </div>
        {data && (
          <p className="text-white/30 text-xs text-right">
            {data.startDate}<br />→ {data.endDate}
          </p>
        )}
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {cards.map(c => (
          <ServiceCard key={c.label} {...c} loading={loading} />
        ))}
      </div>

      <p className="text-xs text-[#9CA3AF] text-center">
        Claude estimé à partir des messages Supabase · Twilio via API officielle · Vapi à connecter
      </p>
    </div>
  )
}
