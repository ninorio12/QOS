'use client'

import { useEffect, useRef, useState } from 'react'
import { Save, Check, Upload, Trash2 } from 'lucide-react'
import { inputCls, labelCls } from './_shared'
import PasswordSection from './PasswordSection'
import { useUser } from '@clerk/nextjs'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Convertit un dataURL (photo locale) en File pour l'upload Clerk.
async function dataUrlToFile(dataUrl: string, name = 'avatar'): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
  return new File([blob], `${name}.${ext}`, { type: blob.type || 'image/jpeg' })
}

const STORAGE_KEY = 'vividflow_demo_profile'

type Profile = {
  firstName: string
  lastName: string
  email: string
  photo: string // dataURL or ''
  phone: string
  address: string
  postalCode: string
  city: string
}

const EMPTY: Profile = {
  firstName: '', lastName: '', email: '', photo: '',
  phone: '', address: '', postalCode: '', city: '',
}

function loadProfile(): Profile {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      firstName: parsed.firstName ?? '',
      lastName: parsed.lastName ?? '',
      email: parsed.email ?? '',
      photo: parsed.photo ?? '',
      phone: parsed.phone ?? '',
      address: parsed.address ?? '',
      postalCode: parsed.postalCode ?? '',
      city: parsed.city ?? '',
    }
  } catch {
    return EMPTY
  }
}

