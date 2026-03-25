'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from './actions'
import Image from 'next/image'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logo.png"
            alt="Qorpo"
            width={160}
            height={56}
            priority
            className="object-contain"
          />
          <p className="text-[#8896AB] text-sm mt-3">Operating System</p>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-8">
          <h1 className="text-white text-xl font-semibold mb-1">Connexion</h1>
          <p className="text-[#666666] text-sm mb-8">Accédez à votre espace CRM</p>

          <form action={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#999999] mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white text-sm placeholder-[#444444] focus:outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] transition-colors"
                placeholder="vous@qorpo.fr"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#999999] mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white text-sm placeholder-[#444444] focus:outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#39FF14] hover:bg-[#32e612] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg px-4 py-3 text-sm transition-colors mt-2"
              style={{ boxShadow: loading ? 'none' : '0 0 20px rgba(57, 255, 20, 0.25)' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#444444] text-xs mt-8">
          © 2025 Qorpo. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}
