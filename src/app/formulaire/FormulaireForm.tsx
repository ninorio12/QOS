'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Props {
  companyName:    string
  companyTagline: string
  brandColor:     string
  logoSvg:        string | null
}

function InputField({ name, required, type = 'text', placeholder, brandColor }: {
  name: string
  required?: boolean
  type?: string
  placeholder: string
  brandColor: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      name={name}
      required={required}
      type={type}
      placeholder={placeholder}
      className="w-full bg-[#F5F5F3] rounded-2xl px-4 py-3 text-[#111111] text-[13px] placeholder-[#111111]/25 focus:outline-none transition-all"
      style={{ border: `1.5px solid ${focused ? brandColor : 'transparent'}` }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function ConsentCheckbox({ id, label }: { id: string; label: string }) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer group">
      <input
        id={id}
        name={id}
        type="checkbox"
        required
        className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-[#D1D5DB] accent-[#111111] cursor-pointer"
      />
      <span className="text-[10px] text-[#C4C9D4] leading-snug group-has-[:checked]:text-[#9CA3AF]">
        {label}
      </span>
    </label>
  )
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
      email:     (form.get('email')     as string).trim(),
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

  const initial = companyName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF0EB] p-6">
      <div className="flex w-full max-w-[880px] rounded-[32px] overflow-hidden shadow-2xl" style={{ minHeight: '600px' }}>

        {/* ── Gauche : formulaire ──────────────────────────────────────────── */}
        <div className="w-[440px] flex-shrink-0 flex flex-col px-10 py-8 bg-white gap-6">

          {/* Logo */}
          <div className="flex items-center gap-3">
            {logoSvg ? (
              <div
                className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: logoSvg }}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#111] font-bold text-[16px]"
                style={{ backgroundColor: brandColor }}
              >
                {initial}
              </div>
            )}
            <span
              className="text-[#111111] font-bold tracking-tight"
              style={{ fontSize: companyName.length > 22 ? '17px' : companyName.length > 16 ? '19px' : '22px' }}
            >
              {companyName}
            </span>
          </div>

          {/* Titre */}
          <div className="flex-1 flex flex-col justify-center gap-5">
            <div>
              <h1 className="text-[#111111] font-bold text-[23px] leading-tight mb-1.5">
                Planifiez votre<br />
                <span style={{ color: brandColor }}>rendez-vous</span> gratuitement
              </h1>
              <p className="text-[#9CA3AF] text-[11px]">
                Remplissez le formulaire, un expert vous rappelle rapidement
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">

              <div className="flex gap-2.5">
                <InputField name="firstName" required placeholder="Prénom" brandColor={brandColor} />
                <InputField name="lastName"  required placeholder="Nom"    brandColor={brandColor} />
              </div>

              <InputField name="phone" required type="tel" placeholder="Téléphone" brandColor={brandColor} />
              <InputField name="email" required type="email" placeholder="Email" brandColor={brandColor} />

              <div className="space-y-1.5 pt-0.5">
                <ConsentCheckbox
                  id="consentSms"
                  label={`J'accepte de recevoir des SMS de ${companyName} pour le suivi de ma demande. Répondez STOP pour vous désabonner.`}
                />
                <ConsentCheckbox
                  id="consentData"
                  label={`J'accepte que mes données soient utilisées par ${companyName} pour me recontacter.`}
                />
              </div>

              {error && (
                <p className="text-red-500 text-[12px] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold text-[13px] py-3 rounded-2xl transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 mt-1"
                style={{ backgroundColor: '#F97316', color: '#ffffff' }}
              >
                {loading
                  ? <><span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Envoi…</>
                  : 'Prendre rendez-vous →'
                }
              </button>

            </form>
          </div>

          <p className="text-[#111111]/20 text-[11px] text-center">
            Données protégées · {companyName}
          </p>
        </div>

        {/* ── Droite : photo chantier ──────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden">
          <Image
            src="/hero-chantier.jpg"
            alt="Chantier"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Overlay gradient pour lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Badge stats en bas */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-7">
            <div className="grid grid-cols-3 gap-3">
              {[
                ['98%',    'Clients satisfaits'],
                ['4.9★',   'Note Google'],
                ['500+',   'Chantiers réalisés'],
              ].map(([val, label]) => (
                <div
                  key={label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-3 text-center border border-white/10"
                >
                  <p className="font-bold text-[20px] leading-none" style={{ color: brandColor }}>{val}</p>
                  <p className="text-white/70 text-[10px] mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
