'use client'

import { useState } from 'react'
import useSWR from 'swr'
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
    <div className="bg-soren-card rounded-xl p-3 shadow-sm flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: meta.color + '18' }}>
        <Icon size={13} style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-soren-text leading-none mb-0.5">{service.label}</p>
        <p className="text-xs text-soren-subtle truncate">{service.details}</p>
      </div>
      {loading
        ? <div className="h-4 w-14 bg-soren-app rounded animate-pulse flex-shrink-0" />
        : <span className="text-sm font-bold text-soren-text flex-shrink-0">{fmt(service.cost)}</span>
      }
    </div>
  )
}

export default function BudgetView() {
  const [period, setPeriod] = useState<PeriodKey>('month')

  const { data, isLoading, error, mutate } = useSWR<BudgetData>(
    `/api/budget?period=${period}`,
    (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('Erreur serveur'); return r.json() }),
    {
      revalidateOnFocus: false,
      dedupingInterval:  300_000,
      keepPreviousData:  true,
    }
  )

  const loading = isLoading && !data

  const usageKeys        = ['claude', 'twilio', 'vapi', 'apitemplate'] as const
  const subscriptionKeys = ['ghl', 'supabase', 'hetzner', 'n8n', 'vercel'] as const

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] p-4 gap-3">

      {/* Header + tabs sur la même ligne */}
      <div className="flex items-center justify-between flex-shrink-0" style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}>
        <div>
          <p className="text-xs text-soren-subtle">Dépenses API et abonnements en temps réel</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-soren-card rounded-xl p-1 shadow-sm">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p.key ? 'bg-soren-sidebar text-white' : 'text-soren-muted hover:text-soren-text'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { void mutate() }}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-soren-subtle hover:text-soren-text transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">Erreur lors du chargement du budget.</div>
      )}

      {/* Total */}
      <div className="flex-shrink-0 bg-soren-sidebar rounded-2xl px-5 py-4 flex items-center justify-between" style={{ animation: 'fadeSlideUp 400ms ease-out 80ms both' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF4D00] flex items-center justify-center flex-shrink-0">
            <Wallet size={16} className="text-soren-text" />
          </div>
          <div>
            <p className="text-white/50 text-[11px] font-medium uppercase tracking-wide">
              Total {PERIODS.find(p => p.key === period)?.label}
            </p>
            {loading
              ? <div className="h-7 w-28 bg-soren-card/10 rounded-lg animate-pulse mt-0.5" />
              : <p className="text-white text-2xl font-bold leading-none mt-0.5">{fmt(data?.total ?? 0)}</p>
            }
          </div>
        </div>
        {data && (
          <p className="text-white/25 text-xs text-right">{data.startDate} — {data.endDate}</p>
        )}
      </div>

      {/* Services — 2 colonnes côte à côte */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0" style={{ animation: 'fadeSlideUp 400ms ease-out 160ms both' }}>

        {/* Usage API */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-soren-subtle">Usage API</p>
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
          <p className="text-[11px] font-bold uppercase tracking-widest text-soren-subtle">Abonnements</p>
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
