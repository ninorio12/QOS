'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Save } from 'lucide-react'
import ThemeToggle from '@/components/settings/ThemeToggle'

type CompanySettings = {
  id: string
  name: string
  tagline: string
  address: string
  phone: string
  email: string
  siret: string
  capital: string
  tva_intra: string
  assurance: string
  brand_color: string
  logo_svg: string
  website_url: string
}

const inputCls = 'w-full bg-soren-elevated border border-transparent rounded-lg px-2.5 py-1.5 text-soren-text text-xs placeholder:text-soren-subtle focus:outline-none focus:border-soren-text/15 transition-colors'
const labelCls = 'block text-[8px] font-medium text-soren-subtle mb-1 uppercase tracking-widest'

// ─── Color math ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r,g,b].map(n => Math.round(Math.min(255,Math.max(0,n))).toString(16).padStart(2,'0')).join('')
}
function rgbToHsb(r: number, g: number, b: number): [number, number, number] {
  r/=255; g/=255; b/=255
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min
  let h=0
  if(d){
    if(max===r) h=((g-b)/d)%6
    else if(max===g) h=(b-r)/d+2
    else h=(r-g)/d+4
    h=Math.round(h*60); if(h<0) h+=360
  }
  return [h, max ? Math.round(d/max*100) : 0, Math.round(max*100)]
}
function hsbToRgb(h: number, s: number, v: number): [number, number, number] {
  s/=100; v/=100
  const c=v*s, x=c*(1-Math.abs((h/60)%2-1)), m=v-c
  let r=0,g=0,b=0
  if(h<60){r=c;g=x} else if(h<120){r=x;g=c} else if(h<180){g=c;b=x}
  else if(h<240){g=x;b=c} else if(h<300){r=x;b=c} else{r=c;b=x}
  return [Math.round((r+m)*255), Math.round((g+m)*255), Math.round((b+m)*255)]
}
function hexToHsb(hex: string): [number,number,number] {
  return rgbToHsb(...hexToRgb(hex))
}
function hsbToHex(h: number, s: number, b: number) {
  return rgbToHex(...hsbToRgb(h,s,b))
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [h, s, b] = hexToHsb(value)
  const [hue, setHue] = useState(h)
  const [sat, setSat] = useState(s)
  const [bri, setBri] = useState(b)
  const [hexInput, setHexInput] = useState(value)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const squareRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // Sync from outside
  useEffect(() => {
    const [nh, ns, nb] = hexToHsb(value)
    setHue(nh); setSat(ns); setBri(nb); setHexInput(value)
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (
        panelRef.current && !panelRef.current.contains(t) &&
        triggerRef.current && !triggerRef.current.contains(t)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function emitHsb(nh: number, ns: number, nb: number) {
    setHue(nh); setSat(ns); setBri(nb)
    const hex = hsbToHex(nh, ns, nb)
    onChange(hex); setHexInput(hex)
  }

  const pickFromSquare = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!squareRef.current) return
    const rect = squareRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    emitHsb(hue, Math.round(x * 100), Math.round((1 - y) * 100))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hue])

  useEffect(() => {
    function move(e: MouseEvent) { if (dragging.current) pickFromSquare(e) }
    function up() { dragging.current = false }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
  }, [pickFromSquare])

  function commitHex(raw: string) {
    const v = raw.startsWith('#') ? raw : '#' + raw
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { onChange(v); const [nh,ns,nb]=hexToHsb(v); setHue(nh);setSat(ns);setBri(nb) }
  }

  const hueColor = hsbToHex(hue, 100, 100)

  function openPicker() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPanelPos({ top: r.bottom + 8, left: r.left })
    }
    setOpen(o => !o)
  }

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={openPicker}
        className="flex items-center gap-2.5 bg-soren-elevated rounded-xl px-3 py-2 hover:bg-soren-elevated transition-colors"
      >
        <div className="w-5 h-5 rounded-md border border-black/10 flex-shrink-0" style={{ backgroundColor: value }} />
        <span className="text-sm font-mono text-soren-text">{value}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown panel — fixed pour ne pas perturber le layout */}
      {open && (
        <div ref={panelRef} className="fixed z-[9999] bg-soren-card rounded-2xl border border-black/6 p-4 w-60" style={{ top: panelPos.top, left: panelPos.left, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>

          {/* Gradient square */}
          <div
            ref={squareRef}
            onMouseDown={e => { dragging.current = true; pickFromSquare(e) }}
            className="relative rounded-xl overflow-hidden mb-3 cursor-crosshair select-none"
            style={{ height: 140, background: `linear-gradient(to right, #fff, ${hueColor})` }}
          >
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
            {/* Picker dot */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full border-2 border-white pointer-events-none"
              style={{
                left: `${sat}%`, top: `${100 - bri}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2)',
              }}
            />
          </div>

          {/* Hue slider */}
          <div className="mb-3">
            <input
              type="range" min={0} max={359} value={hue}
              onChange={e => emitHsb(Number(e.target.value), sat, bri)}
              className="w-full h-3 rounded-full cursor-pointer appearance-none"
              style={{
                background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              }}
            />
          </div>

          {/* Preview + hex */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 border border-black/8" style={{ backgroundColor: value }} />
            <input
              value={hexInput}
              onChange={e => setHexInput(e.target.value)}
              onBlur={e => commitHex(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitHex(hexInput)}
              maxLength={7}
              className="flex-1 bg-soren-elevated rounded-lg px-2.5 py-1.5 text-sm font-mono text-soren-text focus:outline-none"
            />
          </div>

          <style>{`
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 16px; height: 16px;
              border-radius: 50%;
              background: white;
              border: 2px solid rgba(0,0,0,0.15);
              box-shadow: 0 1px 4px rgba(0,0,0,0.25);
              cursor: pointer;
            }
            input[type=range]::-moz-range-thumb {
              width: 16px; height: 16px;
              border-radius: 50%;
              background: white;
              border: 2px solid rgba(0,0,0,0.15);
              box-shadow: 0 1px 4px rgba(0,0,0,0.25);
              cursor: pointer;
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

// ─── SVG Drop Zone ────────────────────────────────────────────────────────────

// Convertit le SVG brut en data URL utilisable dans <img> — évite les débordements de taille
function svgToDataUrl(svg: string) {
  try {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  } catch {
    return ''
  }
}

function SvgDropZone({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => { if (typeof e.target?.result === 'string') onChange(e.target.result) }
    reader.readAsText(file)
  }

  const dataUrl = value ? svgToDataUrl(value) : ''

  return (
    <div className="space-y-2">
      {/* Zone de drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) readFile(f) }}
        onClick={() => fileRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-xl cursor-pointer transition-all flex items-center justify-center',
          dragging ? 'border-[#111111] bg-soren-elevated' : 'border-soren-border hover:border-soren-subtle hover:bg-soren-elevated',
          'h-20',
        ].join(' ')}
      >
        <input ref={fileRef} type="file" accept=".svg,image/svg+xml" className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f) }} />

        {value && dataUrl ? (
          <div className="flex items-center gap-4 px-4 w-full">
            {/* Preview fond blanc */}
            <div className="w-10 h-10 bg-soren-card rounded-lg border border-black/8 flex items-center justify-center p-1.5 shadow-sm flex-shrink-0">
              <img src={dataUrl} alt="logo" style={{ width: 28, height: 28, objectFit: 'contain', display: 'block' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-soren-text truncate">Logo importé</p>
              <p className="text-[11px] text-soren-subtle">Cliquer pour remplacer</p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange('') }}
              className="ml-auto text-soren-subtle hover:text-red-400 transition-colors flex-shrink-0 text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="text-center px-4">
            <svg className="mx-auto mb-1.5 text-soren-subtle" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p className="text-xs text-soren-subtle">Glisser un .svg ou cliquer</p>
          </div>
        )}
      </div>

      {/* Coller le code SVG */}
      <details className="group">
        <summary className="text-[11px] text-soren-subtle cursor-pointer hover:text-soren-subtle transition-colors list-none flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className="group-open:rotate-90 transition-transform">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          Coller le code SVG
        </summary>
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
          placeholder={'<svg viewBox="0 0 100 100">...</svg>'}
          className="mt-1.5 w-full bg-soren-elevated rounded-lg px-3 py-2 text-soren-text text-xs font-mono focus:outline-none resize-none"
        />
      </details>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function parseAddress(raw: string) {
  const lines = (raw ?? '').split('\n')
  const rue = lines[0] ?? ''
  const line2 = lines[1] ?? ''
  const spaceIdx = line2.search(/\s/)
  return {
    rue,
    cp:   spaceIdx > 0 ? line2.slice(0, spaceIdx) : line2,
    city: spaceIdx > 0 ? line2.slice(spaceIdx + 1) : '',
  }
}

export default function CompanySettingsView() {
  const [form, setForm] = useState<CompanySettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [dirty,  setDirty]  = useState(false)
  const [addrRue,  setAddrRueRaw]  = useState('')
  const [addrCP,   setAddrCPRaw]   = useState('')
  const [addrCity, setAddrCityRaw] = useState('')
  const [profilePhoto, setProfilePhotoRaw] = useState('')
  const [userPrenom,   setUserPrenomRaw]   = useState('')
  const [userNom,      setUserNomRaw]      = useState('')
  const profileInputRef = useRef<HTMLInputElement>(null)

  function setUserPrenom(v: string) { setUserPrenomRaw(v); setDirty(true) }
  function setUserNom(v: string)    { setUserNomRaw(v);    setDirty(true) }

  function setAddrRue(v: string)  { setAddrRueRaw(v);  setDirty(true) }
  function setAddrCP(v: string)   { setAddrCPRaw(v);   setDirty(true) }
  function setAddrCity(v: string) { setAddrCityRaw(v); setDirty(true) }

  useEffect(() => {
    fetch('/api/settings/company').then(r => r.json()).then(d => {
      setForm(d.company)
      const p = parseAddress(d.company?.address ?? '')
      setAddrRueRaw(p.rue); setAddrCPRaw(p.cp); setAddrCityRaw(p.city)
    })
    try {
      const stored = localStorage.getItem('soren_profile_photo')
      if (stored) setProfilePhotoRaw(stored)
    } catch {}
    try {
      const compte = JSON.parse(localStorage.getItem('soren_compte') ?? '{}')
      if (compte.prenom) setUserPrenomRaw(compte.prenom)
      if (compte.nom)    setUserNomRaw(compte.nom)
    } catch {}
  }, [])

  function handleProfilePhoto(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new window.Image()
      img.onload = () => {
        const MAX = 200
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressed = canvas.toDataURL('image/jpeg', 0.8)
        setProfilePhotoRaw(compressed)
        try { localStorage.setItem('soren_profile_photo', compressed) } catch {}
        window.dispatchEvent(new Event('profile-photo-updated'))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Avertissement navigation si modifications non sauvegardées
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  if (!form) return (
    <div className="p-8 flex flex-col gap-6 animate-pulse max-w-xl">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <div className="h-2.5 w-24 bg-[#D9DDD6] rounded mb-2" />
          <div className="h-10 w-full bg-[#E5E7EB] rounded-xl" />
        </div>
      ))}
    </div>
  )

  function set(key: keyof CompanySettings, value: string) {
    setForm(f => f ? { ...f, [key]: value } : f)
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    const address = [addrRue, [addrCP, addrCity].filter(Boolean).join(' ')].filter(Boolean).join('\n')
    await fetch('/api/settings/company', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, address }) })
    try {
      const existing = JSON.parse(localStorage.getItem('soren_compte') ?? '{}')
      localStorage.setItem('soren_compte', JSON.stringify({ ...existing, prenom: userPrenom, nom: userNom }))
    } catch {}
    setSaving(false); setSaved(true); setDirty(false)
    window.dispatchEvent(new Event('company-settings-updated'))
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="h-full overflow-hidden flex flex-col p-3 gap-2.5">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 px-0.5">
        <div>
          <h1 className="text-lg font-black text-soren-text leading-none">Paramètres</h1>
          <p className="text-[10px] text-soren-subtle mt-0.5">Ces informations apparaissent sur vos devis PDF</p>
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-semibold text-xs transition-all ${
            dirty
              ? 'bg-[#E2FF8D] text-[#111111] hover:bg-[#d4f570]'
              : 'bg-transparent text-[#C8CCC6] cursor-default'
          }`}
        >
          <Save size={11} />
          {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      {/* Apparence */}
      <div className="flex items-center justify-between flex-shrink-0 bg-soren-card rounded-2xl border border-soren-border px-4 py-3">
        <div>
          <p className="text-[12px] font-semibold text-soren-text">Apparence</p>
          <p className="text-[10px] text-soren-subtle mt-0.5">Thème de l'interface</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Ligne 1 : Identité+Logo | Profil */}
      <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">

        {/* Identité + Logo */}
        <div className="bg-soren-card rounded-2xl border border-soren-border p-4 flex flex-col gap-3 overflow-hidden">
          <p className="text-[8px] font-semibold text-soren-subtle uppercase tracking-widest flex-shrink-0">Identité & Logo</p>
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            <div>
              <label className={labelCls}>Nom de l&apos;entreprise</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tagline</label>
              <input value={form.tagline} onChange={e => set('tagline', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex-shrink-0 min-w-0">
            <label className={labelCls}>Couleur brand</label>
            <ColorPicker value={form.brand_color} onChange={v => set('brand_color', v)} />
          </div>
          <div className="flex-shrink-0">
            <label className={labelCls}>Logo entreprise</label>
            <SvgDropZone value={form.logo_svg} onChange={v => set('logo_svg', v)} />
          </div>
        </div>

        {/* Profil utilisateur */}
        <div className="bg-soren-card rounded-2xl border border-soren-border p-4 flex flex-col gap-3 overflow-hidden">
          <p className="text-[8px] font-semibold text-soren-subtle uppercase tracking-widest flex-shrink-0">Profil utilisateur</p>

          {/* Avatar + boutons sur une ligne */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div onClick={() => profileInputRef.current?.click()}
              className="w-9 h-9 rounded-full overflow-hidden cursor-pointer ring-2 ring-offset-2 ring-transparent hover:ring-[#3462EE]/40 transition-all flex-shrink-0 relative group">
              {profilePhoto
                ? <img src={profilePhoto} alt="profil" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-[#E2FF8D] flex items-center justify-center text-[14px] font-bold text-soren-text">
                    {userPrenom ? userPrenom[0].toUpperCase() : 'T'}
                  </div>
              }
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => profileInputRef.current?.click()}
                className="text-[11px] font-medium text-[#3462EE] hover:text-[#2a50d4] transition-colors text-left">
                {profilePhoto ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              {profilePhoto && (
                <button type="button"
                  onClick={() => { setProfilePhotoRaw(''); try { localStorage.removeItem('soren_profile_photo') } catch {}; window.dispatchEvent(new Event('profile-photo-updated')) }}
                  className="text-[11px] text-red-400 hover:text-red-600 transition-colors text-left">
                  Supprimer
                </button>
              )}
            </div>
          </div>
          <input ref={profileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleProfilePhoto(f) }} />

          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            <div>
              <label className={labelCls}>Prénom</label>
              <input value={userPrenom} onChange={e => setUserPrenom(e.target.value)} placeholder="Thomas" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nom</label>
              <input value={userNom} onChange={e => setUserNom(e.target.value)} placeholder="Dupont" className={inputCls} />
            </div>
          </div>
        </div>

      </div>

      {/* Ligne 2 : Coordonnées + Infos légales */}
      <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">

        <div className="bg-soren-card rounded-2xl border border-soren-border p-4 flex flex-col gap-3 overflow-hidden">
          <p className="text-[8px] font-semibold text-soren-subtle uppercase tracking-widest flex-shrink-0">Coordonnées</p>
          <div className="flex-shrink-0 min-w-0">
            <label className={labelCls}>Rue</label>
            <input value={addrRue} onChange={e => setAddrRue(e.target.value)} className={inputCls} placeholder="215, avenue Clément Ader" />
          </div>
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            <div>
              <label className={labelCls}>Code postal</label>
              <input value={addrCP} onChange={e => setAddrCP(e.target.value)} className={inputCls} placeholder="34173" />
            </div>
            <div>
              <label className={labelCls}>Ville</label>
              <input value={addrCity} onChange={e => setAddrCity(e.target.value)} className={inputCls} placeholder="Castelnau-le-Lez" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            <div>
              <label className={labelCls}>Téléphone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="04 99 13 32 00" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="contact@soren.fr" />
            </div>
          </div>
          <div className="flex-shrink-0 min-w-0">
            <label className={labelCls}>Site web</label>
            <input value={form.website_url} onChange={e => set('website_url', e.target.value)} className={inputCls} placeholder="https://www.soren.fr" />
          </div>
        </div>

        <div className="bg-soren-card rounded-2xl border border-soren-border p-4 flex flex-col gap-3 overflow-hidden">
          <p className="text-[8px] font-semibold text-soren-subtle uppercase tracking-widest flex-shrink-0">Informations légales</p>
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            <div>
              <label className={labelCls}>SIRET</label>
              <input value={form.siret} onChange={e => set('siret', e.target.value)} className={inputCls} placeholder="500 123 321 00012" />
            </div>
            <div>
              <label className={labelCls}>Capital social</label>
              <input value={form.capital} onChange={e => set('capital', e.target.value)} className={inputCls} placeholder="50 000 euros" />
            </div>
          </div>
          <div className="flex-shrink-0 min-w-0">
            <label className={labelCls}>TVA intracommunautaire</label>
            <input value={form.tva_intra} onChange={e => set('tva_intra', e.target.value)} className={inputCls} placeholder="FR 25 500 123 321" />
          </div>
          <div className="flex-shrink-0 min-w-0">
            <label className={labelCls}>Assurance décennale</label>
            <input value={form.assurance} onChange={e => set('assurance', e.target.value)} className={inputCls} placeholder="AssureurPro — N° 450123" />
          </div>
        </div>

      </div>

    </div>
  )
}
