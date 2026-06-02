export const dynamic = 'force-dynamic'
import ClientsBoard from '@/components/pipeline/ClientsBoard'

export default function ClientsPipelinePage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <ClientsBoard />
    </div>
  )
}
