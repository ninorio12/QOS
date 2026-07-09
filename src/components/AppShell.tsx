'use client'

import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import MobileNav from '@/components/MobileNav'
import MobileHeader from '@/components/MobileHeader'
import ThemeSync from '@/components/ThemeSync'
import ModuleGuard from '@/components/ModuleGuard'
import PageTransition from '@/components/PageTransition'
import OnboardingModal from '@/components/OnboardingModal'
import VersionWatcher from '@/components/VersionWatcher'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-soren-app">
      {/* Cross-cutting client effects (render null) */}
      <ThemeSync />
      <ModuleGuard />
      <OnboardingModal />
      <VersionWatcher />

      {/* Sidebar — desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Header — desktop only */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Mobile header — mobile only */}
      <MobileHeader />

      {/* Mobile bottom nav — self-hides on desktop */}
      <MobileNav />

      {/* Main content */}
      <main className="vf-main-offset pt-14 md:pt-12 pb-28 md:pb-0 md:h-screen md:overflow-y-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
