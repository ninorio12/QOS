'use client'

import ThemeToggle from '@/components/settings/ThemeToggle'

export default function ApparenceTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-soren-card rounded-2xl border border-soren-border p-6">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h3 className="text-[15px] font-semibold text-soren-text">Thème</h3>
            <p className="text-xs text-soren-subtle mt-0.5">Choisissez l&apos;apparence de l&apos;interface. « Système » suit les réglages de votre appareil.</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
