'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'

type DevisData = {
  id:            string
  titre:         string
  numero:        string | null
  contact_name:  string | null
  contact_email: string | null
  montant_ht:    number
  montant_ttc:   number | null
  pdf_url:       string | null
  statut:        string
  signe_le:      string | null
  ville:         string | null
  created_at:    string | null
}

type CompanyData = {
  name:       string
  brandColor: string
  email:      string
  phone:      string
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function SignerPage() {
  const { token } = useParams<{ token: string }>()
  const [devis, setDevis]       = useState<DevisData | null>(null)
  const [company, setCompany]   = useState<CompanyData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [signed, setSigned]     = useState(false)
  const [signing, setSigning]   = useState(false)
  const [sigError, setSigError] = useState<string | null>(null)
  const [isEmpty, setIsEmpty]   = useState(true)

  const sigCanvasRef  = useRef<SignatureCanvas | null>(null)
  const containerRef  = useRef<HTMLDivElement | null>(null)
  const [canvasW, setCanvasW] = useState(360)

  // Ajuster la largeur du canvas au conteneur
  const updateCanvasWidth = useCallback(() => {
    if (containerRef.current) {
      setCanvasW(containerRef.current.clientWidth)
    }
  }, [])

  useEffect(() => {
    updateCanvasWidth()
    window.addEventListener('resize', updateCanvasWidth)
    return () => window.removeEventListener('resize', updateCanvasWidth)
  }, [updateCanvasWidth])

  useEffect(() => {
    fetch(`/api/devis/signature/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setDevis(data.devis)
        setCompany(data.company)
        if (data.devis.statut === 'signe') setSigned(true)
      })
      .catch(() => setError('Impossible de charger le devis.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSign() {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setSigError('Veuillez signer dans le cadre avant de confirmer.')
      return
    }
    setSigning(true); setSigError(null)
    try {
      const res = await fetch(`/api/devis/signature/${token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setSigned(true)
    } catch (e: unknown) {
      setSigError(e instanceof Error ? e.message : 'Erreur lors de la signature')
    } finally {
      setSigning(false)
    }
  }

  const brand = company?.brandColor ?? '#111111'

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${brand}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ fontSize: 13, margin: 0 }}>Chargement…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  // ─── Erreur ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f0', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '40px 32px', textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔗</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>Lien invalide</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!devis || !company) return null

  const ref = devis.numero ? `Devis n°${devis.numero}` : 'Devis'
  const prenom = devis.contact_name ? devis.contact_name.trim().split(/\s+/)[0] : null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' }}>

      {/* ── Header ── */}
      <header style={{ background: brand, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#111', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {company.name}
        </span>
        {company.email && (
          <a href={`mailto:${company.email}`} style={{ fontSize: 12, color: '#111', opacity: 0.6, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {company.email}
          </a>
        )}
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px 80px' }}>

        {/* ── Titre devis ── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>
            {ref}
          </p>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 900, lineHeight: 1.2 }}>
            {devis.titre || 'Votre devis'}
          </h1>
          {devis.created_at && (
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
              Émis le {fmtDate(devis.created_at)}
              {devis.ville ? ` · ${devis.ville}` : ''}
            </p>
          )}
        </div>

        {/* ── Montants ── */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 10px rgba(0,0,0,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ padding: '18px 12px', textAlign: 'center', borderRight: '1px solid #f0f0ee' }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>Total HT</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{fmtEUR(devis.montant_ht)}</p>
          </div>
          <div style={{ padding: '18px 12px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>Total TTC</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{fmtEUR(devis.montant_ttc ?? devis.montant_ht * 1.2)}</p>
          </div>
        </div>

        {/* ── Lien PDF ── */}
        {devis.pdf_url && (
          <a
            href={devis.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', textDecoration: 'none', color: '#111' }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>📄</span>
            <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Consulter le devis en PDF</span>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>↗</span>
          </a>
        )}

        {/* ── Zone signature / confirmation ── */}
        {signed ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '40px 24px', textAlign: 'center', boxShadow: '0 1px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
              ✅
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900 }}>Devis accepté !</h2>
            {devis.signe_le && (
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>Signé le {fmtDate(devis.signe_le)}</p>
            )}
            <p style={{ margin: '16px 0 0', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
              Merci{prenom ? ` ${prenom}` : ''} !<br/>
              Nous allons vous recontacter rapidement pour démarrer le projet.
            </p>
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                style={{ display: 'inline-block', marginTop: 20, background: brand, color: '#111', textDecoration: 'none', fontWeight: 700, fontSize: 13, padding: '10px 24px', borderRadius: 10 }}
              >
                📞 Nous appeler
              </a>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', boxShadow: '0 1px 10px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>Signer électroniquement</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              En signant, vous acceptez ce devis et les conditions générales de vente.
            </p>

            {/* Canvas de signature */}
            <div
              ref={containerRef}
              style={{ position: 'relative', border: `2px dashed ${brand}`, borderRadius: 14, overflow: 'hidden', marginBottom: 14, background: '#fafafa', cursor: 'crosshair' }}
            >
              {/* Placeholder "Signez ici" — masqué si canvas non vide */}
              {isEmpty && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1 }}>
                  <span style={{ fontSize: 13, color: '#d1d5db', fontStyle: 'italic', userSelect: 'none' }}>✍️ Tracez votre signature ici</span>
                </div>
              )}
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="#111111"
                onBegin={() => setIsEmpty(false)}
                canvasProps={{
                  width:  canvasW,
                  height: 160,
                  style:  { display: 'block', width: '100%', touchAction: 'none' },
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: sigError ? 10 : 0 }}>
              <button
                onClick={() => { sigCanvasRef.current?.clear(); setIsEmpty(true) }}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '11px 16px', fontSize: 13, cursor: 'pointer', color: '#6b7280', fontWeight: 600, flexShrink: 0 }}
              >
                Effacer
              </button>
              <button
                onClick={handleSign}
                disabled={signing}
                style={{ flex: 1, background: brand, border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 800, cursor: signing ? 'not-allowed' : 'pointer', color: '#111', opacity: signing ? 0.6 : 1, transition: 'opacity .15s' }}
              >
                {signing
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 14, height: 14, border: '2px solid #111', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                      Confirmation…
                    </span>
                  : '✍️ Confirmer ma signature'
                }
              </button>
            </div>

            {sigError && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{sigError}</p>
            )}

            <p style={{ margin: '16px 0 0', fontSize: 10, color: '#d1d5db', textAlign: 'center', lineHeight: 1.5 }}>
              Signature électronique — valeur légale (règlement eIDAS n°910/2014)
            </p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

      </main>
    </div>
  )
}
