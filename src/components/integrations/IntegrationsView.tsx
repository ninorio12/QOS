'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ChevronDown, X, BadgeCheck, LayoutGrid, List, Link2, Eye, EyeOff } from 'lucide-react'

type Integration = {
  key: string; name: string; domain: string; description: string; category: string
  kind: 'core' | 'env' | 'manual'; manageable: boolean; connected: boolean; source: string; account: string; logo?: string
}

const INDIGO = '#FF4D00'
const BRAND: Record<string, string> = {
  convex: '#EE342F', vercel: '#000000', supabase: '#3ECF8E', hermes: '#FF4D00', anthropic: '#D97757',
  tldv: '#3462EE', stripe: '#635BFF', twilio: '#F22F46', slack: '#611f69', telegram: '#229ED9',
  ghl: '#16A34A', notion: '#111111', github: '#181717', lucidchart: '#F2682C',
}

function Logo({ it, size = 36, round = false }: { it: Integration; size?: number; round?: boolean }) {
  const [step, setStep] = useState(0)
  const color = BRAND[it.key] ?? '#6B7280'
  const cls = round ? 'rounded-full' : 'rounded-xl'
  // Logos officiels : override explicite (it.logo) → favicon Google du domaine → initiale.
  const fav = it.domain ? `https://www.google.com/s2/favicons?domain=${it.domain}&sz=128` : ''
  const srcs = [it.logo, fav].filter(Boolean) as string[]
  if (srcs[step]) {
    return (
      <div className={`${cls} bg-white border border-soren-border flex items-center justify-center overflow-hidden flex-shrink-0`} style={{ width: size, height: size }}>
        <img src={srcs[step]} alt={it.name} style={{ width: size * 0.64, height: size * 0.64 }} className="object-contain" onError={() => setStep(s => s + 1)} />
      </div>
    )
  }
  return <div className={`${cls} flex items-center justify-center flex-shrink-0 text-white font-black`} style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>{it.name[0]}</div>
}

// Petit dropdown style "All Apps / All Categories"
function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) } document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  const current = options.find(o => o.value === value)?.label ?? label
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-2 bg-soren-card border border-soren-border rounded-xl px-3.5 py-2 text-[12px] font-semibold text-soren-text hover:bg-soren-elevated transition-colors">
        {current} <ChevronDown size={13} className="text-soren-subtle" />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 bg-soren-card border border-soren-border rounded-2xl shadow-xl py-1.5 min-w-[180px]">
          {options.map(o => <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }} className={`w-full text-left px-3.5 py-1.5 text-[12px] hover:bg-soren-elevated ${o.value === value ? 'text-[#FF4D00] font-semibold' : 'text-soren-text'}`}>{o.label}</button>)}
        </div>
      )}
    </div>
  )
}

