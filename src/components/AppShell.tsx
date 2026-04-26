'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import MobileNav from '@/components/MobileNav'
import MobileHeader from '@/components/MobileHeader'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-soren-app">
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
      <main className="md:ml-60 md:pt-14 pt-14 pb-24 md:pb-0 md:h-screen md:overflow-hidden">
        <div key={pathname} className="page-enter h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
