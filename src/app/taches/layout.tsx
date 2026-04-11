import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function TachesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-[#EEF0EB]">
      <Sidebar />
      <Header />
      <main className="ml-60 pt-14 h-screen overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}
