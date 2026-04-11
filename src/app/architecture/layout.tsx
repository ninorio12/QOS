import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function ArchitectureLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070B12]">
      <Sidebar />
      <Header />
      <main className="ml-60 pt-14 h-screen overflow-hidden">
        {children}
      </main>
    </div>
  )
}
