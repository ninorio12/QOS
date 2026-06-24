'use client'

import { useState } from 'react'
import { useSafeUser as useUser } from '@/lib/clerkSafe'
import { Lock, Check } from 'lucide-react'
import { inputCls, labelCls } from './_shared'

type ClerkErr = { errors?: { message?: string; longMessage?: string }[] }

export default function PasswordSection() {
  const { user, isLoaded } = useUser()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const hasPassword = !!user?.passwordEnabled
  const canSubmit = !!next && !!confirm && (!hasPassword || !!current)

  async function submit() {
    setError(''); setDone(false)
    if (next.length < 8) { setError('Le nouveau mot de passe doit faire au moins 8 caractères.'); return }
    if (next !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    if (!user) { setError('Session introuvable, reconnectez-vous.'); return }
    setSaving(true)
    try {
      await user.updatePassword({
        newPassword: next,
        ...(hasPassword ? { currentPassword: current } : {}),
        signOutOfOtherSessions: false,
      })
      setDone(true); setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setDone(false), 2800)
    } catch (e) {
      const err = e as ClerkErr
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Échec de la mise à jour du mot de passe.')
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded) return null

  return (
    <div className="bg-soren-card rounded-2xl border border-soren-border p-5">
      <div className="mb-4 flex items-start gap-2">
        <Lock size={15} className="text-soren-subtle mt-0.5" />
        <div>
          <h3 className="text-[13px] font-semibold text-soren-text">Mot de passe</h3>
          <p className="text-xs text-soren-subtle mt-0.5">Modifiez votre mot de passe de connexion.</p>
        </div>
      </div>

      <div className="space-y-4 max-w-md">
        {hasPassword && (
          <div>
            <label className={labelCls}>Mot de passe actuel</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
              className={inputCls} autoComplete="current-password" placeholder="••••••••" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nouveau mot de passe</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)}
              className={inputCls} autoComplete="new-password" placeholder="Min. 8 caractères" />
          </div>
          <div>
            <label className={labelCls}>Confirmer</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className={inputCls} autoComplete="new-password" placeholder="Répéter" />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={submit}
          disabled={saving || !canSubmit}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
            done
              ? 'bg-green-500/15 text-green-600'
              : canSubmit
                ? 'bg-[#FF4D00] text-white hover:bg-[#E64500] shadow-sm'
                : 'bg-soren-elevated text-soren-subtle cursor-default'
          }`}
        >
          {done ? <Check size={15} /> : <Lock size={15} />}
          {saving ? 'Mise à jour…' : done ? 'Mot de passe modifié' : 'Modifier le mot de passe'}
        </button>
      </div>
    </div>
  )
}
