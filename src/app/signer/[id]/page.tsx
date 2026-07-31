'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

type Info = {
  status: 'envoye' | 'vu' | 'signe'
  signedAt?: string | null
  signerName?: string | null
  clientName: string
  company?: string | null
  representant?: string | null
  ref: string
  amount?: number
  currency?: string
  installments?: number
}

function fmtAmount(n?: number, cur?: string) {
  if (typeof n !== 'number') return null
  try { return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: cur || 'CHF', maximumFractionDigits: 0 }).format(n) }
  catch { return `${cur || 'CHF'} ${n.toLocaleString('fr-CH')}` }
}

export default function SignerPage() {
  const { id } = useParams<{ id: string }>()
  const [info, setInfo] = useState<Info | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [viewer, setViewer] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/onboarding/signature/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: Info) => { if (!alive) return; setInfo(d); setName(d.representant || d.clientName || ''); if (d.status === 'signe') setDone(true) })
      .catch(() => { if (alive) setNotFound(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  // Prépare le canvas (résolution rétina).
  const setupCanvas = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const ratio = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    c.width = rect.width * ratio
    c.height = rect.height * ratio
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#16181d'
    }
  }, [])

  useEffect(() => {
    if (loading || done || notFound) return
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    return () => window.removeEventListener('resize', setupCanvas)
  }, [loading, done, notFound, setupCanvas])

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const start = (e: React.PointerEvent) => {
    e.preventDefault()
    drawing.current = true
    last.current = pos(e)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !last.current) return
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    if (!hasDrawn) setHasDrawn(true)
  }
  const end = () => { drawing.current = false; last.current = null }

  const clear = () => {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height)
    setHasDrawn(false)
  }

  const sign = async () => {
    setError(null)
    if (!name.trim()) { setError('Merci d’indiquer votre nom complet.'); return }
    if (!hasDrawn) { setError('Merci de dessiner votre signature dans le cadre.'); return }
    setSubmitting(true)
    try {
      const dataUrl = canvasRef.current!.toDataURL('image/png')
      const res = await fetch('/api/onboarding/sign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, signerName: name.trim(), signatureDataUrl: dataUrl }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) throw new Error(j.error || 'Échec de la signature.')
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', colorScheme: 'light' }} className="flex flex-col items-center px-4 py-10 font-sans">
      <div className="w-full max-w-3xl">
        {/* En-tête */}
        <div className="flex items-center gap-2.5 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/vividflow-logo.png" alt="VividFlow" width={34} height={34} style={{ borderRadius: 8 }} />
          <span className="font-sans font-bold text-[19px] tracking-[-0.01em] text-[#111]">VividFlow</span>
        </div>

        {loading && <div className="rounded-2xl bg-white p-10 text-center text-[14px] text-gray-500 shadow-sm">Chargement…</div>}

        {notFound && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-[16px] font-semibold text-[#111]">Lien invalide ou expiré</p>
            <p className="mt-2 text-[13px] text-gray-500">Cette demande de signature est introuvable. Contactez VividFlow.</p>
          </div>
        )}

        {!loading && !notFound && done && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-3xl">✓</div>
            <p className="text-[18px] font-bold text-[#111]">Contrat signé, merci !</p>
            <p className="mt-2 text-[14px] text-gray-500">
              Votre signature a bien été enregistrée{info?.signerName ? ` (${info.signerName})` : ''}. Une copie du contrat signé vous a été envoyée par email.
            </p>
          </div>
        )}

        {!loading && !notFound && !done && info && (
          <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Contrat {info.ref}</p>
            <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-[#111]">Signature de votre contrat</h1>
            <p className="mt-1.5 text-[14px] text-gray-500">
              {info.company || info.clientName} : visionnez le contrat ci-dessous, puis signez en bas de page.
            </p>

            {/* Carte document */}
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-[#faf9f7] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#FF4D00]/10 text-[#FF4D00]">
                  {/* icône document PDF */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-[#111]">Contrat d’accompagnement VividFlow</p>
                  <p className="mt-0.5 text-[13px] text-gray-500">{info.company || info.clientName} · Réf. {info.ref}</p>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
                    <div><span className="text-gray-400">Prestataire</span><br/><span className="font-semibold text-[#111]">VividFlow LTD</span></div>
                    <div><span className="text-gray-400">Client</span><br/><span className="font-semibold text-[#111]">{info.company || info.clientName}</span></div>
                    {fmtAmount(info.amount, info.currency) && (
                      <div><span className="text-gray-400">Montant total</span><br/><span className="font-semibold text-[#111]">{fmtAmount(info.amount, info.currency)}{info.installments && info.installments > 1 ? ` · ${info.installments}×` : ''}</span></div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <button type="button" onClick={() => setViewer(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#111] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#000]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  Visionner le contrat
                </button>
                <a href={`/api/onboarding/contract-pdf/${id}?download=1`}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-[#111] hover:bg-gray-50">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Télécharger
                </a>
              </div>
            </div>

            {/* Signature */}
            <div className="mt-7">
              <label className="text-[12px] font-semibold text-gray-700">Votre nom complet</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Prénom Nom"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-[#111] outline-none focus:border-[#FF4D00]" />

              <div className="mt-4 flex items-center justify-between">
                <label className="text-[12px] font-semibold text-gray-700">Votre signature</label>
                <button type="button" onClick={clear} className="text-[12px] font-medium text-gray-400 hover:text-gray-700">Effacer</button>
              </div>
              <canvas
                ref={canvasRef}
                onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
                className="mt-1.5 h-44 w-full touch-none rounded-xl border-2 border-dashed border-gray-300 bg-[#fafafa]"
              />
              <p className="mt-1.5 text-[11px] text-gray-400">Dessinez votre signature avec la souris ou le doigt.</p>

              {error && <p className="mt-3 text-[13px] font-medium text-red-500">{error}</p>}

              <button onClick={sign} disabled={submitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF4D00] px-5 py-3 text-[14px] font-bold text-white hover:bg-[#e64500] disabled:opacity-50 sm:w-auto">
                {!submitting && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                )}
                {submitting ? 'Signature en cours…' : 'Signer le contrat'}
              </button>
              <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                En cliquant sur « Signer le contrat », vous acceptez l’intégralité des dispositions du contrat ci-dessus.
                Votre signature électronique a valeur d’engagement.
              </p>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-gray-400">VividFlow · Signature électronique sécurisée</p>
      </div>

      {viewer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-3 sm:p-6" onClick={() => setViewer(false)}>
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-[13px] font-semibold text-[#111]">Contrat d’accompagnement VividFlow</span>
              <div className="flex items-center gap-2">
                <a href={`/api/onboarding/contract-pdf/${id}?download=1`}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-[#111] hover:bg-gray-50">
                  Télécharger
                </a>
                <button type="button" onClick={() => setViewer(false)} aria-label="Fermer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <iframe src={`/api/onboarding/contract-html/${id}`} title="Contrat" className="w-full flex-1 bg-gray-100" />
          </div>
        </div>
      )}
    </div>
  )
}
