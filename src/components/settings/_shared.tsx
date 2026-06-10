'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Shared input styling tokens ─────────────────────────────────────────────

export const inputCls =
  'w-full bg-soren-elevated border border-transparent rounded-lg px-2.5 py-1.5 text-soren-text text-[13px] placeholder:text-soren-subtle focus:outline-none focus:border-[#FF4D00]/40 focus:ring-2 focus:ring-[#FF4D00]/10 transition-all'
export const labelCls =
  'block text-[10px] font-semibold text-soren-subtle mb-1.5 uppercase tracking-widest'
export const sectionLabelCls =
  'text-[10px] font-semibold text-soren-subtle uppercase tracking-widest'

export const ACCENT = '#FF4D00'
export const ACCENT_HOVER = '#E64500'

// ─── Color math ──────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
  const safe = (hex && /^#?[0-9a-fA-F]{6}$/.test(hex)) ? hex : ACCENT
  const h = safe.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
export function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(n => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')).join('')
}
export function rgbToHsb(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = Math.round(h * 60); if (h < 0) h += 360
  }
  return [h, max ? Math.round(d / max * 100) : 0, Math.round(max * 100)]
}
export function hsbToRgb(h: number, s: number, v: number): [number, number, number] {
  s /= 100; v /= 100
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}
export function hexToHsb(hex: string): [number, number, number] {
  return rgbToHsb(...hexToRgb(hex))
}
export function hsbToHex(h: number, s: number, b: number) {
  return rgbToHex(...hsbToRgb(h, s, b))
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Tolère value vide/undefined → fallback accent (jamais de crash).
  const safeValue = value && /^#?[0-9a-fA-F]{6}$/.test(value) ? (value.startsWith('#') ? value : '#' + value) : ACCENT
  const [open, setOpen] = useState(false)
  const [h, s, b] = hexToHsb(safeValue)
  const [hue, setHue] = useState(h)
  const [sat, setSat] = useState(s)
  const [bri, setBri] = useState(b)
  const [hexInput, setHexInput] = useState(safeValue)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const squareRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  useEffect(() => {
    const [nh, ns, nb] = hexToHsb(safeValue)
    setHue(nh); setSat(ns); setBri(nb); setHexInput(safeValue)
  }, [safeValue])

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
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { onChange(v); const [nh, ns, nb] = hexToHsb(v); setHue(nh); setSat(ns); setBri(nb) }
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
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className="flex items-center gap-2.5 bg-soren-elevated rounded-xl px-3 py-2 hover:ring-2 hover:ring-soren-border transition-all"
      >
        <div className="w-5 h-5 rounded-md border border-black/10 flex-shrink-0" style={{ backgroundColor: safeValue }} />
        <span className="text-sm font-mono text-soren-text">{safeValue.toUpperCase()}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div ref={panelRef} className="fixed z-[9999] bg-soren-card rounded-2xl border border-soren-border p-4 w-60" style={{ top: panelPos.top, left: panelPos.left, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
          <div
            ref={squareRef}
            onMouseDown={e => { dragging.current = true; pickFromSquare(e) }}
            className="relative rounded-xl overflow-hidden mb-3 cursor-crosshair select-none"
            style={{ height: 140, background: `linear-gradient(to right, #fff, ${hueColor})` }}
          >
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
            <div
              className="absolute w-3.5 h-3.5 rounded-full border-2 border-white pointer-events-none"
              style={{
                left: `${sat}%`, top: `${100 - bri}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2)',
              }}
            />
          </div>

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

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 border border-black/8" style={{ backgroundColor: safeValue }} />
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

function svgToDataUrl(svg: string) {
  try {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  } catch {
    return ''
  }
}

export function SvgDropZone({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) readFile(f) }}
        onClick={() => fileRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-xl cursor-pointer transition-all flex items-center justify-center',
          dragging ? 'border-[#FF4D00] bg-[#FF4D00]/5' : 'border-soren-border hover:border-soren-subtle hover:bg-soren-elevated',
          'h-24',
        ].join(' ')}
      >
        <input ref={fileRef} type="file" accept=".svg,image/svg+xml" className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f) }} />

        {value && dataUrl ? (
          <div className="flex items-center gap-4 px-4 w-full">
            <div className="w-12 h-12 bg-white rounded-lg border border-black/8 flex items-center justify-center p-2 shadow-sm flex-shrink-0">
              <img src={dataUrl} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', display: 'block' }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-soren-text truncate">Logo importé</p>
              <p className="text-xs text-soren-subtle">Cliquer pour remplacer</p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange('') }}
              className="ml-auto text-soren-subtle hover:text-red-400 transition-colors flex-shrink-0 text-sm"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="text-center px-4">
            <svg className="mx-auto mb-2 text-soren-subtle" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-xs text-soren-subtle">Glisser un .svg ou cliquer</p>
          </div>
        )}
      </div>

      <details className="group">
        <summary className="text-xs text-soren-subtle cursor-pointer hover:text-soren-muted transition-colors list-none flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className="group-open:rotate-90 transition-transform">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Coller le code SVG
        </summary>
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
          placeholder={'<svg viewBox="0 0 100 100">...</svg>'}
          className="mt-2 w-full bg-soren-elevated rounded-lg px-3 py-2 text-soren-text text-xs font-mono focus:outline-none resize-none"
        />
      </details>
    </div>
  )
}
