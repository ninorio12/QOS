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
    <div className="min-h-screen flex items-center justify-center bg-[#EEF0EB] p-8">
      <div className="flex w-full max-w-[860px] rounded-[28px] overflow-hidden shadow-2xl" style={{ height: '560px' }}>

        {/* ── Gauche : formulaire ── */}
        <div className="w-[420px] flex-shrink-0 flex flex-col justify-between px-10 py-9 bg-white">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src="/soren-logo.png" alt="Soren" width={42} height={42} className="object-contain rounded-xl" />
            <span className="text-[#111111] font-bold text-[17px] tracking-tight">Soren</span>
          </div>

          {/* Contenu central */}
          <div>
            <h1 className="text-[#111111] font-bold text-[28px] leading-snug mb-2">
              Bon retour 👋
            </h1>
            <p className="text-[#9CA3AF] text-[13px] mb-7">
              Connectez-vous à votre espace Soren
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="Adresse email"
                className="w-full bg-[#F5F5F3] border border-transparent rounded-2xl px-4 py-3 text-[#111111] text-[13px] placeholder-[#111111]/25 focus:outline-none focus:border-[#E2FF8D] transition-colors"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Mot de passe"
                  className="w-full bg-[#F5F5F3] border border-transparent rounded-2xl px-4 py-3 pr-11 text-[#111111] text-[13px] placeholder-[#111111]/25 focus:outline-none focus:border-[#E2FF8D] transition-colors"
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
                className="w-full bg-[#111111] hover:bg-[#222222] disabled:opacity-40 text-[#E2FF8D] font-semibold text-[13px] py-3 rounded-2xl transition-colors"
              >
                {loading ? 'Connexion…' : 'Se connecter →'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-[#111111]/20 text-[11px]">
            Soren — Propulsé par Qorpo
          </p>
        </div>

        {/* ── Droite : visuel ── */}
        <div className="flex-1 relative bg-[#111111] overflow-hidden">
          {/* Blobs */}
          <div
            className="absolute top-[-30%] right-[-20%] w-[500px] h-[500px] rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #E2FF8D 0%, transparent 65%)' }}
          />
          <div
            className="absolute bottom-[-20%] left-[-10%] w-[350px] h-[350px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #E2FF8D 0%, transparent 65%)' }}
          />

          {/* Grille */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(226,255,141,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(226,255,141,0.05) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Contenu */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E2FF8D] flex items-center justify-center mb-6 shadow-lg">
              <Image src="/soren-logo.png" alt="Soren" width={30} height={30} className="object-contain" />
            </div>
            <h2 className="text-white font-bold text-[20px] leading-tight mb-3">
              Votre infrastructure<br />agentique opérationnelle
            </h2>
            <p className="text-white/35 text-[12.5px] max-w-[220px] leading-relaxed">
              Leads, suivis, agents IA — tout au même endroit.
            </p>

            {/* Stats déco */}
            <div className="flex gap-6 mt-10">
              {[['∞', 'Leads qualifiés'], ['24/7', 'Agents actifs'], ['0', 'Tâches perdues']].map(([val, label]) => (
                <div key={label} className="text-center">
                  <p className="text-[#E2FF8D] font-bold text-[24px]">{val}</p>
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
