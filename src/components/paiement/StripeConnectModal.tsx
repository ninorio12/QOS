'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { X, KeyRound, ShieldCheck, Loader2, CreditCard, Copy, Check, ExternalLink, Webhook } from 'lucide-react'

const WEBHOOK_URL = (process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? 'https://standing-malamute-439.eu-west-1.convex.site') + '/stripe/webhook'

function Copyable({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="group inline-flex items-center gap-2 max-w-full bg-white/[0.06] ring-1 ring-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white/80 hover:ring-white/25 transition-colors"
    >
      <span className="truncate">{value}</span>
      {copied ? <Check size={12} className="text-emerald-400 flex-none" /> : <Copy size={12} className="text-white/40 group-hover:text-white/70 flex-none" />}
    </button>
  )
}

export default function StripeConnectModal({ onClose }: { onClose: () => void }) {
  const connect = useMutation(api.stripe.connect)
  const [secretKey, setSecretKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [accountName, setAccountName] = useState('')
  const [saving, setSaving] = useState(false)

  // Fermeture clavier (Échap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const ready = secretKey.trim().startsWith('sk_')
  const submit = async () => {
    if (!ready || saving) return
    setSaving(true)
    try {
      await connect({ secretKey, webhookSecret: webhookSecret || undefined, accountName: accountName || undefined })
      onClose()
    } finally { setSaving(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose} style={{ animation: 'fadeSlideUp 160ms ease-out both' }}>
      <div
        className="relative w-full max-w-[960px] max-h-[92vh] overflow-hidden rounded-[24px] bg-soren-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] [transform:translateZ(0)]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Panneau gauche — guide ── */}
        <aside className="relative hidden lg:flex flex-col justify-between p-8 overflow-hidden text-white bg-[#14100C]">
          <div className="pointer-events-none absolute -top-28 -right-24 w-72 h-72 rounded-full bg-soren-accent/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:24px_24px]" />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] ring-1 ring-white/10 grid place-items-center"><CreditCard size={20} className="text-white" /></div>
              <div className="text-[9.5px] font-semibold tracking-[2px] uppercase text-white/45">Intégration</div>
            </div>
            <h2 className="mt-6 text-[19px] font-bold leading-[1.2] tracking-tight">Brancher votre compte Stripe</h2>
            <p className="mt-2.5 text-[12px] leading-relaxed text-white/55 max-w-[300px]">
              Encaissements et remboursements réels remontent dans le module ; l'« à collecter » se réconcilie avec tes échéances.
            </p>

            <div className="mt-7 space-y-4">
              <GuideStep n={1} icon={KeyRound} title="Clé secrète API">
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-soren-accent inline-flex items-center gap-1 hover:underline">Développeurs → Clés API <ExternalLink size={10} /></a> → copie la <b className="text-white/80">clé secrète</b> (<span className="font-mono">sk_…</span>).
              </GuideStep>
              <GuideStep n={2} icon={Webhook} title="Webhook (temps réel)">
                <span>Développeurs → Webhooks → <b className="text-white/80">Ajouter un endpoint</b>. URL :</span>
                <div className="mt-1.5"><Copyable value={WEBHOOK_URL} /></div>
                <span className="block mt-1.5">Événements (le plus simple : coche <b className="text-white/80">tous les <span className="font-mono">charge.*</span></b>) — au minimum : <span className="font-mono text-white/80">charge.succeeded</span>, <span className="font-mono text-white/80">charge.pending</span>, <span className="font-mono text-white/80">charge.failed</span>, <span className="font-mono text-white/80">charge.refunded</span>, <span className="font-mono text-white/80">charge.dispute.created</span>, <span className="font-mono text-white/80">charge.dispute.closed</span>. Puis copie le <b className="text-white/80">secret de signature</b> (<span className="font-mono">whsec_…</span>).</span>
              </GuideStep>
              <GuideStep n={3} icon={Check} title="Coller & synchroniser">
                Colle les deux clés à droite → <b className="text-white/80">Connecter</b>, puis <b className="text-white/80">Sync Stripe</b> pour l'historique.
              </GuideStep>
            </div>
          </div>
          <div className="relative flex items-center gap-2 text-[11px] text-white/45 mt-7">
            <ShieldCheck size={13} className="flex-none" /> Clés chiffrées côté serveur, jamais renvoyées au navigateur.
          </div>
        </aside>

        {/* ── Panneau droit — formulaire ── */}
        <section className="relative p-8 sm:p-9 overflow-y-auto">
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full grid place-items-center text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-colors"><X size={17} /></button>
          <div className="lg:hidden w-10 h-10 rounded-xl bg-soren-elevated grid place-items-center mb-4"><CreditCard size={20} className="text-soren-text" /></div>
          <div className="text-[9.5px] font-semibold tracking-[1.5px] uppercase text-soren-accent">Paiement · Stripe</div>
          <h3 className="mt-1.5 text-[15px] font-bold tracking-tight text-soren-text">Connecter Stripe</h3>
          <p className="mt-1 text-[11.5px] text-soren-muted leading-relaxed">Colle ta clé secrète et le secret de signature du webhook.</p>

          <div className="mt-6 flex flex-col gap-3.5">
            <Field icon={KeyRound} label="Clé secrète" value={secretKey} onChange={setSecretKey} placeholder="sk_live_… ou sk_test_…" mono />
            <Field icon={Webhook} label="Secret de signature du webhook" optional value={webhookSecret} onChange={setWebhookSecret} placeholder="whsec_…" mono hint="Sans lui, la réception temps réel des paiements ne sera pas vérifiée." />
            <Field label="Nom du compte" optional value={accountName} onChange={setAccountName} placeholder="VividFlow LTD" />
          </div>

          <button onClick={submit} disabled={!ready || saving} className="w-full mt-6 inline-flex items-center justify-center gap-2 text-[12.5px] font-semibold text-white bg-soren-accent rounded-xl py-3 shadow-lg shadow-soren-accent/25 hover:opacity-95 disabled:opacity-40 disabled:shadow-none transition-all">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
            {saving ? 'Connexion…' : 'Connecter le compte'}
          </button>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-soren-subtle">
            <ShieldCheck size={12} className="flex-none" /> Révocable à tout moment. Commence en mode test (<span className="font-mono">sk_test</span>) si tu préfères.
          </div>
        </section>
      </div>
    </div>,
    document.body,
  )
}

function GuideStep({ n, icon: Icon, title, children }: { n: number; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 w-8 h-8 flex-none rounded-lg bg-white/[0.07] ring-1 ring-white/10 grid place-items-center"><Icon size={14} className="text-white/85" /></div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold flex items-center gap-1.5"><span className="text-soren-accent">{n}.</span>{title}</div>
        <div className="text-[11px] text-white/50 leading-relaxed mt-0.5">{children}</div>
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, optional, value, onChange, placeholder, mono, hint }: {
  icon?: React.ElementType; label: string; optional?: boolean; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; hint?: string
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.5px] uppercase text-soren-subtle mb-1.5">
        {label}{optional && <span className="normal-case tracking-normal font-medium text-soren-subtle/70">· facultatif</span>}
      </label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle pointer-events-none" />}
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full bg-soren-elevated border border-soren-border rounded-lg py-2.5 text-[12px] text-soren-text outline-none transition-colors focus:border-soren-accent focus:ring-2 focus:ring-soren-accent/15 ${Icon ? 'pl-9 pr-3' : 'px-3'} ${mono ? 'font-mono' : ''}`} />
      </div>
      {hint && <p className="mt-1.5 text-[10px] text-soren-subtle leading-snug">{hint}</p>}
    </div>
  )
}
