'use client'

import { useEffect } from 'react'
import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'

// La page login est TOUJOURS en clair, quel que soit le thème choisi (next-themes).
// Script bloquant (chargement SSR) + effet (nav SPA) ; on restaure le thème en quittant.
const FORCE_LIGHT = `(function(){try{var d=document.documentElement;d.classList.remove('dark');d.classList.add('light');d.style.colorScheme='light';}catch(e){}})()`

/**
 * Login — layout 2 panneaux (réf. BrightNest) adapté VividFlow.
 * Gauche : carte dégradé orange (logo + tagline). Droite : formulaire Clerk stylé.
 * Grande carte blanche arrondie centrée sur fond gris.
 */
const appearance = {
  layout: {
    logoPlacement: 'none' as const,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'iconButton' as const,
    showOptionalFields: false,
  },
  variables: {
    colorPrimary: '#0A0A0A',
    colorText: '#1C1C1E',
    colorTextSecondary: '#9A9AA0',
    colorBackground: '#FFFFFF',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#1C1C1E',
    colorDanger: '#FF3B30',
    borderRadius: '10px',
    fontSize: '13px',
    spacingUnit: '0.78rem',
    fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none !overflow-visible',
    card: 'bg-transparent shadow-none border-0 p-0 gap-4 !mx-0',
    header: 'hidden',
    logoBox: 'hidden',
    form: 'gap-3',
    formFieldRow: 'gap-1.5',
    formFieldLabelRow: 'mb-1',
    formFieldLabel: 'text-[#3C3C41] text-[12px] font-semibold pl-1.5',
    formFieldInput:
      'h-10 rounded-[11px] bg-[#F6F6F8] border border-[#ECECEE] px-3.5 text-[13.5px] text-[#1C1C1E] ' +
      'placeholder:text-[#B8B8BD] focus:bg-white focus:border-[#D6D6DA] focus:ring-4 focus:ring-[#0A0A0A]/[0.035] transition',
    formFieldInputShowPasswordButton: 'text-[#9A9AA0] hover:text-[#1C1C1E]',
    formButtonPrimary:
      'h-10 rounded-[11px] bg-[#0A0A0A] hover:bg-[#1C1C1E] text-white text-[14px] font-semibold ' +
      'normal-case tracking-[-0.01em] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)] transition-colors',
    buttonArrowIcon: 'hidden',
    dividerRow: 'my-1',
    dividerLine: 'bg-[#ECECEE]',
    dividerText: 'text-[#9A9AA0] text-[12px]',
    socialButtons: 'gap-2.5',
    socialButtonsIconButton:
      'h-10 flex-1 rounded-[11px] border border-[#ECECEE] bg-[#F6F6F8] hover:bg-[#F0F0F2] transition-colors',
    footerAction: 'hidden', // invitation uniquement (via les paramètres) → pas d'inscription publique
    footerActionText: 'text-[#9A9AA0]',
    footerActionLink: 'text-[#FF4D00] font-semibold hover:text-[#FF4D00]/80',
    footer: 'mt-1',
  },
}

const GRADIENT =
  'radial-gradient(120% 120% at 78% 88%, #FF5A1F 0%, rgba(255,90,31,0) 56%),' +
  'radial-gradient(95% 95% at 52% 60%, #FF8A4C 0%, rgba(255,138,76,0) 62%),' +
  'radial-gradient(80% 80% at 28% 26%, #FFE0C6 0%, rgba(255,224,198,0) 72%),' +
  'linear-gradient(135deg, #FFF7F0 0%, #FFE2CB 100%)'

