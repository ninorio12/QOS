'use client'

import { useEffect, useState } from 'react'

interface PdfThumbnailProps {
  pdfUrl:      string | null
  numero:      string | null
  titre?:      string | null
  brandColor?: string
  montantTtc?: number | null
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function PdfThumbnail({
  pdfUrl,
  numero,
  titre,
  brandColor = '#d28e46',
  montantTtc,
}: PdfThumbnailProps) {
  const [logo,       setLogo]       = useState('')
  const [entreprise, setEntreprise] = useState('VividFlow')

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('vividflow_compte') ?? '{}')
      if (stored.logo)       setLogo(stored.logo)
      if (stored.entreprise) setEntreprise(stored.entreprise)
    } catch {}
  }, [])

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>

      {/* Document A4 miniature */}
      <div style={{
        width: 86, height: 121,
        background: 'white',
        borderRadius: 2,
        boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>

        {/* Deux maisons SVG — viewBox 0 0 210 297 comme devis-demo.html */}
        <svg
          viewBox="0 0 210 297"
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
        >
          <g transform="translate(38, 145)" fill="none" stroke={brandColor} strokeWidth="16"
             strokeLinecap="round" strokeLinejoin="round" opacity="0.09">
            <path d="M -55 0 L 0 -58 L 55 0 L 55 78 L -55 78 Z"/>
          </g>
          <g transform="translate(173, 246)" fill="none" stroke={brandColor} strokeWidth="16"
             strokeLinecap="round" strokeLinejoin="round" opacity="0.09">
            <path d="M -80 0 L 0 -85 L 80 0 L 80 115 L -80 115 Z"/>
          </g>
        </svg>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 5px 3px', position: 'relative', zIndex: 2 }}>
          {/* Logo + nom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {logo ? (
              <img src={logo} alt="logo" style={{ width: 11, height: 11, objectFit: 'contain', borderRadius: 1, flexShrink: 0 }} />
            ) : (
              <div style={{ position: 'relative', width: 11, height: 11, border: `1.5px solid ${brandColor}`, borderRadius: 1, flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: `4px solid ${brandColor}` }}/>
              </div>
            )}
            <div>
              <div style={{ fontSize: 6, fontWeight: 900, color: '#111', lineHeight: 1, letterSpacing: 0.3 }}>{entreprise.slice(0, 8)}</div>
              <div style={{ fontSize: 3, color: brandColor, lineHeight: 1.1, marginTop: 0.5, fontWeight: 700 }}>Construction</div>
            </div>
          </div>
          {/* DEVIS N° */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 6, fontWeight: 700, color: brandColor, letterSpacing: 0.5 }}>DEVIS</div>
            {numero && <div style={{ fontSize: 4, color: '#777', marginTop: 0.5 }}>N°{numero}</div>}
          </div>
        </div>

        {/* Séparateur */}
        <div style={{ height: 0.5, background: '#ccc', margin: '0 5px', position: 'relative', zIndex: 2 }}/>

        {/* Objet */}
        <div style={{ padding: '3px 5px 2px', position: 'relative', zIndex: 2 }}>
          <span style={{ fontSize: 3.5, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>Objet </span>
          <span style={{ fontSize: 3.5, color: '#222', fontWeight: 700 }}>{titre ? titre.slice(0, 24) : '—'}</span>
        </div>

        {/* Tableau */}
        <div style={{ margin: '0 5px', border: '0.5px solid #ccc', borderRadius: 1, overflow: 'hidden', position: 'relative', zIndex: 2 }}>
          {/* Header tableau */}
          <div style={{ background: brandColor, display: 'flex', gap: 1, padding: '2px 3px', alignItems: 'center' }}>
            <div style={{ flex: 2.5, height: 3, background: 'rgba(255,255,255,0.65)', borderRadius: 0.5 }}/>
            <div style={{ width: 7, height: 3, background: 'rgba(255,255,255,0.65)', borderRadius: 0.5 }}/>
            <div style={{ width: 5, height: 3, background: 'rgba(255,255,255,0.65)', borderRadius: 0.5 }}/>
            <div style={{ width: 9, height: 3, background: 'rgba(255,255,255,0.65)', borderRadius: 0.5 }}/>
            <div style={{ width: 5, height: 3, background: 'rgba(255,255,255,0.65)', borderRadius: 0.5 }}/>
            <div style={{ width: 11, height: 3, background: 'rgba(255,255,255,0.65)', borderRadius: 0.5 }}/>
          </div>
          {/* Lignes données */}
          {[0,1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', gap: 1, padding: '1.5px 3px', background: i % 2 ? '#fcfcfc' : 'white', alignItems: 'center' }}>
              <div style={{ flex: 2.5, height: 2.5, background: '#e8e8e8', borderRadius: 0.5 }}/>
              <div style={{ width: 7, height: 2.5, background: '#e8e8e8', borderRadius: 0.5 }}/>
              <div style={{ width: 5, height: 2.5, background: '#e8e8e8', borderRadius: 0.5 }}/>
              <div style={{ width: 9, height: 2.5, background: '#e8e8e8', borderRadius: 0.5 }}/>
              <div style={{ width: 5, height: 2.5, background: '#e8e8e8', borderRadius: 0.5 }}/>
              <div style={{ width: 11, height: 2.5, background: '#e8e8e8', borderRadius: 0.5 }}/>
            </div>
          ))}
        </div>

        {/* Footer grid : signature | chantier | totaux */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 2, margin: '3px 5px 2px', position: 'relative', zIndex: 2 }}>
          {/* Signature */}
          <div style={{ border: '0.5px solid #ccc', padding: '2px 3px', height: 16 }}>
            <div style={{ width: '60%', height: 2, background: '#ccc', borderRadius: 0.5, marginBottom: 1.5 }}/>
            <div style={{ width: '90%', height: 1.5, background: '#ddd', borderRadius: 0.5 }}/>
          </div>
          {/* Chantier */}
          <div style={{ padding: '2px 0' }}>
            <div style={{ width: '80%', height: 1.5, background: '#ddd', borderRadius: 0.5, marginBottom: 1.5 }}/>
            <div style={{ width: '60%', height: 1.5, background: '#ddd', borderRadius: 0.5, marginBottom: 1 }}/>
            <div style={{ width: '70%', height: 1.5, background: '#ddd', borderRadius: 0.5 }}/>
          </div>
          {/* Totaux */}
          <div style={{ border: '0.5px solid #ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 2px', borderBottom: '0.5px solid #eee' }}>
              <div style={{ width: 10, height: 1.5, background: '#ddd', borderRadius: 0.5, alignSelf: 'center' }}/>
              <div style={{ width: 10, height: 1.5, background: '#ddd', borderRadius: 0.5, alignSelf: 'center' }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 2px', background: '#f2f2f2' }}>
              <span style={{ fontSize: 3, fontWeight: 700, color: '#111' }}>TTC</span>
              <span style={{ fontSize: 3, fontWeight: 900, color: '#111' }}>
                {montantTtc != null ? fmtEUR(montantTtc) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Mentions légales mini */}
        <div style={{ margin: '0 5px 2px', position: 'relative', zIndex: 2 }}>
          <div style={{ height: 0.5, background: '#eee', marginBottom: 1.5 }}/>
          {[0,1].map(i => (
            <div key={i} style={{ width: ['90%','75%'][i], height: 1.5, background: '#e8e8e8', borderRadius: 0.5, marginBottom: 1 }}/>
          ))}
        </div>

        {/* Barre couleur — absolute en bas comme devis-demo.html */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%',
          background: brandColor, height: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, zIndex: 3,
        }}>
          <div style={{ width: 14, height: 1.5, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }}/>
          <div style={{ width: 10, height: 1.5, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }}/>
          <div style={{ width: 12, height: 1.5, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }}/>
        </div>

      </div>
    </div>
  )
}
