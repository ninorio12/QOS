'use client'

// Page de gestion d'une réservation (annulation par le prospect) — charte
// vividflow.co (vf-onboarding.css chargé par le layout (public)).
// Publique : le token opaque de l'URL est l'autorisation.

import { useEffect, useState } from 'react'

type Info = {
  title: string; date: string | null; durationMin: number | null
  timezone: string; meetLink: string | null; status: string
  slug: string | null; accentColor: string | null
}

export default function ManageBookingPage({ params }: { params: { token: string } }) {
  const [info, setInfo] = useState<Info | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/book/manage/${params.token}`)
      .then(async r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { if (alive) setInfo(d) })
      .catch(() => { if (alive) setErr('Réservation introuvable.') })
    return () => { alive = false }
  }, [params.token])

  const cancel = async () => {
    if (!confirm('Annuler ce rendez-vous ?')) return
    setBusy(true)
    try {
      const r = await fetch(`/api/book/manage/${params.token}`, { method: 'DELETE' })
      const d = await r.json()
      if (r.ok && d.ok !== false) setCancelled(true)
      else setErr('Annulation impossible (rendez-vous déjà annulé ou passé).')
    } catch { setErr('Erreur réseau. Réessayez.') }
    setBusy(false)
  }

  const when = info?.date
    ? new Intl.DateTimeFormat('fr-FR', { timeZone: info.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(info.date))
    : null
  const isCancelled = cancelled || info?.status === 'cancelled'

  return (
    <div className="vf-app" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '28px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div className="vf-card" style={{ padding: '40px 36px', textAlign: 'center' }}>
          <div className="vf-mono" style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--color-brand)', textTransform: 'uppercase', marginBottom: 18 }}>
            VividFlow
          </div>

          {err && !info ? (
            <p style={{ color: 'var(--color-ink-3)', margin: 0 }}>{err}</p>
          ) : !info ? (
            <p style={{ color: 'var(--color-ink-4)', margin: 0 }}>Chargement…</p>
          ) : isCancelled ? (
            <>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--color-paper-2)', border: '1px solid var(--color-line-strong)', color: 'var(--color-ink-3)', display: 'grid', placeItems: 'center', fontSize: 22, margin: '0 auto 18px' }}>✕</div>
              <h1 className="vf-title" style={{ fontSize: 26, lineHeight: 1.15, margin: '0 0 8px' }}>Rendez-vous annulé</h1>
              <p style={{ color: 'var(--color-ink-3)', fontSize: 14, margin: '0 0 24px' }}>{info.title}{when ? ` · ${when}` : ''}</p>
              {info.slug && (
                <a href={`/book/${info.slug}`} className="vf-btn-primary" style={{ textDecoration: 'none' }} data-testid="rebook">
                  Reprendre un rendez-vous
                </a>
              )}
            </>
          ) : (
            <>
              <h1 className="vf-title" style={{ fontSize: 26, lineHeight: 1.15, margin: '0 0 10px' }}>{info.title}</h1>
              {when && <p className="vf-mono" style={{ color: 'var(--color-ink)', fontWeight: 500, fontSize: 14, margin: '0 0 4px', textTransform: 'capitalize' }}>{when}</p>}
              <p style={{ color: 'var(--color-ink-3)', fontSize: 13, margin: '0 0 26px' }}>{info.durationMin ? `${info.durationMin} min · ` : ''}Visioconférence Google Meet</p>
              {info.meetLink && (
                <div style={{ marginBottom: 14 }}>
                  <a href={info.meetLink} target="_blank" rel="noreferrer" className="vf-btn-primary" style={{ textDecoration: 'none' }}>
                    Rejoindre le Google Meet ↗
                  </a>
                </div>
              )}
              <button onClick={cancel} disabled={busy} className="vf-btn-secondary" data-testid="cancel"
                      style={{ color: 'var(--color-block)', borderColor: 'var(--color-line-strong)' }}>
                {busy ? 'Annulation…' : 'Annuler le rendez-vous'}
              </button>
              {err && <p style={{ color: 'var(--color-block)', fontSize: 13, marginTop: 14 }}>{err}</p>}
            </>
          )}
        </div>
        <p className="vf-mono" style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-ink-4)', letterSpacing: '.08em', marginTop: 18 }}>
          PROPULSÉ PAR VIVIDFLOW
        </p>
      </div>
    </div>
  )
}