// Downscale an image file to ~256px (longest edge) and return a JPEG/PNG dataURL.
function fileToDownscaledDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read-error'))
    reader.onload = () => {
      const src = reader.result
      if (typeof src !== 'string') return reject(new Error('bad-result'))
      const img = new Image()
      img.onerror = () => reject(new Error('img-error'))
      img.onload = () => {
        const { width, height } = img
        const scale = Math.min(1, maxSize / Math.max(width, height))
        const w = Math.max(1, Math.round(width * scale))
        const h = Math.max(1, Math.round(height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(src) // fallback to original
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, w, h)
        const hasAlpha = /image\/png|image\/webp/i.test(file.type)
        try {
          resolve(canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', 0.9))
        } catch {
          resolve(src)
        }
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-soren-card rounded-2xl border border-soren-border p-5">
      <div className="mb-4">
        <h3 className="text-[13px] font-semibold text-soren-text">{title}</h3>
        {description && <p className="text-xs text-soren-subtle mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function ProfilTab() {
  const [form, setForm] = useState<Profile>(EMPTY)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { user } = useUser()
  const { me } = useCurrentUser()

  // Hydrate from localStorage after mount (hydration-safe).
  useEffect(() => {
    setForm(loadProfile())
  }, [])

  // Auto-migration : si une photo locale existe mais que Clerk n'a pas encore
  // d'image custom, on la pousse vers Clerk (source de vérité de l'avatar partout).
  useEffect(() => {
    if (!user || user.hasImage) return
    const local = loadProfile().photo
    if (!local || !local.startsWith('data:')) return
    let done = false
    ;(async () => {
      try {
        const file = await dataUrlToFile(local)
        if (!done) await user.setProfileImage({ file })
      } catch { /* silencieux : on garde la preview locale */ }
    })()
    return () => { done = true }
  }, [user])

  // Warn on navigation if unsaved changes.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function set(key: keyof Profile, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(true)
    setSaved(false)
  }

  async function handleFile(file: File | undefined | null) {
    setUploadError('')
    if (!file) return
    if (!/image\/(png|jpe?g|webp)/i.test(file.type)) {
      setUploadError('Format non supporté. Utilisez un PNG, JPG ou WEBP.')
      return
    }
    try {
      const dataUrl = await fileToDownscaledDataUrl(file)
      set('photo', dataUrl)
      // Pousse vers Clerk → avatar cohérent partout (header, sidebar…).
      try { await user?.setProfileImage({ file }) } catch { setUploadError("Photo enregistrée en local mais non synchronisée au compte. Réessayez.") }
    } catch {
      setUploadError('Impossible de lire cette image.')
    }
  }

  function removePhoto() {
    set('photo', '')
    if (fileRef.current) fileRef.current.value = ''
    void user?.setProfileImage({ file: null }).catch(() => {})
  }

  function save() {
    setSaving(true)
    const payload: Profile = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      photo: form.photo,
      phone: form.phone.trim(),
      address: form.address.trim(),
      postalCode: form.postalCode.trim(),
      city: form.city.trim(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      window.dispatchEvent(new Event('vividflow-profile-updated'))
      setForm(payload)
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const initial = (form.firstName.trim()[0] || form.lastName.trim()[0] || 'A').toUpperCase()

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Photo de profil */}
      <Section title="Photo de profil" description="Elle apparaît dans la barre latérale et sur vos activités.">
        <div className="flex items-center gap-5">
          {/* Avatar / dropzone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault()
              setDragging(false)
              void handleFile(e.dataTransfer.files?.[0])
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
            aria-label="Changer la photo de profil"
            className={[
              'group relative w-20 h-20 rounded-full flex-shrink-0 cursor-pointer overflow-hidden flex items-center justify-center select-none transition-all',
              'focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/40 focus:ring-offset-2 focus:ring-offset-soren-card',
              dragging ? 'ring-2 ring-[#FF4D00] ring-offset-2 ring-offset-soren-card' : '',
            ].join(' ')}
            style={form.photo ? undefined : { backgroundColor: '#FF4D00' }}
          >
            {form.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photo} alt="Photo de profil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{initial}</span>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload size={20} className="text-white" />
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={e => void handleFile(e.target.files?.[0])}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-soren-elevated text-soren-text hover:ring-2 hover:ring-soren-border transition-all"
              >
                <Upload size={14} />
                Changer la photo
              </button>
              {form.photo && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-soren-subtle hover:text-red-500 hover:bg-red-500/8 transition-all"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              )}
            </div>
            <p className="text-xs text-soren-subtle mt-2.5">
              Glissez une image ou cliquez. PNG, JPG ou WEBP.
            </p>
            {uploadError && <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>}
          </div>
        </div>
      </Section>

      {/* Informations personnelles */}
      <Section title="Informations personnelles" description="Vos informations de compte.">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Prénom</label>
              <input
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
                className={inputCls}
                placeholder="Admin"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className={labelCls}>Nom</label>
              <input
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                className={inputCls}
                placeholder="Dupont"
                autoComplete="family-name"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className={inputCls}
              placeholder="admin@vividflow.fr"
              type="email"
              autoComplete="email"
            />
          </div>
          <div>
            <label className={labelCls}>Rôle</label>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FF4D00]/10 text-[#FF4D00] ring-1 ring-[#FF4D00]/20 capitalize">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00]" />
              {me?.role ?? '—'}
            </span>
          </div>
        </div>
      </Section>

      {/* Coordonnées */}
      <Section title="Coordonnées" description="Comment vous joindre.">
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Téléphone</label>
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className={inputCls}
              placeholder="+41 22 000 00 00"
              type="tel"
              autoComplete="tel"
            />
          </div>
          <div>
            <label className={labelCls}>Adresse</label>
            <input
              value={form.address}
              onChange={e => set('address', e.target.value)}
              className={inputCls}
              placeholder="Rue du Commerce 12"
              autoComplete="street-address"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Code postal</label>
              <input
                value={form.postalCode}
                onChange={e => set('postalCode', e.target.value)}
                className={inputCls}
                placeholder="1204"
                autoComplete="postal-code"
              />
            </div>
            <div>
              <label className={labelCls}>Ville</label>
              <input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                className={inputCls}
                placeholder="Genève"
                autoComplete="address-level2"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Sécurité — changement de mot de passe (Clerk) */}
      <PasswordSection />

      {/* Barre de sauvegarde sticky */}
      <div className="sticky bottom-0 -mx-1">
        <div className="flex items-center justify-end gap-3 bg-soren-card/90 backdrop-blur-md border border-soren-border rounded-2xl px-5 py-3 shadow-lg">
          <span className={`text-xs transition-opacity ${dirty ? 'opacity-100 text-soren-subtle' : 'opacity-0'}`}>
            Modifications non enregistrées
          </span>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
              saved
                ? 'bg-green-500/15 text-green-600'
                : dirty
                  ? 'bg-[#FF4D00] text-white hover:bg-[#E64500] shadow-sm'
                  : 'bg-soren-elevated text-soren-subtle cursor-default'
            }`}
          >
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saving ? 'Sauvegarde…' : saved ? 'Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}
