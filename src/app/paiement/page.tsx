import { CreditCard } from 'lucide-react'

export default function PaiementPage({ searchParams }: { searchParams: { contact?: string; name?: string } }) {
  const clientName = searchParams?.name ? decodeURIComponent(searchParams.name) : null

  return (
    <div className="h-full flex flex-col px-6 py-6">
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-black text-soren-text">Paiement</h1>
        <p className="text-sm text-soren-muted mt-1">
          {clientName ? `Paiements de ${clientName}` : 'Suivi des paiements encaissés'}
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-[320px]">
          <div className="w-12 h-12 rounded-2xl bg-soren-card border border-soren-border flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CreditCard size={20} className="text-soren-subtle" />
          </div>
          <p className="text-sm font-semibold text-soren-text mb-1.5">
            {clientName ? `Paiements de ${clientName}` : 'Connexion bancaire à venir'}
          </p>
          <p className="text-xs text-soren-subtle leading-relaxed">
            Connecte ton compte pour suivre automatiquement les paiements encaissés.
          </p>
        </div>
      </div>
    </div>
  )
}
