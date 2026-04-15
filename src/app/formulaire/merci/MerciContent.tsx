'use client'

import { useSearchParams } from 'next/navigation'

interface Props {
  companyName: string
  brandColor:  string
  ctaColor:    string
  logoSvg:     string | null
}

export default function MerciContent({ companyName, brandColor, ctaColor, logoSvg }: Props) {
  const params = useSearchParams()
  const prenom = params.get('prenom') ?? 'vous'
  const initial = companyName.charAt(0).toUpperCase()

  return (
    <div
      className="flex w-full max-w-[880px] rounded-[32px] overflow-hidden shadow-2xl"
      style={{ minHeight: '600px' }}
    >
      {/* ── Gauche : message ──────────────────────────────────────────────── */}
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

        {/* Contenu */}
        <div className="flex-1 flex flex-col justify-center gap-5">
          {/* Checkmark */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: brandColor }}
          >
            <svg className="w-6 h-6 text-[#111]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h1 className="text-[#111111] font-bold text-[23px] leading-tight mb-1.5">
              Merci {prenom} !
            </h1>
            <p className="text-[#9CA3AF] text-[11px]">
              Notre équipe vous contacte sous 48h.
            </p>
          </div>

          <div className="bg-[#F5F5F3] rounded-2xl px-4 py-4 space-y-2.5">
            {[
              ['✓', 'Demande bien enregistrée'],
              ['✓', 'Notre équipe vous rappelle sous 48h'],
              ['✓', 'Vos données restent confidentielles'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-[13px] text-[#444]">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: brandColor, color: '#111' }}
                >
                  {icon}
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[#111111]/20 text-[11px] text-center">
          Données protégées · {companyName}
        </p>
      </div>

      {/* ── Droite : visuel dark ─────────────────────────────────────────── */}
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
            backgroundImage: `linear-gradient(${brandColor}08 1px, transparent 1px), linear-gradient(90deg, ${brandColor}08 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
            style={{ backgroundColor: brandColor }}
          >
            <svg className="w-7 h-7 text-[#111]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-white font-bold text-[20px] leading-tight mb-3">
            Votre demande est<br />bien enregistrée
          </h2>
          <p className="text-white/40 text-[12.5px] max-w-[220px] leading-relaxed">
            Notre équipe prend en charge votre demande et vous recontacte sous 48h.
          </p>

          <div className="flex gap-6 mt-10">
            {[
              ['< 48h', 'Rappel'],
              ['100%',  'Gratuit'],
              ['0€',    'Engagement'],
            ].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="font-bold text-[22px]" style={{ color: brandColor }}>{val}</p>
                <p className="text-white/30 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
