'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  companyName:    string
  companyTagline: string
  brandColor:     string
  logoSvg:        string | null
}

export default function FormulaireForm({ companyName, companyTagline, brandColor, logoSvg }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const body = {
      firstName: (form.get('firstName') as string).trim(),
      lastName:  (form.get('lastName')  as string).trim(),
      phone:     (form.get('phone')     as string).trim(),
      email:     (form.get('email')     as string).trim() || undefined,
    }

    try {
      const res = await fetch('/api/leads/capture', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erreur serveur')
      }
      router.push('/formulaire/merci?prenom=' + encodeURIComponent(body.firstName))
    } catch (err) {
      setError(String(err))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF0EB] p-6">
      <div
        className="flex w-full max-w-[860px] rounded-[28px] overflow-hidden shadow-2xl"
        style={{ minHeight: '580px' }}
      >

        {/* ── Gauche : formulaire ──────────────────────────────────────── */}
        <div className="w-[420px] flex-shrink-0 flex flex-col justify-between px-10 py-9 bg-white">

          {/* Logo + nom entreprise */}
          <div className="flex items-center gap-3">
            {logoSvg ? (
              <div
                className="w-10 h-10 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: logoSvg }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#111] font-bold text-lg"
                style={{ backgroundColor: brandColor }}
              >
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[#111111] font-bold text-[17px] tracking-tight">
              {companyName}
            </span>
          </div>

          {/* Contenu */}
          <div>
            <h1 className="text-[#111111] font-bold text-[28px] leading-snug mb-2">
              Planifiez un rendez-vous gratuitement
            </h1>
            <p className="text-[#9CA3AF] text-[13px] mb-7">
              Remplissez le formulaire, on vous rappelle rapidement
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-3">
                <input
                  name="firstName"
                  required
                  placeholder="Prénom"
                  className="w-full bg-[#F5F5F3] border border-transparent rounded-2xl px-4 py-3 text-[#111111] text-[13px] placeholder-[#111111]/25 focus:outline-none transition-colors"
                  style={{ ['--tw-ring-color' as string]: brandColor }}
                  onFocus={e => e.currentTarget.style.borderColor = brandColor}
                  onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
                />
                <input
                  name="lastName"
                  required
                  placeholder="Nom"
                  className="w-full bg-[#F5F5F3] border border-transparent rounded-2xl px-4 py-3 text-[#111111] text-[13px] placeholder-[#111111]/25 focus:outline-none transition-colors"
                  onFocus={e => e.currentTarget.style.borderColor = brandColor}
                  onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
                />
              </div>

              <input
                name="phone"
                required
                type="tel"
                placeholder="Téléphone (+33 6 12 34 56 78)"
                className="w-full bg-[#F5F5F3] border border-transparent rounded-2xl px-4 py-3 text-[#111111] text-[13px] placeholder-[#111111]/25 focus:outline-none transition-colors"
                onFocus={e => e.currentTarget.style.borderColor = brandColor}
                onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
              />

              <input
                name="email"
                type="email"
                placeholder="Email (optionnel)"
                className="w-full bg-[#F5F5F3] border border-transparent rounded-2xl px-4 py-3 text-[#111111] text-[13px] placeholder-[#111111]/25 focus:outline-none transition-colors"
                onFocus={e => e.currentTarget.style.borderColor = brandColor}
                onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
              />

              {error && (
                <p className="text-red-500 text-[12px] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold text-[13px] py-3 rounded-2xl transition-colors disabled:opacity-40"
                style={{ backgroundColor: '#111111', color: brandColor }}
              >
                {loading ? 'Envoi en cours…' : 'Envoyer ma demande →'}
              </button>
            </form>
          </div>

          <p className="text-[#111111]/20 text-[11px]">
            Vos données sont protégées · {companyName}
          </p>
        </div>

        {/* ── Droite : visuel dark ─────────────────────────────────────── */}
        <div className="flex-1 relative bg-[#111111] overflow-hidden">

          <div
            className="absolute top-[-30%] right-[-20%] w-[500px] h-[500px] rounded-full opacity-25"
            style={{ background: `radial-gradient(circle, ${brandColor} 0%, transparent 65%)` }}
          />
          <div
            className="absolute bottom-[-20%] left-[-10%] w-[350px] h-[350px] rounded-full opacity-15"
            style={{ background: `radial-gradient(circle, ${brandColor} 0%, transparent 65%)` }}
          />

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(226,255,141,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(226,255,141,0.05) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg text-[#111] font-bold text-2xl"
              style={{ backgroundColor: brandColor }}
            >
              {logoSvg
                ? <div className="w-8 h-8" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                : companyName.charAt(0).toUpperCase()
              }
            </div>

            <h2 className="text-white font-bold text-[20px] leading-tight mb-3">
              Un expert vous rappelle<br />en moins d&apos;une minute
            </h2>
            <p className="text-white/35 text-[12.5px] max-w-[220px] leading-relaxed">
              {companyTagline || 'Devis personnalisé, sans engagement, réponse immédiate.'}
            </p>

            <div className="flex gap-6 mt-10">
              {[['< 60s', 'Réponse'], ['100%', 'Gratuit'], ['0', 'Engagement']].map(([val, label]) => (
                <div key={label} className="text-center">
                  <p className="font-bold text-[24px]" style={{ color: brandColor }}>{val}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
