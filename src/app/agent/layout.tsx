import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121721]">
      <Sidebar />
      <Header />
      <main className="ml-16 pt-14 min-h-screen">
        {children}
      </main>
    </div>
  )
}
