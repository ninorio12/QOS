'use client'

import { MotionStagger, MotionItem } from '@/components/ui/Motion'
import { Bot, Cpu, Server, Globe, Database, Lock, Brain, Wallet, type LucideIcon } from 'lucide-react'

type Service = { id: string; label: string; details: string; cost: number; Icon: LucideIcon; color: string }

// Stack actuel du Data OS — coûts source en USD, convertis en CHF à l'affichage.
const PAID: Service[] = [
  { id: 'claude', label: 'Claude Code',   details: 'Anthropic — abonnement Max', cost: 200, Icon: Bot,    color: '#D97757' },
  { id: 'codex',  label: 'Codex',         details: 'OpenAI',                     cost: 100, Icon: Cpu,    color: '#111111' },
  { id: 'convex', label: 'Convex',        details: 'Pro — compte partagé',       cost: 25,  Icon: Database, color: '#EE342F' },
  { id: 'vercel', label: 'Vercel',        details: 'Pro — compte partagé',       cost: 20,  Icon: Globe,  color: '#111111' },
  { id: 'hermes', label: 'Hermes Tools',  details: 'Agents & serveur MCP',       cost: 20,  Icon: Server, color: '#FF4D00' },
  { id: 'vps',    label: 'VPS Hostinger', details: 'KVM',                        cost: 12,  Icon: Server, color: '#673DE6' },
]
const FREE: Service[] = [
  { id: 'clerk',       label: 'Clerk',       details: 'Gratuit ≤ 50k utilisateurs', cost: 0, Icon: Lock,    color: '#6C47FF' },
  { id: 'supermemory', label: 'Supermemory', details: 'Free tier',                cost: 0, Icon: Brain,    color: '#8B5CF6' },
]
// Taux USD→CHF (au 2026-06-08). À ajuster si besoin.
const USD_TO_CHF = 0.7961
const toChf = (usd: number) => Math.round(usd * USD_TO_CHF)
const chf = (chfAmount: number) => `${chfAmount.toLocaleString('fr-FR')} CHF`

// Total = arrondi UNE SEULE FOIS sur la somme brute (pas un arrondi par ligne puis somme).
const TOTAL = Math.round(PAID.reduce((s, x) => s + x.cost * USD_TO_CHF, 0))

function ServiceCard({ s }: { s: Service }) {
  return (
    <div className="bg-soren-card rounded-xl p-3 shadow-sm flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: s.color + '18' }}>
        <s.Icon size={13} style={{ color: s.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-normal text-soren-text leading-none mb-0.5">{s.label}</p>
        <p className="text-xs text-soren-subtle truncate">{s.details}</p>
      </div>
      {s.cost === 0
        ? <span className="text-xs font-bold text-[#16A34A] flex-shrink-0">Gratuit</span>
        : <span className="text-sm font-bold text-soren-text flex-shrink-0">{chf(toChf(s.cost))}</span>}
    </div>
  )
}

export default function BudgetView() {
  return (
    <MotionStagger className="flex flex-col md:h-[calc(100vh-48px)] p-4 pb-24 md:pb-4 gap-3">
      <MotionItem className="flex-shrink-0">
        <p className="text-xs text-soren-subtle">Abonnements & outils du Data OS — coût mensuel (CHF)</p>
      </MotionItem>

      {/* Total */}
      <MotionItem className="flex-shrink-0 bg-soren-sidebar rounded-2xl px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF4D00] flex items-center justify-center flex-shrink-0">
            <Wallet size={16} className="text-soren-text" />
          </div>
          <div>
            <p className="text-white/50 text-[11px] font-medium uppercase tracking-wide">Total mensuel</p>
            <p className="text-white text-2xl font-bold leading-none mt-0.5">{TOTAL.toLocaleString('fr-FR')}<span className="text-white/40 text-sm font-semibold ml-1">CHF</span><span className="text-white/40 text-sm font-medium"> / mois</span></p>
          </div>
        </div>
        <p className="text-white/25 text-xs text-right">{PAID.length} payants · {FREE.length} gratuits</p>
      </MotionItem>

      {/* Services — 2 colonnes */}
      <MotionItem className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-soren-subtle">Payant</p>
          <div className="flex flex-col gap-2 flex-1">
            {PAID.map(s => <ServiceCard key={s.id} s={s} />)}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-soren-subtle">Inclus (gratuit)</p>
          <div className="flex flex-col gap-2 flex-1">
            {FREE.map(s => <ServiceCard key={s.id} s={s} />)}
          </div>
        </div>
      </MotionItem>

      <p className="text-[11px] text-[#C4C4C4] text-center flex-shrink-0 pb-1">
        Vercel & Convex en Pro (compte partagé). Gratuits tant que sous les seuils : Clerk ≤ 50k · Supermemory free. Hors TVA.
      </p>
    </MotionStagger>
  )
}