// Footer Clerk présenté en chip refined : pastille blanche, ombre douce, texte gris unifié
// (rayure + orange "Development mode" neutralisés). Le badge dev disparaît en Production.
const FOOTER_SOFT = `
.cl-footer{
  display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:10px!important;flex-wrap:wrap!important;
  width:100%!important;margin:18px 0 0!important;padding:13px 18px!important;
  background:#FFFFFF!important;background-image:none!important;border:1px solid #EAEAEC!important;border-radius:11px!important;
  box-shadow:0 1px 2px rgba(20,20,40,.04),0 6px 16px -10px rgba(20,20,40,.12)!important;opacity:1!important;
}
.cl-footer::before,.cl-footer::after{display:none!important;content:none!important}
.cl-footer *{
  font-size:12px!important;font-weight:500!important;letter-spacing:.01em!important;line-height:1.4!important;
  background:transparent!important;background-image:none!important;color:#A0A0A6!important;
  border:0!important;box-shadow:none!important;
}
.cl-footer svg,.cl-footer img{opacity:.7!important}
/* Connexion e-mail + mot de passe uniquement (social masqué : GitHub retiré, Google non configuré en prod). */
.cl-socialButtons,.cl-dividerRow{display:none!important}
`

export default function LoginPage() {
  useEffect(() => {
    const html = document.documentElement
    const force = () => {
      if (html.classList.contains('dark')) { html.classList.remove('dark'); html.classList.add('light') }
      html.style.colorScheme = 'light'
    }
    force()
    const obs = new MutationObserver(force)
    obs.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => {
      obs.disconnect()
      html.style.colorScheme = ''
      let t: string | null = null
      try { t = localStorage.getItem('theme') } catch { /* noop */ }
      if (t === 'dark') { html.classList.add('dark'); html.classList.remove('light') }
    }
  }, [])

  return (
    <div className="min-h-[100dvh] w-full bg-[#E7E7E5] flex items-center justify-center p-4 sm:p-6">
      <script dangerouslySetInnerHTML={{ __html: FORCE_LIGHT }} />
      <style dangerouslySetInnerHTML={{ __html: FOOTER_SOFT }} />
      <div className="w-full max-w-[840px] rounded-[24px] bg-white border border-black/[0.04] shadow-[0_2px_4px_rgba(0,0,0,0.04),0_30px_70px_-30px_rgba(0,0,0,0.22)] p-2.5 grid md:grid-cols-2 gap-0 overflow-hidden">

        {/* —— Panneau gauche : dégradé + marque + tagline —— */}
        <div
          className="relative hidden md:flex flex-col justify-between rounded-[16px] p-6 min-h-[460px] overflow-hidden"
          style={{ background: GRADIENT }}
        >
          <div className="flex items-center gap-2.5">
            <span className="rounded-[9px] overflow-hidden ring-1 ring-black/[0.06] shadow-sm">
              <Image src="/vividflow-logo.png" alt="VividFlow" width={26} height={26} priority />
            </span>
            <span className="text-[#1C1C1E] text-[14px] font-semibold tracking-[-0.02em]">VividFlow</span>
          </div>

          <div className="max-w-[362px]">
            <p className="text-[#7A4A2E] text-[12px] font-medium mb-2">Votre Data OS</p>
            <h2 className="text-[#1C1C1E] text-[19.5px] leading-[1.3] font-semibold tracking-[-0.025em] whitespace-nowrap">
              Votre activité devient lisible,<br />vos actions deviennent simples.
            </h2>
          </div>
        </div>

        {/* —— Panneau droit : formulaire —— */}
        <div className="flex items-center justify-center px-6 py-8 sm:px-8">
          <div className="w-full max-w-[326px]">
            <div className="flex items-center gap-2.5">
              <span className="md:hidden rounded-[9px] overflow-hidden ring-1 ring-black/[0.06] shadow-sm flex-shrink-0">
                <Image src="/vividflow-logo.png" alt="VividFlow" width={34} height={34} priority />
              </span>
              <h1 className="text-[#1C1C1E] text-[22px] font-semibold tracking-[-0.03em]">Bon retour</h1>
            </div>
            <p className="mt-1 mb-6 text-[#9A9AA0] text-[13px] leading-[1.5]">
              Connectez-vous pour accéder à votre espace VividFlow.
            </p>

            <SignIn
              appearance={appearance}
              routing="hash"
              signUpUrl="/login"
              fallbackRedirectUrl="/dashboard"
              forceRedirectUrl="/dashboard"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
