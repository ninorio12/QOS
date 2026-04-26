'use client'

// Wrapper client — charge les paramètres société, injecte le CSS des encadrés bleus,
// puis délègue le rendu à DevisTemplateStatic (source unique de vérité).

import { useEffect, useState } from 'react'
import DevisTemplateStatic, { type CompanyForTemplate } from './DevisTemplateStatic'

type Ligne = {
  _id?: string
  description: string
  quantite: number
  unite: string
  prixUnitaire: number
  tvaRate: number
}

interface DevisTemplateProps {
  numero:          string | null
  titre:           string
  lignes:          Ligne[]
  notes:           string
  ville:           string
  dateValidite:    string
  adresseChantier: string
  contactName:     string | null
  contactEmail:    string | null
  contactPhone:    string | null
  adresseClient:   string
  createdAt:       string
  brandColor:      string
}

const DEFAULT_COMPANY: CompanyForTemplate = {
  name: 'Mon Entreprise', tagline: '', address: '',
  phone: '', email: '', logoBase64: null,
  capital: '', siret: '', tvaIntra: '', assurance: '',
  brandColor: '#111111',
}

export default function DevisTemplate({
  numero, titre, lignes, notes, ville, dateValidite,
  adresseChantier, contactName, adresseClient, createdAt, brandColor,
}: DevisTemplateProps) {
  const [company, setCompany] = useState<CompanyForTemplate>({ ...DEFAULT_COMPANY, brandColor })

  useEffect(() => {
    function loadCompany() {
      fetch('/api/settings/company')
        .then(r => r.json())
        .then(d => {
          const c = d.company
          if (!c) return
          const svgRaw: string | null = c.logo_svg ?? null
          // btoa est disponible côté navigateur
          const logoBase64 = svgRaw
            ? btoa(unescape(encodeURIComponent(svgRaw)))
            : null
          setCompany({
            name:       c.name        ?? DEFAULT_COMPANY.name,
            tagline:    c.tagline     ?? '',
            address:    c.address     ?? '',
            phone:      c.phone       ?? '',
            email:      c.email       ?? '',
            logoBase64,
            capital:    c.capital     ?? '',
            siret:      c.siret       ?? '',
            tvaIntra:   c.tva_intra   ?? '',
            assurance:  c.assurance   ?? '',
            brandColor: c.brand_color ?? brandColor,
          })
        })
        .catch(() => {})
    }

    loadCompany()
    window.addEventListener('company-settings-updated', loadCompany)
    return () => window.removeEventListener('company-settings-updated', loadCompany)
  }, [brandColor])

  return (
    <>
      {/* CSS encadrés éditables — masqués à l'impression, absents du PDF */}
      <style>{`
        .devis-field {
          outline: 1.5px solid rgba(59, 130, 246, 0.40);
          border-radius: 3px;
          padding: 1px 3px;
          background: rgba(59, 130, 246, 0.05);
        }
        @media print {
          .devis-field {
            outline: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <DevisTemplateStatic
        numero={numero}
        titre={titre}
        lignes={lignes}
        notes={notes}
        ville={ville}
        dateValidite={dateValidite}
        adresseChantier={adresseChantier}
        contactName={contactName}
        adresseClient={adresseClient}
        createdAt={createdAt}
        company={company}
      />
    </>
  )
}
