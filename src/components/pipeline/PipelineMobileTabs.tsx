'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Bascule Leads / Clients visible UNIQUEMENT sur mobile (md:hidden).
// Sur desktop, ce switch est déjà dans le Sidebar ; sur mobile la sidebar est
// masquée, donc sans ce toggle le pipeline Clients est inaccessible.
export default function PipelineMobileTabs() {
  const pathname = usePathname()
  const onClients = pathname.startsWith('/pipeline/clients')
  const tab = 'flex-1 text-center text-[12px] font-semibold py-1.5 rounded-lg transition-colors'
  const active = 'bg-soren-card text-soren-text shadow-sm'
  const idle = 'text-soren-muted hover:text-soren-text'
  return (
    <div className="md:hidden flex gap-1 bg-black/5 rounded-xl p-1 mx-3 mt-3 flex-shrink-0">
      <Link href="/pipeline" className={`${tab} ${onClients ? idle : active}`}>Leads</Link>
      <Link href="/pipeline/clients" className={`${tab} ${onClients ? active : idle}`}>Clients</Link>
    </div>
  )
}
