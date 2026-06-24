'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { X, ShieldCheck, Loader2, RefreshCw, Activity, Lock, Hash, KeyRound } from 'lucide-react'
import MetaLogo from './MetaLogo'

const VALUE_PROPS = [
  { Icon: RefreshCw,   t: 'Synchronisation automatique', s: 'Campagnes, adsets & publicités rafraîchis toutes les heures.' },
  { Icon: Activity,    t: 'Performance en temps réel',   s: 'Dépense, leads, CPL, CTR et CR directement dans le Data OS.' },
  { Icon: ShieldCheck, t: 'Connexion sécurisée',         s: 'Jeton chiffré côté serveur, révocable à tout moment.' },
]
const PERMS = ['ads_read', 'read_insights', 'leads_retrieval', 'business_management']

export default function MetaConnectModal({ onClose }: { onClose: () => void }) {
  const connect = useMutation(api.mediaBuyer.connect)
  const [accountId, setAccountId] = useState('')
  const [accountName, setAccountName] = useState('')
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fermeture clavier (Échap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const ready = accountId.trim().length > 3 && token.trim().length > 10
  const submit = async () => {
    if (!ready || saving) return
    setSaving(true); setError(null)
    try {
      await connect({ accountId, accountName: accountName || undefined, token })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion échouée. Vérifie l\'ID de compte et le jeton.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={onClose}
      style={{ animation: 'fadeSlideUp 160ms ease-out both' }}
    >
      <div
        className="relative w-full max-w-[960px] max-h-[92vh] overflow-hidden rounded-[24px] bg-soren-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] [transform:translateZ(0)]"
        onClick={e => e.stopPropagation()}
      >
        {/* ───────── Panneau gauche — éditorial premium ───────── */}
        <aside className="relative hidden lg:flex flex-col justify-between p-8 overflow-hidden text-white bg-[#14100C]">
          {/* halo décoratif orange, discret */}
          <div className="pointer-events-none absolute -top-28 -right-24 w-72 h-72 rounded-full bg-soren-accent/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:24px_24px]" />

          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur grid place-items-center">
                <MetaLogo size={20} color="#ffffff" />
              </div>
              <div className="text-[9.5px] font-semibold tracking-[2px] uppercase text-white/45">Intégration</div>
            </div>

            <h2 className="mt-6 text-[19px] font-bold leading-[1.2] tracking-tight">
              Connectez votre<br />compte Meta Business
            </h2>
            <p className="mt-2.5 text-[12px] leading-relaxed text-white/55 max-w-[290px]">
              Reliez votre compte publicitaire pour piloter toute votre acquisition Meta depuis le Data OS.
            </p>

            <div className="mt-7 flex flex-col gap-4">
              {VALUE_PROPS.map(({ Icon, t, s }) => (
                <div key={t} className="flex gap-3">
                  <div className="mt-0.5 w-8 h-8 flex-none rounded-lg bg-white/[0.07] ring-1 ring-white/10 grid place-items-center">
                    <Icon size={14} className="text-white/85" />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold">{t}</div>
                    <div className="text-[11px] text-white/50 leading-snug mt-0.5">{s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-7">
            <div className="text-[9px] font-semibold tracking-[1.5px] uppercase text-white/35 mb-2">Permissions demandées</div>
            <div className="flex flex-wrap gap-1.5">
              {PERMS.map(p => (
                <span key={p} className="text-[10px] font-medium text-white/70 bg-white/[0.06] ring-1 ring-white/10 rounded-full px-2 py-0.5">{p}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* ───────── Panneau droit — formulaire ───────── */}
        <section className="relative p-8 sm:p-9 overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full grid place-items-center text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-colors"
            aria-label="Fermer"
          >
            <X size={17} />
          </button>

          {/* logo Meta visible aussi en mobile (panneau gauche masqué) */}
          <div className="lg:hidden w-12 h-12 rounded-2xl bg-soren-elevated grid place-items-center mb-4">
            <MetaLogo size={24} />
          </div>

          <div className="text-[9.5px] font-semibold tracking-[1.5px] uppercase text-soren-accent">Meta Ads</div>
          <h3 className="mt-1.5 text-[15px] font-bold tracking-tight text-soren-text">Relier le compte publicitaire</h3>
          <p className="mt-1 text-[11.5px] text-soren-muted leading-relaxed">
            Renseignez votre identifiant de compte et un jeton longue durée Meta Business.
          </p>

          <div className="mt-6 flex flex-col gap-3.5">
            <Field
              icon={Hash}
              label="Ad Account ID"
              value={accountId}
              onChange={setAccountId}
              placeholder="act_1234567890"
            />
            <Field
              label="Nom du compte"
              optional
              value={accountName}
              onChange={setAccountName}
              placeholder="VividFlow Ads"
            />
            <Field
              icon={KeyRound}
              label="System User Access Token"
              value={token}
              onChange={setToken}
              placeholder="EAAG… (jeton longue durée)"
              mono
              hint="Business Settings → Utilisateurs système → Générer un jeton (ads_read, read_insights)."
            />
          </div>

          {error && <p className="mt-4 text-[11.5px] text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button
            onClick={submit}
            disabled={!ready || saving}
            className="group w-full mt-6 inline-flex items-center justify-center gap-2 text-[12.5px] font-semibold text-white bg-soren-accent rounded-xl py-3 shadow-lg shadow-soren-accent/25 hover:opacity-95 disabled:opacity-40 disabled:shadow-none transition-all"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Connexion en cours…' : 'Connecter le compte'}
          </button>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-soren-subtle">
            <Lock size={12} className="flex-none" />
            Connexion chiffrée. Révocable à tout moment depuis Meta Business Settings.
          </div>
        </section>
      </div>
    </div>,
    document.body,
  )
}

function Field({ icon: Icon, label, optional, value, onChange, placeholder, mono, hint }: {
  icon?: React.ElementType; label: string; optional?: boolean
  value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; hint?: string
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.5px] uppercase text-soren-subtle mb-1.5">
        {label}
        {optional && <span className="normal-case tracking-normal font-medium text-soren-subtle/70">· facultatif</span>}
      </label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle pointer-events-none" />}
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-soren-elevated border border-soren-border rounded-lg py-2.5 text-[12px] text-soren-text outline-none transition-colors focus:border-soren-accent focus:ring-2 focus:ring-soren-accent/15 ${Icon ? 'pl-9 pr-3' : 'px-3'} ${mono ? 'font-mono' : ''}`}
        />
      </div>
      {hint && <p className="mt-1.5 text-[10px] text-soren-subtle leading-snug">{hint}</p>}
    </div>
  )
}
