// src/components/devis/DevisView.tsx
'use client'

import { useState } from 'react'
import DevisListView from './DevisListView'
import DevisDetailView from './DevisDetailView'

type Ligne = {
  quantite:     number
  prixUnitaire: number
  tvaRate:      number
  description:  string
  unite:        string
}

type Devis = {
  id: string; numero: string | null; contact_name: string | null
  contact_email: string | null; contact_phone: string | null
  contact_id: string | null; conversation_id: string | null
  titre: string; contenu: string; lignes: Ligne[]
  notes: string; montant_ht: number | null; statut: string
  created_at: string; envoye_le: string | null; ville: string | null
  date_validite: string | null; adresse_chantier: string | null
  pdf_url: string | null; source: string
  signature_statut: 'non_envoye' | 'envoye' | 'vu' | 'signe'
  signature_vu_le: string | null
  signature_signe_le: string | null
}

type View = 'list' | 'detail'

export default function DevisView({ devisList: initial }: { devisList: Devis[] }) {
  const [devisList, setDevisList] = useState<Devis[]>(initial)
  const [view, setView]           = useState<View>('list')
  const [selected, setSelected]   = useState<Devis | null>(null)

  function handleClose()          { setView('list'); setSelected(null) }
  function handleUpdated(d: Devis) {
    setDevisList(p => p.map(x => x.id === d.id ? d : x))
    setSelected(d)
  }
  function handleDeleted(id: string) {
    setDevisList(p => p.filter(x => x.id !== id))
    handleClose()
  }

  return (
    <div className="h-screen flex flex-col bg-[#EEF0EB]" style={{ marginLeft: 236 }}>
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === 'list' && (
          <DevisListView
            devisList={devisList}
            onNew={() => { alert('TODO: créer un devis') }}
            onSelect={d => { setSelected(d as unknown as Devis); setView('detail') }}
          />
        )}
        {view === 'detail' && selected && (
          <DevisDetailView
            devis={selected}
            onClose={handleClose}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        )}
      </div>
    </div>
  )
}
