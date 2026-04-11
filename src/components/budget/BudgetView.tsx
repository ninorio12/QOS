'use client'

import { useState, useEffect } from 'react'
import { Bot, Mic, Smartphone, Wallet, FileText, RefreshCw, Server, Database, Zap, Globe, CreditCard } from 'lucide-react'

const PERIODS = [
  { label: 'Cette semaine', key: 'week' },
  { label: 'Ce mois',       key: 'month' },
  { label: 'Trimestre',     key: 'quarter' },
] as const
type PeriodKey = typeof PERIODS[number]['key']

type Service = {
  label:   string
  cost:    number
  details: string
  type:    'usage' | 'subscription'
}

type BudgetData = {
  period:    string
  startDate: string
  endDate:   string
  days:      number
  services: {
    claude:      Service
    twilio:      Service
    vapi:        Service
    apitemplate: Service
    ghl:         Service
    supabase:    Service
    hetzner:     Service
    n8n:         Service
    vercel:      Service
  }
  total: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 4,
  }).format(n)
}

const SERVICE_META: Record<string, { icon: React.ElementType; color: string }> = {
  claude:      { icon: Bot,        color: '#3462EE' },
  twilio:      { icon: Smartphone, color: '#E8836A' },
  vapi:        { icon: Mic,        color: '#14B8A6' },
  apitemplate: { icon: FileText,   color: '#8B5CF6' },
  ghl:         { icon: Zap,        color: '#F59E0B' },
  supabase:    { icon: Database,   color: '#3FCF8E' },
  hetzner:     { icon: Server,     color: '#D44444' },
  n8n:         { icon: CreditCard, color: '#EA4B71' },
  vercel:      { icon: Globe,      color: '#111111' },
}

function ServiceCard({ id, service, loading }: { id: string; service: Service; loading: boolean }) {
  const meta = SERVICE_META[id] ?? { icon: Wallet, color: '#6B7280' }
  const Icon = meta.icon
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: meta.color + '18' }}>
        <Icon size={13} style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#111111] leading-none mb-0.5">{service.label}</p>
        <p className="text-xs text-[#9CA3AF] truncate">{service.details}</p>
      </div>
      {loading
        ? <div className="h-4 w-14 bg-[#EEF0EB] rounded animate-pulse flex-shrink-0" />
        : <span className="text-sm font-bold text-[#111111] flex-shrink-0">{fmt(service.cost)}</span>
      }
    </div>
  )
}

export default function BudgetView() {
  const [period,  setPeriod]  = useState<PeriodKey>('month')
  const [data,    setData]    = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  async function load(p: PeriodKey) {
    setLoading(true); setError(null)
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

  useEffect(() => {
    void load(period)
    const interval = setInterval(() => { void load(period) }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [period])

  const usageKeys        = ['claude', 'twilio', 'vapi', 'apitemplate'] as const
  const subscriptionKeys = ['ghl', 'supabase', 'hetzner', 'n8n', 'vercel'] as const

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] p-4 gap-3">

      {/* Header + tabs sur la même ligne */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-[#111111]">Budget</h1>
          <p className="text-xs text-[#9CA3AF]">Dépenses API et abonnements en temps réel</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p.key ? 'bg-[#111111] text-white' : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load(period)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#111111] transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">{error}</div>
      )}

      {/* Total */}
      <div className="flex-shrink-0 bg-[#111111] rounded-2xl px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E2FF8D] flex items-center justify-center flex-shrink-0">
            <Wallet size={16} className="text-[#111111]" />
          </div>
          <div>
            <p className="text-white/50 text-[11px] font-medium uppercase tracking-wide">
              Total {PERIODS.find(p => p.key === period)?.label}
            </p>
            {loading
              ? <div className="h-7 w-28 bg-white/10 rounded-lg animate-pulse mt-0.5" />
              : <p className="text-white text-2xl font-bold leading-none mt-0.5">{fmt(data?.total ?? 0)}</p>
            }
          </div>
        </div>
        {data && (
          <p className="text-white/25 text-xs text-right">{data.startDate}<br />→ {data.endDate}</p>
        )}
      </div>

      {/* Services — 2 colonnes côte à côte */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">

        {/* Usage API */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Usage API</p>
          <div className="flex flex-col gap-2 flex-1">
            {usageKeys.map(key => (
              <ServiceCard
                key={key} id={key}
                service={data?.services[key] ?? { label: key, cost: 0, details: '—', type: 'usage' }}
                loading={loading}
              />
            ))}
          </div>
        </div>

        {/* Abonnements */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Abonnements</p>
          <div className="flex flex-col gap-2 flex-1">
            {subscriptionKeys.map(key => (
              <ServiceCard
                key={key} id={key}
                service={data?.services[key] ?? { label: key, cost: 0, details: '—', type: 'subscription' }}
                loading={loading}
              />
            ))}
          </div>
        </div>

      </div>

      <p className="text-[11px] text-[#C4C4C4] text-center flex-shrink-0 pb-1">
        Claude estimé depuis Supabase · Twilio &amp; Hetzner via API officielle · Abonnements proratisés
      </p>

    </div>
  )
}
