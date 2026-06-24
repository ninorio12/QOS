'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Upload, Trash2, X } from 'lucide-react'
import { useSafeUser as useUser } from '@/lib/clerkSafe'
import { DEMO_MODE } from '@/lib/demo'

// Modale de bienvenue affichée UNE seule fois, par-dessus le SaaS flouté, pour
// laisser le nouveau membre compléter sa fiche profil — mêmes champs + même
// persistance que Paramètres → Profil (localStorage `vividflow_demo_profile`
// + avatar/nom Clerk). Marqueur "vu" : localStorage `vividflow_onboarding_done`.

const STORAGE_KEY = 'vividflow_demo_profile'
const SEEN_KEY = 'vividflow_onboarding_done'

type Profile = {
  firstName: string; lastName: string; email: string; photo: string
  phone: string; address: string; postalCode: string; city: string
}
const EMPTY: Profile = { firstName: '', lastName: '', email: '', photo: '', phone: '', address: '', postalCode: '', city: '' }

function fileToDownscaledDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read-error'))
    reader.onload = () => {
      const src = reader.result
      if (typeof src !== 'string') return reject(new Error('bad-result'))
      const img = new window.Image()
      img.onerror = () => reject(new Error('img-error'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(src)
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, w, h)
        const hasAlpha = /image\/png|image\/webp/i.test(file.type)
        try { resolve(canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', 0.9)) } catch { resolve(src) }
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}

const inputCls =
  'w-full h-10 rounded-[11px] bg-[#F6F6F8] border border-[#ECECEE] px-3.5 text-[13.5px] text-[#1C1C1E] ' +
  'placeholder:text-[#B8B8BD] focus:bg-white focus:border-[#D6D6DA] focus:ring-4 focus:ring-[#FF4D00]/[0.06] outline-none transition'
const labelCls = 'block text-[12px] font-semibold text-[#3C3C41] mb-1.5 pl-0.5'

export default function OnboardingModal() {
  const { user } = useUser()
  const [show, setShow] = useState(false)
  const [form, setForm] = useState<Profile>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Décide de l'affichage (une seule fois) après le montage — pas de flash SSR.
  useEffect(() => {
    if (DEMO_MODE) return
    let done = false
    try { done = localStorage.getItem(SEEN_KEY) === '1' } catch { /* noop */ }
    if (!done) setShow(true)
  }, [])

  // Pré-remplissage : localStorage existant + nom/prénom/email de l'invitation.
  useEffect(() => {
    if (!show) return
    let base: Profile = { ...EMPTY }
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) base = { ...base, ...JSON.parse(raw) } } catch { /* noop */ }
    if (user) {
      base.firstName = base.firstName || (user.firstName ?? '')
      base.lastName = base.lastName || (user.lastName ?? '')
      base.email = base.email || (user.primaryEmailAddress?.emailAddress ?? '')
      if (!base.photo && user.hasImage) base.photo = user.imageUrl
    }
    setForm(base)
  }, [show, user])

  function set(key: keyof Profile, value: string) { setForm(f => ({ ...f, [key]: value })) }

  async function handleFile(file: File | undefined | null) {
    setUploadError('')
    if (!file) return
    if (!/image\/(png|jpe?g|webp)/i.test(file.type)) { setUploadError('Format non supporté (PNG, JPG ou WEBP).'); return }
    try {
      const dataUrl = await fileToDownscaledDataUrl(file)
      set('photo', dataUrl)
      try { await user?.setProfileImage({ file }) } catch { /* preview locale conservée */ }
    } catch { setUploadError('Impossible de lire cette image.') }
  }

  function markSeen() { try { localStorage.setItem(SEEN_KEY, '1') } catch { /* noop */ } }

  async function finish() {
    setSaving(true)
    try {
      const payload: Profile = {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(),
        photo: form.photo, phone: form.phone.trim(), address: form.address.trim(),
        postalCode: form.postalCode.trim(), city: form.city.trim(),
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); window.dispatchEvent(new Event('vividflow-profile-updated')) } catch { /* noop */ }
      try { await user?.update({ firstName: payload.firstName, lastName: payload.lastName }) } catch { /* noop */ }
    } finally {
      markSeen(); setSaving(false); setShow(false)
    }
  }

  function later() { markSeen(); setShow(false) }

  if (!show || typeof document === 'undefined') return null

  const initial = (form.firstName.trim()[0] || form.lastName.trim()[0] || 'V').toUpperCase()

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ colorScheme: 'light' }}>
      {/* SaaS flouté en fond */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />

      <div className="relative w-full max-w-[440px] max-h-[90vh] overflow-y-auto rounded-[22px] bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] border border-black/[0.05]"
           style={{ animation: 'fadeSlideUp 220ms ease-out both' }}>
        {/* Filet + en-tête */}
        <div className="h-1 bg-[#FF4D00] rounded-t-[22px]" />
        <button onClick={later} aria-label="Plus tard"
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#F2F2F4] hover:bg-[#E8E8EB] flex items-center justify-center text-[#9A9AA0] transition-colors">
          <X size={15} />
        </button>

        <div className="px-7 pt-6 pb-7">
          <h1 className="text-[#1C1C1E] text-[20px] font-semibold tracking-[-0.03em]">
            {form.firstName ? `Bienvenue, ${form.firstName} 👋` : 'Bienvenue 👋'}
          </h1>
          <p className="mt-1 mb-5 text-[#9A9AA0] text-[13px] leading-[1.5]">
            Complétez votre profil pour démarrer. Vous pourrez le modifier à tout moment dans Paramètres.
          </p>

          {/* Photo */}
          <div className="flex items-center gap-4 mb-5">
            <div onClick={() => fileRef.current?.click()} role="button" tabIndex={0}
              className="group relative w-16 h-16 rounded-full flex-shrink-0 cursor-pointer overflow-hidden flex items-center justify-center"
              style={form.photo ? undefined : { backgroundColor: '#FF4D00' }}>
              {form.photo
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={form.photo} alt="Profil" className="w-full h-full object-cover" />
                : <span className="text-xl font-bold text-white">{initial}</span>}
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Upload size={16} className="text-white" /></div>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e => void handleFile(e.target.files?.[0])} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-[#F6F6F8] text-[#1C1C1E] hover:ring-2 hover:ring-[#ECECEE] transition-all"><Upload size={13} /> Photo</button>
                {form.photo && <button type="button" onClick={() => { set('photo', ''); if (fileRef.current) fileRef.current.value = ''; void user?.setProfileImage({ file: null }).catch(() => {}) }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-[#9A9AA0] hover:text-red-500 transition-all"><Trash2 size={13} /></button>}
              </div>
              {uploadError && <p className="text-[11px] text-red-500 mt-1">{uploadError}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3.5">
              <div><label className={labelCls}>Prénom</label><input value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inputCls} placeholder="Thomas" /></div>
              <div><label className={labelCls}>Nom</label><input value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inputCls} placeholder="Dupont" /></div>
            </div>
            <div><label className={labelCls}>Téléphone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+41 22 000 00 00" type="tel" /></div>
            <div><label className={labelCls}>Adresse</label><input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} placeholder="Rue du Commerce 12" /></div>
            <div className="grid grid-cols-2 gap-3.5">
              <div><label className={labelCls}>Code postal</label><input value={form.postalCode} onChange={e => set('postalCode', e.target.value)} className={inputCls} placeholder="1204" /></div>
              <div><label className={labelCls}>Ville</label><input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} placeholder="Genève" /></div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button onClick={() => void finish()} disabled={saving}
              className="flex items-center justify-center gap-2 flex-1 h-11 rounded-[12px] bg-[#FF4D00] text-white text-[14px] font-semibold hover:bg-[#E64500] disabled:opacity-50 transition-colors">
              {saving ? 'Un instant…' : 'Enregistrer'}
            </button>
            <button onClick={later} disabled={saving} className="text-[13px] font-medium text-[#9A9AA0] hover:text-[#1C1C1E] px-2 transition-colors">Plus tard</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
