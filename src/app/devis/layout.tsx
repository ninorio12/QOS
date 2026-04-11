import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function DevisLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEF0EB]">
      <Sidebar />
      <Header />
      <main className="ml-60 pt-14 h-[calc(100vh-3px)] overflow-hidden">
        {children}
      </main>
    </div>
  )
}
