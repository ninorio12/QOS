'use client'

// Template devis A4 — fidèle à devis-demo.html
// Couleurs, logo, infos société = paramètres compte
// Données devis = dynamiques en temps réel

import { useEffect, useState } from 'react'

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

type CompanySettings = {
  entreprise: string
  tagline:    string
  adresse:    string
  email:      string
  telephone:  string
  logo:       string   // data URL (localStorage profile photo)
  logoSvg:    string   // SVG brut (Supabase)
  capital:    string
  siret:      string
  tvaIntra:   string
  assurance:  string
  brandColor: string
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}
function fmtDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function totalHT(lignes: Ligne[]) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
}
function totalTTC(lignes: Ligne[]) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire * (1 + l.tvaRate / 100), 0)
}

// Encadré bleu transparent — disparaît à l'impression
function E({ children }: { children: React.ReactNode }) {
  return (
    <span className="devis-field">{children}</span>
  )
}

export default function DevisTemplate({
  numero, titre, lignes, notes, ville, dateValidite,
  adresseChantier, contactName, contactEmail, contactPhone,
  adresseClient, createdAt, brandColor,
}: DevisTemplateProps) {
  const [company, setCompany] = useState<CompanySettings>({
    entreprise: 'Mon Entreprise', tagline: '', adresse: '',
    email: '', telephone: '', logo: '', logoSvg: '',
    capital: '', siret: '', tvaIntra: '', assurance: '',
    brandColor: brandColor,
  })

  useEffect(() => {
    function loadCompany() {
      fetch('/api/settings/company')
        .then(r => r.json())
        .then(d => {
          const c = d.company
          if (!c) return
          setCompany(prev => ({
            ...prev,
            entreprise: c.name        ?? prev.entreprise,
            tagline:    c.tagline     ?? prev.tagline,
            adresse:    c.address     ?? prev.adresse,
            email:      c.email       ?? prev.email,
            telephone:  c.phone       ?? prev.telephone,
            logoSvg:    c.logo_svg    ?? prev.logoSvg,
            capital:    c.capital     ?? prev.capital,
            siret:      c.siret       ?? prev.siret,
            tvaIntra:   c.tva_intra   ?? prev.tvaIntra,
            assurance:  c.assurance   ?? prev.assurance,
            brandColor: c.brand_color ?? prev.brandColor,
          }))
        })
        .catch(() => {})
    }

    loadCompany()
    window.addEventListener('company-settings-updated', loadCompany)
    return () => window.removeEventListener('company-settings-updated', loadCompany)
  }, [])

  const validLignes = lignes.filter(l => l.description.trim())
  const ht = totalHT(validLignes)
  const ttc = totalTTC(validLignes)

  const tvaMap: Record<number, number> = {}
  for (const l of validLignes) {
    const lHt = l.quantite * l.prixUnitaire
    tvaMap[l.tvaRate] = (tvaMap[l.tvaRate] ?? 0) + lHt * (l.tvaRate / 100)
  }

  const adresseLines  = company.adresse   ? company.adresse.split('\n')   : ['___', '___']
  const clientLines   = adresseClient     ? adresseClient.split('\n')     : ['___', '___']

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

      {/* Style encadrés éditables — masqués à l'impression */}
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

      {/* Maisons en arrière-plan */}
      <svg
        viewBox="0 0 210 297"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
      >
        <g transform="translate(38, 145)" fill="none" stroke={brandColor} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" opacity="0.09">
          <path d="M -55 0 L 0 -58 L 55 0 L 55 78 L -55 78 Z"/>
        </g>
        <g transform="translate(173, 246)" fill="none" stroke={brandColor} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" opacity="0.09">
          <path d="M -80 0 L 0 -85 L 80 0 L 80 115 L -80 115 Z"/>
        </g>
      </svg>

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>

        {/* Gauche : logo + infos société */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            {/* Logo : SVG Supabase en priorité */}
            {company.logoSvg ? (
              <img
                src={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(company.logoSvg)))}`}
                alt="logo"
                style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 8, flexShrink: 0, display: 'block' }}
              />
            ) : (
              <div style={{ width: 60, height: 60, border: `5px solid ${company.brandColor || brandColor}`, borderRadius: 8, position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', borderLeft: '25px solid transparent', borderRight: '25px solid transparent', borderBottom: `18px solid ${company.brandColor || brandColor}` }}/>
              </div>
            )}
            <div>
              <div style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: 1, fontFamily: "'Inter', sans-serif" }}>
                {company.entreprise || 'Mon Entreprise'}
              </div>
              {company.tagline && (() => {
                const parts = company.tagline.split('·').map((p: string) => p.trim()).filter(Boolean)
                return (
                  <div style={{ fontSize: 14, lineHeight: 1.2, fontWeight: 700 }}>
                    <span style={{ color: company.brandColor || brandColor }}>{parts[0]}</span>
                    {parts.slice(1).map((p: string, i: number) => <span key={i}><br/>{p}</span>)}
                  </div>
                )
              })()}
            </div>
          </div>
          <div style={{ marginTop: 15, fontSize: 12, lineHeight: 1.8 }}>
            {adresseLines.map((line, i) => <div key={i}>{line}</div>)}
            {company.telephone && <div><strong>Tél. {company.telephone}</strong></div>}
            {company.email && <div>{company.email}</div>}
          </div>
        </div>

        {/* Droite : numéro + client + date */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: brandColor, fontSize: 28, fontWeight: 700 }}>
            DEVIS N°<E>{numero || '___'}</E>
          </div>
          <div style={{ marginTop: 40, fontSize: 16, lineHeight: 1.6, paddingRight: 40 }}>
            <div><strong><E>{contactName || '___'}</E></strong></div>
            {clientLines.map((line, i) => (
              <div key={i} style={{ fontSize: 12, color: '#666' }}><E>{line}</E></div>
            ))}
          </div>
          <div style={{ textAlign: 'right', marginTop: 8, fontSize: 13, paddingRight: 40 }}>
            <E>{ville || '___'}</E>, le <E>{createdAt ? fmtDate(createdAt) : '___'}</E>
          </div>
        </div>
      </header>

      {/* OBJET */}
      <div style={{ margin: '50px 0 20px', fontSize: 14, fontWeight: 700, position: 'relative', zIndex: 2 }}>
        Objet : <E>{titre || '___'}</E>
      </div>

      {/* TABLEAU LIGNES */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, position: 'relative', zIndex: 2, border: '1px solid #ccc' }}>
        <thead>
          <tr>
            {['Libellé', 'Qte', 'U', 'P.U.', 'TVA', 'Total €'].map((h, i) => (
              <th key={h} style={{
                background: brandColor, color: 'white', padding: 8,
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
              <td style={{ padding: '12px 8px', borderRight: '1px solid #ccc', lineHeight: 1.4 }}><E>{l.description}</E></td>
              <td style={{ padding: '12px 8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>
                <E>{l.quantite.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</E>
              </td>
              <td style={{ padding: '12px 8px', borderRight: '1px solid #ccc', textAlign: 'center' }}><E>{l.unite}</E></td>
              <td style={{ padding: '12px 8px', borderRight: '1px solid #ccc', textAlign: 'right' }}><E>{fmtEUR(l.prixUnitaire)}</E></td>
              <td style={{ padding: '12px 8px', borderRight: '1px solid #ccc', textAlign: 'center' }}><E>{l.tvaRate.toFixed(2)}</E></td>
              <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                <E>{fmtEUR(l.quantite * l.prixUnitaire)}</E>
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
          <span style={{ fontSize: 8.5 }}>"Devis reçu avant acceptation des travaux"</span>
        </div>

        {/* Infos chantier */}
        <div style={{ fontSize: 9.5, lineHeight: 1.5 }}>
          <div>
            <strong>Date de validité :</strong><br/>
            <E>{dateValidite ? fmtDate(dateValidite) : '___'}</E>
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Adresse de chantier :</strong><br/>
            <E>{adresseChantier || '___'}</E>
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
              {Object.entries(tvaMap).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, amount]) => (
                <tr key={rate}>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>TVA {rate}%</td>
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
        Délai d'exécution : <E>{notes || '___'}</E><br/>
        Les TVA et autres charges sont susceptibles de subir d'éventuelles variations découlant des dispositions législatives ou réglementaires en vigueur à la date des règlements.<br/>
        Le client reconnaît avoir pris connaissance des conditions générales applicables au marché, jointes à ce document.<br/>
        Souhaitez-vous conserver les pièces, éléments ou appareils remplacés ? [ ] Oui &nbsp;&nbsp; [ ] Non
      </div>

      {/* BARRE BAS */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%',
        background: company.brandColor || brandColor, color: 'white',
        padding: '12px', textAlign: 'center', fontSize: 9, lineHeight: 1.6,
        boxSizing: 'border-box',
      }}>
        {[
          company.capital  ? `Sarl au capital de ${company.capital}` : '',
          company.siret    ? `Siret : ${company.siret}` : '',
          company.tvaIntra ? `TVA intracommunautaire : ${company.tvaIntra}` : '',
        ].filter(Boolean).join(' \u00a0·\u00a0 ')}
        {company.assurance && <><br/>Assurance décennale : {company.assurance}</>}
      </div>

    </div>
  )
}
