'use client'

import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

export default function MerciContent() {
  const params = useSearchParams()
  const prenom = params.get('prenom') ?? 'vous'

  return (
    <div
      className="flex w-full max-w-[860px] rounded-[28px] overflow-hidden shadow-2xl"
      style={{ minHeight: '580px' }}
    >
      {/* ── Gauche : message ──────────────────────────────────────────────── */}
      <div className="w-[420px] flex-shrink-0 flex flex-col justify-between px-10 py-9 bg-white">

        <div className="flex items-center gap-3">
          <Image
            src="/soren-logo.png"
            alt="Soren"
            width={64}
            height={64}
            className="object-contain rounded-xl"
            style={{ width: 64, height: 64 }}
          />
          <span className="text-[#111111] font-bold text-[17px] tracking-tight">Soren</span>
        </div>

        <div>
          {/* Checkmark */}
          <div className="w-14 h-14 rounded-2xl bg-[#E2FF8D] flex items-center justify-center mb-6">
            <svg className="w-7 h-7 text-[#111]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-[#111111] font-bold text-[28px] leading-snug mb-2">
            Merci {prenom} !
          </h1>
          <p className="text-[#9CA3AF] text-[13px] mb-7 leading-relaxed">
            Merci ! Notre équipe vous contacte sous 48h.
          </p>

          <div className="bg-[#F5F5F3] rounded-2xl px-4 py-4 space-y-2">
            {[
              ['📋', 'Demande bien enregistrée'],
              ['📞', 'Notre équipe vous rappelle sous 48h'],
              ['🔒', 'Vos données restent confidentielles'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-[13px] text-[#444]">
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[#111111]/20 text-[11px]">
          Vos données sont protégées · Soren par Qorpo IA
        </p>
      </div>

      {/* ── Droite : visuel dark ─────────────────────────────────────────── */}
      <div className="flex-1 relative bg-[#111111] overflow-hidden">
        <div
          className="absolute top-[-30%] right-[-20%] w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #E2FF8D 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[350px] h-[350px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #E2FF8D 0%, transparent 65%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(226,255,141,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(226,255,141,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#E2FF8D] flex items-center justify-center mb-6 shadow-lg">
            <Image src="/soren-logo.png" alt="Soren" width={30} height={30} className="object-contain" />
          </div>
          <h2 className="text-white font-bold text-[20px] leading-tight mb-3">
            Votre visite est<br />en cours de planification
          </h2>
          <p className="text-white/35 text-[12.5px] max-w-[220px] leading-relaxed">
            Notre équipe prend en charge votre demande et vous recontacte sous 48h.
          </p>

          <div className="flex gap-6 mt-10">
            {[
              ['< 60s', 'Réponse'],
              ['100%', 'Gratuit'],
              ['0', 'Engagement'],
            ].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="text-[#E2FF8D] font-bold text-[24px]">{val}</p>
                <p className="text-white/30 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
