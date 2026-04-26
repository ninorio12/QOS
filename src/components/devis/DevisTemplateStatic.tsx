// Source unique de vérité pour le rendu du devis.
// Utilisé par :
//   - DevisTemplate.tsx (wrapper client, injecte le CSS des encadrés bleus)
//   - route PDF via renderToStaticMarkup (pas de CSS encadrés → spans invisibles)

import React from 'react'

type Ligne = {
  _id?: string
  description: string
  quantite: number
  unite: string
  prixUnitaire: number
  tvaRate: number
}

export type CompanyForTemplate = {
  name:        string
  tagline:     string
  address:     string
  phone:       string
  email:       string
  logoBase64:  string | null   // SVG pré-encodé en base64, ou null
  capital:     string
  siret:       string
  tvaIntra:    string
  assurance:   string
  brandColor:  string
}

interface DevisStaticProps {
  numero:          string | null
  titre:           string
  lignes:          Ligne[]
  notes:           string
  ville:           string
  dateValidite:    string
  adresseChantier: string
  contactName:     string | null
  adresseClient:   string
  createdAt:       string
  company:         CompanyForTemplate
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function fmtDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Encadré éditable — visible en aperçu grâce au CSS injecté par DevisTemplate,
// invisible en PDF (aucun CSS .devis-field dans le document généré)
function F({ children }: { children: React.ReactNode }) {
  return <span className="devis-field">{children}</span>
}

export default function DevisTemplateStatic({
  numero, titre, lignes, notes, ville, dateValidite,
  adresseChantier, contactName, adresseClient, createdAt, company,
}: DevisStaticProps) {
  const brand = company.brandColor || '#111111'

  const validLignes = lignes.filter(l => l.description.trim())

  const ht = validLignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)

  const tvaMap: Record<number, number> = {}
  for (const l of validLignes) {
    const lHt = l.quantite * l.prixUnitaire
    tvaMap[l.tvaRate] = (tvaMap[l.tvaRate] ?? 0) + lHt * (l.tvaRate / 100)
  }
  const totalTVA = Object.values(tvaMap).reduce((s, v) => s + v, 0)
  const ttc = ht + totalTVA

  const adresseLines = company.address ? company.address.split('\n') : []
  const clientLines  = adresseClient   ? adresseClient.split('\n')  : []
  const taglineParts = company.tagline
    ? company.tagline.split('·').map(p => p.trim()).filter(Boolean)
    : []

