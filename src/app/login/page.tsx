'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#111111]">

      {/* ── MOBILE layout (< md) ── */}
      <div className="flex md:hidden flex-col min-h-screen">

        {/* Top dark zone — branding */}
        <div className="relative flex-1 flex flex-col items-center justify-center pt-16 pb-8 overflow-hidden">
          {/* Blobs décoratifs */}
          <div
            className="absolute top-[-20%] right-[-20%] w-72 h-72 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #FF4D00 0%, transparent 65%)' }}
          />
          <div
            className="absolute bottom-[-10%] left-[-10%] w-48 h-48 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #FF4D00 0%, transparent 65%)' }}
          />
          {/* Grille */}
          <div
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              backgroundImage: 'linear-gradient(rgba(226,255,141,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(226,255,141,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative flex flex-col items-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-[#FF4D00] flex items-center justify-center mb-5 shadow-xl">
              <Image src="/soren-logo.png" alt="VividFlow" width={36} height={36} className="object-contain" />
            </div>
            <h1 className="text-white font-bold text-[22px] leading-tight mb-2">
              Bon retour 👋
            </h1>
            <p className="text-white/40 text-[13px]">
              Connectez-vous à votre espace VividFlow
            </p>
          </div>
        </div>

        {/* Bottom white card — formulaire */}
        <div className="bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="Adresse email"
              className="w-full bg-[#F5F5F3] border border-transparent rounded-2xl px-4 py-3.5 text-[#111111] text-[14px] placeholder-[#111111]/30 focus:outline-none focus:border-[#FF4D00] transition-colors"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Mot de passe"
                className="w-full bg-[#F5F5F3] border border-transparent rounded-2xl px-4 py-3.5 pr-12 text-[#111111] text-[14px] placeholder-[#111111]/30 focus:outline-none focus:border-[#FF4D00] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#111111]/30 hover:text-[#111111]/60 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p className="text-red-500 text-[12px] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#111111] hover:bg-[#222222] disabled:opacity-40 text-[#FF4D00] font-semibold text-[14px] py-3.5 rounded-2xl transition-colors mt-1"
            >
              {loading ? 'Connexion…' : 'Se connecter →'}
            </button>
          </form>

          <p className="text-center text-[#111111]/20 text-[11px] mt-6">
            VividFlow — Propulsé par Qorpo
          </p>
        </div>
      </div>

      {/* ── DESKTOP layout (≥ md) — identique à l'original ── */}
      <div className="hidden md:flex min-h-screen items-center justify-center bg-[#EEF0EB] p-8">
        <div className="flex w-full max-w-[860px] rounded-[28px] overflow-hidden shadow-2xl" style={{ height: '560px' }}>

          {/* Gauche : formulaire */}
          <div className="w-[420px] flex-shrink-0 flex flex-col justify-between px-10 py-9 bg-white">
            <div className="flex items-center gap-3">
              <Image src="/soren-logo.png" alt="VividFlow" width={64} height={64} className="object-contain rounded-xl" style={{ width: 64, height: 64 }} />
              <span className="text-[#111111] font-bold text-[17px] tracking-tight">VividFlow</span>
            </div>

            <div>
              <h1 className="text-[#111111] font-bold text-[28px] leading-snug mb-2">
                Bon retour 👋
              </h1>
              <p className="text-[#9CA3AF] text-[13px] mb-7">
                Connectez-vous à votre espace VividFlow
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="Adresse email"
                  className="w-full bg-[#F5F5F3] border border-transparent rounded-2xl px-4 py-3 text-[#111111] text-[13px] placeholder-[#111111]/25 focus:outline-none focus:border-[#FF4D00] transition-colors"
                />

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Mot de passe"
                    className="w-full bg-[#F5F5F3] border border-transparent rounded-2xl px-4 py-3 pr-11 text-[#111111] text-[13px] placeholder-[#111111]/25 focus:outline-none focus:border-[#FF4D00] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#111111]/25 hover:text-[#111111]/50 transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {error && (
                  <p className="text-red-500 text-[12px] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#111111] hover:bg-[#222222] disabled:opacity-40 text-[#FF4D00] font-semibold text-[13px] py-3 rounded-2xl transition-colors"
                >
                  {loading ? 'Connexion…' : 'Se connecter →'}
                </button>
              </form>
            </div>

            <p className="text-[#111111]/20 text-[11px]">
              VividFlow — Propulsé par Qorpo
            </p>
          </div>

          {/* Droite : visuel */}
          <div className="flex-1 relative bg-[#111111] overflow-hidden">
            <div
              className="absolute top-[-30%] right-[-20%] w-[500px] h-[500px] rounded-full opacity-25"
              style={{ background: 'radial-gradient(circle, #FF4D00 0%, transparent 65%)' }}
            />
            <div
              className="absolute bottom-[-20%] left-[-10%] w-[350px] h-[350px] rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #FF4D00 0%, transparent 65%)' }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(226,255,141,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(226,255,141,0.05) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#FF4D00] flex items-center justify-center mb-6 shadow-lg">
                <Image src="/soren-logo.png" alt="VividFlow" width={30} height={30} className="object-contain" />
              </div>
              <h2 className="text-white font-bold text-[20px] leading-tight mb-3">
                Votre infrastructure<br />agentique opérationnelle
              </h2>
              <p className="text-white/35 text-[12.5px] max-w-[220px] leading-relaxed">
                Leads, suivis, agents IA — tout au même endroit.
              </p>
              <div className="flex gap-6 mt-10">
                {[['∞', 'Leads qualifiés'], ['24/7', 'Agents actifs'], ['0', 'Tâches perdues']].map(([val, label]) => (
                  <div key={label} className="text-center">
                    <p className="text-[#FF4D00] font-bold text-[24px]">{val}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