function ConnectBtn({ it, onConnect, onDisconnect }: { it: Integration; onConnect: () => void; onDisconnect: () => void }) {
  if (it.connected) {
    const clickable = it.manageable && it.source === 'manual'
    return (
      <button onClick={clickable ? onDisconnect : undefined} title={clickable ? 'Déconnecter' : 'Actif'}
        className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-1.5 rounded-lg border transition-colors ${clickable ? 'group' : 'cursor-default'}`}
        style={{ borderColor: INDIGO, color: INDIGO }}>
        <BadgeCheck size={13} /> <span className={clickable ? 'group-hover:hidden' : ''}>Connecté</span>{clickable && <span className="hidden group-hover:inline">Déconnecter</span>}
      </button>
    )
  }
  if (!it.manageable) return <span className="text-[11px] text-soren-subtle px-2 py-1.5">Géré (plateforme)</span>
  return <button onClick={onConnect} className="text-[12px] font-semibold px-4 py-1.5 rounded-lg border border-soren-border text-soren-text hover:border-[#C8CBD0] hover:bg-soren-elevated transition-colors">Connecter</button>
}

export default function IntegrationsView() {
  const [items, setItems] = useState<Integration[] | null>(null)
  const [connectKey, setConnectKey] = useState<string | null>(null)
  const [secret, setSecret] = useState(''); const [showSecret, setShowSecret] = useState(false); const [busy, setBusy] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [appFilter, setAppFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')

  const load = useCallback(async () => {
    try { const r = await fetch('/api/integrations', { cache: 'no-store' }); const d = await r.json(); setItems(d.integrations ?? []) } catch { setItems([]) }
  }, [])
  useEffect(() => { void load() }, [load])

  const connecting = items?.find(i => i.key === connectKey) ?? null
  async function submitConnect() {
    if (!connectKey) return; setBusy(true)
    try { await fetch('/api/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: connectKey, secret: secret.trim() || undefined }) }); setConnectKey(null); setSecret(''); await load() } finally { setBusy(false) }
  }
  async function disconnect(key: string) { await fetch('/api/integrations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }); await load() }

  const cats = useMemo(() => Array.from(new Set((items ?? []).map(i => i.category))), [items])
  const shown = useMemo(() => (items ?? []).filter(i =>
    (catFilter === 'all' || i.category === catFilter) &&
    (appFilter === 'all' || (appFilter === 'connected' ? i.connected : !i.connected))
  ), [items, catFilter, appFilter])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Dropdown label="Toutes les apps" value={appFilter} onChange={setAppFilter} options={[{ value: 'all', label: 'Toutes les apps' }, { value: 'connected', label: 'Connectées' }, { value: 'disconnected', label: 'Non connectées' }]} />
            <Dropdown label="Toutes catégories" value={catFilter} onChange={setCatFilter} options={[{ value: 'all', label: 'Toutes catégories' }, ...cats.map(c => ({ value: c, label: c }))]} />
          </div>
          <div className="flex items-center gap-0.5 bg-soren-card border border-soren-border rounded-xl p-0.5">
            <button onClick={() => setView('grid')} className={`w-8 h-7 rounded-lg flex items-center justify-center ${view === 'grid' ? 'bg-soren-elevated text-[#FF4D00]' : 'text-soren-subtle'}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('list')} className={`w-8 h-7 rounded-lg flex items-center justify-center ${view === 'list' ? 'bg-soren-elevated text-[#FF4D00]' : 'text-soren-subtle'}`}><List size={14} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
        {items === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="h-36 rounded-2xl bg-soren-elevated animate-pulse" />)}</div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {shown.map(it => (
              <div key={it.key} className="bg-soren-card border border-soren-border rounded-xl p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <Logo it={it} size={32} />
                  <ConnectBtn it={it} onConnect={() => { setConnectKey(it.key); setSecret('') }} onDisconnect={() => disconnect(it.key)} />
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[11px] font-normal text-soren-text truncate">{it.name}</span>
                  <BadgeCheck size={12} className="text-[#16A34A] flex-shrink-0" />
                </div>
                <p className="text-[10.5px] text-soren-subtle leading-snug line-clamp-2">{it.description}{it.account ? ` · ${it.account}` : ''}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col rounded-2xl border border-soren-border overflow-hidden bg-soren-card">
            {shown.map((it, i) => (
              <div key={it.key} className={`flex items-center gap-3.5 px-4 py-3 ${i > 0 ? 'border-t border-soren-border/60' : ''}`}>
                <Logo it={it} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="text-[13px] font-bold text-soren-text truncate">{it.name}</span><BadgeCheck size={13} className="text-[#16A34A]" /></div>
                  <p className="text-[11px] text-soren-subtle truncate">{it.description}</p>
                </div>
                <ConnectBtn it={it} onConnect={() => { setConnectKey(it.key); setSecret('') }} onDisconnect={() => disconnect(it.key)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect modal — fond flouté (screen 2) */}
      {connecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={() => setConnectKey(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" style={{ animation: 'fadeSlideUp 200ms ease-out both' }}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#F0F0F0]">
              <h2 className="text-[15px] font-black text-[#111]">Intégrer {connecting.name}</h2>
              <button onClick={() => setConnectKey(null)} className="w-7 h-7 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF] hover:bg-[#F9F9F7]"><X size={14} /></button>
            </div>
            <div className="px-6 py-5 flex flex-col items-center gap-1.5">
              {/* logos qui se chevauchent + lien */}
              <div className="flex items-center justify-center mb-1">
                <Logo it={connecting} size={56} round />
                <div className="w-8 h-8 rounded-full bg-white shadow-md border border-[#EEE] -mx-3 z-10 flex items-center justify-center"><Link2 size={14} className="text-[#9CA3AF]" /></div>
                <div className="w-14 h-14 rounded-full bg-white border border-[#EEE] shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0"><img src="/vividflow-logo.png" alt="VividFlow" className="w-11 h-11 object-contain" /></div>
              </div>
              <h3 className="text-[18px] font-black text-[#111] text-center mt-1">Connecter {connecting.name} à votre espace</h3>
              <p className="text-[12px] text-[#6B7280] text-center leading-snug max-w-xs">{connecting.description}. Connecte le service en renseignant sa clé d&apos;accès.</p>
            </div>
            <div className="px-6 pb-2 flex flex-col gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Clé API / Token</label>
                <div className="relative">
                  <input value={secret} onChange={e => setSecret(e.target.value)} autoFocus type={showSecret ? 'text' : 'password'} placeholder="••••••••••••"
                    className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[13px] text-[#111] outline-none focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 transition-all" />
                  <button onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">{showSecret ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <button onClick={submitConnect} disabled={busy} className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold transition-colors disabled:opacity-50" style={{ background: INDIGO }}>{busy ? 'Connexion…' : 'Connecter'}</button>
                <button onClick={() => setConnectKey(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:bg-[#F9F9F7] transition-colors">Annuler</button>
              </div>
            </div>
            <div className="px-6 pt-3 pb-5 text-center">
              <p className="text-[11px] text-[#9CA3AF] leading-snug">Tes clés sont stockées de façon centralisée et masquées. Déconnecte une intégration à tout moment.</p>
              {connecting.domain && <a href={`https://${connecting.domain}`} target="_blank" rel="noreferrer" className="text-[11px] text-[#6B7280] underline hover:text-[#374151] mt-1 inline-block">En savoir plus sur la sécurité</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
