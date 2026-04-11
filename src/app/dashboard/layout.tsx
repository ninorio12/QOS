import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEF0EB]">
      <Sidebar />
      <Header />
      <main className="ml-60 pt-14 h-screen overflow-hidden page-fade-in">
        {children}
      </main>
    </div>
  )
}