  const footerParts = [
    company.capital  ? `Sarl au capital de ${company.capital}` : '',
    company.siret    ? `Siret : ${company.siret}` : '',
    company.tvaIntra ? `TVA intracommunautaire : ${company.tvaIntra}` : '',
  ].filter(Boolean)

  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      background: '#fff',
      padding: '15mm',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
      color: '#333',
      boxSizing: 'border-box',
    }}>

      {/* Maisons en arrière-plan */}
      <svg
        viewBox="0 0 210 297"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
      >
        <g transform="translate(38, 145)" fill="none" stroke={brand} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" opacity="0.09">
          <path d="M -55 0 L 0 -58 L 55 0 L 55 78 L -55 78 Z"/>
        </g>
        <g transform="translate(173, 246)" fill="none" stroke={brand} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" opacity="0.09">
          <path d="M -80 0 L 0 -85 L 80 0 L 80 115 L -80 115 Z"/>
        </g>
      </svg>

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>

        {/* Gauche : logo + infos société */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            {company.logoBase64 ? (
              <img
                src={`data:image/svg+xml;base64,${company.logoBase64}`}
                alt="logo"
                style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 8, flexShrink: 0, display: 'block' }}
              />
            ) : (
              <div style={{ width: 60, height: 60, border: `5px solid ${brand}`, borderRadius: 8, position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', borderLeft: '25px solid transparent', borderRight: '25px solid transparent', borderBottom: `18px solid ${brand}` }}/>
              </div>
            )}
            <div>
              <div style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>
                {company.name || 'Mon Entreprise'}
              </div>
              {taglineParts.length > 0 && (
                <div style={{ fontSize: 14, lineHeight: 1.2, fontWeight: 700 }}>
                  <span style={{ color: brand }}>{taglineParts[0]}</span>
                  {taglineParts.slice(1).map((p, i) => <span key={i}><br/>{p}</span>)}
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 15, fontSize: 12, lineHeight: 1.8 }}>
            {adresseLines.map((line, i) => <div key={i}>{line}</div>)}
            {company.phone && <div><strong>Tél. {company.phone}</strong></div>}
            {company.email && <div>{company.email}</div>}
          </div>
        </div>

        {/* Droite : numéro + client + date */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: brand, fontSize: 28, fontWeight: 700 }}>
            DEVIS{numero ? ` N°${numero}` : ''}
          </div>
          <div style={{ marginTop: 40, fontSize: 16, lineHeight: 1.6, paddingRight: 40 }}>
            <div><strong><F>{contactName || '___'}</F></strong></div>
            {clientLines.map((line, i) => (
              <div key={i} style={{ fontSize: 12, color: '#666' }}><F>{line}</F></div>
            ))}
          </div>
          <div style={{ textAlign: 'right', marginTop: 8, fontSize: 13, paddingRight: 40 }}>
            <F>{ville || '___'}</F>, le {createdAt ? fmtDate(createdAt) : '___'}
          </div>
        </div>
      </header>

      {/* OBJET */}
      <div style={{ margin: '50px 0 20px', fontSize: 14, fontWeight: 700, position: 'relative', zIndex: 2 }}>
        Objet : <F>{titre || '___'}</F>
      </div>

      {/* TABLEAU LIGNES */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, position: 'relative', zIndex: 2, border: '1px solid #ccc' }}>
        <thead>
          <tr>
            {(['Libellé', 'Qte', 'U', 'P.U.', 'TVA', 'Total €'] as const).map((h, i) => (
              <th key={h} style={{
                background: brand, color: 'white', padding: 8,
                textTransform: 'uppercase', fontWeight: 400,
                border: '1px solid rgba(0,0,0,0.1)',
                textAlign: i === 0 ? 'left' : 'center',
                width: i === 0 ? '55%' : undefined,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {validLignes.map((l, i) => (
            <tr key={l._id ?? i}>
              <td style={{ padding: '12px 8px', borderRight: '1px solid #ccc', lineHeight: 1.4 }}>
                <F>{l.description}</F>
              </td>
              <td style={{ padding: '12px 8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>
                <F>{l.quantite.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</F>
              </td>
              <td style={{ padding: '12px 8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>
                <F>{l.unite || 'U'}</F>
              </td>
              <td style={{ padding: '12px 8px', borderRight: '1px solid #ccc', textAlign: 'right' }}>
                <F>{fmtEUR(l.prixUnitaire)}</F>
              </td>
              <td style={{ padding: '12px 8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>
                <F>{l.tvaRate.toFixed(2)}</F>
              </td>
              <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                <F>{fmtEUR(l.quantite * l.prixUnitaire)}</F>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* FOOTER GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 20, marginTop: 40, position: 'relative', zIndex: 2 }}>

        {/* Signature */}
        <div style={{ border: '1px solid #ccc', background: 'white', padding: 8, fontSize: 10 }}>
          <strong>Bon pour accord,</strong><br/>
          <span style={{ fontSize: 8.5 }}>&quot;Devis reçu avant acceptation des travaux&quot;</span>
        </div>

        {/* Infos chantier */}
        <div style={{ fontSize: 9.5, lineHeight: 1.5 }}>
          <div>
            <strong>Date de validité :</strong><br/>
            <F>{dateValidite ? fmtDate(dateValidite) : '___'}</F>
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Adresse de chantier :</strong><br/>
            <F>{adresseChantier || '___'}</F>
          </div>
        </div>

        {/* Totaux */}
        <div style={{ border: '1px solid #ccc', fontSize: 10.5 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>TOTAL HT</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmtEUR(ht)}</td>
              </tr>
              {Object.entries(tvaMap)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([rate, amount]) => (
                  <tr key={rate}>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>TVA {Number(rate).toFixed(2)}%</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmtEUR(amount)}</td>
                  </tr>
                ))}
              <tr style={{ background: '#f2f2f2', fontWeight: 900, fontSize: 10.5 }}>
                <td style={{ padding: '4px 8px' }}>TOTAL TTC</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtEUR(ttc)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* MENTIONS LÉGALES */}
      <div style={{ marginTop: 18, marginBottom: 18, fontSize: 8.5, lineHeight: 1.55, color: '#555', position: 'relative', zIndex: 2 }}>
        Délai d&apos;exécution : <F>{notes || '___'}</F><br/>
        Les TVA et autres charges sont susceptibles de subir d&apos;éventuelles variations découlant des dispositions législatives ou réglementaires en vigueur à la date des règlements.<br/>
        Le client reconnaît avoir pris connaissance des conditions générales applicables au marché, jointes à ce document.<br/>
        Souhaitez-vous conserver les pièces, éléments ou appareils remplacés ? [ ] Oui &nbsp;&nbsp; [ ] Non
      </div>

      {/* BARRE BAS */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%',
        background: brand, color: 'white',
        padding: '12px', textAlign: 'center', fontSize: 9, lineHeight: 1.6,
        boxSizing: 'border-box',
      }}>
        {footerParts.join(' \u00a0·\u00a0 ')}
        {company.assurance && <><br/>Assurance décennale : {company.assurance}</>}
      </div>

    </div>
  )
}
