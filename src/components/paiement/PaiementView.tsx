'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CreditCard, ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react'

function fmt(n: number) { return `${Math.round(Math.abs(n)).toLocaleString('fr-FR')} €` }

type Txn = { contactId: string; client: string; company: string; label: string; amount: number; date: string; type: 'payment' | 'refund'; status: 'encaissé' | 'attente' }
type Overview = { encaisse: number; attente: number; rembourse: number; net: number; transactions: Txn[] }

export default function PaiementView() {
  const data = useQuery(api.onboarding.paymentsOverview) as Overview | undefined
  const ov = data ?? { encaisse: 0, attente: 0, rembourse: 0, net: 0, transactions: [] }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide">
          <CreditCard size={14} className="text-[#FF4D00]" />
          <span className="text-soren-subtle">VIVIDFLOW</span>
          <ChevronRight size={11} className="text-soren-subtle" />
          <span className="text-soren-text">PAIEMENT</span>
        </div>
        <p className="text-[11px] text-soren-subtle mt-1">Tour de contrôle — paiements clients au jour le jour</p>
      </div>

      {/* KPI cards */}
      <div className="px-6 grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        <Card label="Montant encaissé" value={fmt(ov.encaisse)} bg="#DCFCE7" color="#16A34A" />
        <Card label="Montant en attente" value={fmt(ov.attente)} bg="#FEF9C3" color="#CA8A04" />
        <Card label="Remboursé" value={fmt(ov.rembourse)} bg="#FEF2F2" color="#DC2626" />
        <Card label="Net encaissé" value={fmt(ov.net)} bg="#F3F4F6" color="#111111" />
      </div>

      {/* Transactions */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-soren-border flex items-center justify-between">
            <span className="text-[12px] font-bold text-soren-text">Transactions</span>
            <span className="text-[11px] text-soren-subtle">{ov.transactions.length} mouvement{ov.transactions.length !== 1 ? 's' : ''}</span>
          </div>
          {ov.transactions.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-soren-subtle">Aucune transaction — les paiements des clients apparaîtront ici.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-soren-border/60">
                  {['', 'CLIENT', 'LIBELLÉ', 'DATE', 'MONTANT', 'STATUT'].map((h, i) => (
                    <th key={i} className="px-4 py-2 text-left text-[9px] font-bold text-soren-subtle tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ov.transactions.map((t, i) => (
                  <tr key={i} className="border-b border-soren-border/40 hover:bg-soren-elevated/40 transition-colors">
                    <td className="pl-4 py-2.5 w-8">
                      {t.type === 'refund'
                        ? <ArrowUpRight size={14} className="text-[#DC2626]" />
                        : <ArrowDownLeft size={14} className={t.status === 'encaissé' ? 'text-[#16A34A]' : 'text-[#CA8A04]'} />}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-[12px] font-semibold text-soren-text">{t.client}</div>
                      {t.company && <div className="text-[10px] text-soren-subtle">{t.company}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-soren-muted">{t.label}</td>
                    <td className="px-4 py-2.5 text-[11px] text-soren-muted whitespace-nowrap">{t.date ? new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-2.5 text-[12px] font-bold tabular-nums whitespace-nowrap" style={{ color: t.type === 'refund' ? '#DC2626' : (t.status === 'encaissé' ? '#16A34A' : '#374151') }}>
                      {t.type === 'refund' ? '−' : ''}{fmt(t.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={
                        t.type === 'refund' ? { background: '#FEF2F2', color: '#DC2626' }
                        : t.status === 'encaissé' ? { background: '#DCFCE7', color: '#16A34A' }
                        : { background: '#FEF9C3', color: '#CA8A04' }}>
                        {t.type === 'refund' ? 'remboursé' : t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-[10px] text-soren-subtle mt-3 px-1">
          Marque les échéances comme encaissées depuis la phase <b>Paiement</b> de chaque client dans le module Onboarding.
        </p>
      </div>
    </div>
  )
}

function Card({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) {
  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ background: bg }}>
      <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
      <p className="text-[24px] md:text-[26px] font-black tabular-nums leading-tight" style={{ color }}>{value}</p>
    </div>
  )
}
