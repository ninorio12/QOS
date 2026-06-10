'use client'

import { useEffect, useState } from 'react'

/**
 * Bandeau d'installation PWA.
 * - Android : capte `beforeinstallprompt` → bouton « Installer » en 1 clic.
 * - iOS (Safari/Chrome) : pas d'install auto possible → guide visuel (Partager → Sur l'écran d'accueil).
 * Se cache si déjà installé (standalone) ou si l'utilisateur a fermé le bandeau.
 */
const DISMISS_KEY = 'vf_install_dismissed'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BIPEvent = Event & { prompt: () => void; userChoice: Promise<any> }

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)
  const [chromeIOS, setChromeIOS] = useState(false)
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)

  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
      if (standalone) return
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch { /* noop */ }

    const ua = navigator.userAgent || ''
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Mac/.test(ua) && 'ontouchend' in document)
    setIos(isIOS)
    setChromeIOS(/CriOS/i.test(ua)) // Chrome iOS : "Sur l'écran d'accueil" est tout en bas du partage

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); setShow(true) }
    window.addEventListener('beforeinstallprompt', onBIP)

    let t: ReturnType<typeof setTimeout> | undefined
    if (isIOS) t = setTimeout(() => setShow(true), 1500)

    return () => { window.removeEventListener('beforeinstallprompt', onBIP); if (t) clearTimeout(t) }
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* noop */ }
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch { /* noop */ }
    dismiss()
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] p-3 sm:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
      <div className="mx-auto max-w-[440px] flex items-center gap-3 rounded-2xl bg-white border border-black/[0.06] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.25)] px-3.5 py-3">
        <img src="/vividflow-logo.png" alt="VividFlow" width={38} height={38} className="rounded-[10px] flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#1C1C1E] leading-tight">Installer VividFlow</p>
          {ios ? (
            <p className="text-[11.5px] text-[#7A7A80] leading-snug mt-0.5">
              Appuyez sur <span className="inline-flex items-center align-middle mx-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>
              </span> Partager{chromeIOS ? ', puis « View More »' : ''}, puis <b className="text-[#1C1C1E]">« Sur l'écran d'accueil »</b>.
              {chromeIOS ? <span className="block text-[#A0A0A6] mt-0.5">Pas visible ? Ouvrez ce lien dans Safari.</span> : null}
            </p>
          ) : (
            <p className="text-[11.5px] text-[#7A7A80] leading-snug mt-0.5">Accès plein écran depuis votre écran d'accueil.</p>
          )}
        </div>
        {!ios && (
          <button onClick={install} className="flex-shrink-0 bg-[#0A0A0A] hover:bg-[#1C1C1E] text-white text-[12.5px] font-semibold rounded-xl px-3.5 py-2 transition-colors">
            Installer
          </button>
        )}
        <button onClick={dismiss} aria-label="Fermer" className="flex-shrink-0 text-[#B0B0B5] hover:text-[#1C1C1E] w-6 h-6 flex items-center justify-center text-lg leading-none">×</button>
      </div>
    </div>
  )
}
