'use client'

// Page publique de réservation — charte vividflow.co (vf-onboarding.css chargée
// par le layout (public)). FLOW CONTRACTUEL (ne jamais inverser) :
//   ① Coordonnées (fiche) → CAPTURE immédiate dans le Data OS
//   ② Créneau (calendrier) → réservation + Google Meet
// Si le prospect abandonne à l'étape 2, la fiche + le parcours restent exploitables.

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type LinkInfo = {
  slug: string; title: string; description: string | null
  durationMin: number; timezone: string
  questions: { key: string; label: string; required?: boolean }[]
  accentColor: string | null; hostCount: number
}
type Day = { date: string; times: { start: string; label: string }[] }

const dayLabel = (isoDate: string, tz: string) => {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  return new Intl.DateTimeFormat('fr-FR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'short' }).format(dt)
}

export default function BookingFlow({ slug }: { slug: string }) {
  const search = useSearchParams()
  const [link, setLink] = useState<LinkInfo | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'cal' | 'done'>('form')
  const [form, setForm] = useState<Record<string, string>>({ firstName: '', lastName: '', email: '', phone: '' })
  const [captureId, setCaptureId] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [days, setDays] = useState<Day[] | null>(null)
  const [selDate, setSelDate] = useState<string | null>(null)
  const [selTime, setSelTime] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<{ meetLink: string | null; manageUrl: string | null; start: string } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Infos du lien
  useEffect(() => {
    let alive = true
    fetch(`/api/book/${slug}`)
      .then(async r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { if (alive) setLink(d) })
      .catch(() => { if (alive) setLoadErr('Ce lien de réservation est introuvable ou inactif.') })
    return () => { alive = false }
  }, [slug])

  // Créneaux — chargés quand on atteint l'étape calendrier (+ rechargement après 409)
  useEffect(() => {
    if (step !== 'cal') return
    let alive = true
    const from = new Date().toISOString()
    const to = new Date(Date.now() + 45 * 24 * 3600000).toISOString()
    fetch(`/api/book/${slug}/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(r => r.json())
      .then(sd => {
        if (!alive) return
        setDays(sd.days ?? [])
        setSelDate(prev => (prev && sd.days?.some((d: Day) => d.date === prev)) ? prev : (sd.days?.[0]?.date ?? null))
      })
      .catch(() => { if (alive) setDays([]) })
    return () => { alive = false }
  }, [slug, step, reloadKey])

  const times = useMemo(() => days?.find(d => d.date === selDate)?.times ?? [], [days, selDate])
  const trace = (event: string, detail?: string) => {
    if (!captureId) return
    fetch(`/api/book/${slug}/event`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ captureId, event, detail }),
    }).catch(() => { /* best-effort */ })
  }

  const answers = () => (link?.questions ?? [])
    .map(q => ({ q: q.label, a: (form[`q_${q.key}`] ?? '').trim() }))
    .filter(x => x.a)

  // ── Étape 1 → capture puis calendrier ─────────────────────────────────────
  const submitForm = async () => {
    setCapturing(true); setErr(null)
    try {
      const r = await fetch(`/api/book/${slug}/capture`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone,
          answers: answers(),
          funnel: search.get('f') ?? search.get('funnel') ?? undefined,
          utmSource: search.get('utm_source') ?? undefined,
          utmMedium: search.get('utm_medium') ?? undefined,
          utmCampaign: search.get('utm_campaign') ?? undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setErr(d.error ?? 'Erreur, réessayez.'); setCapturing(false); return }
      setCaptureId(d.captureId ?? null)
      setStep('cal')
      // trace après coup (captureId vient d'arriver)
      if (d.captureId) fetch(`/api/book/${slug}/event`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ captureId: d.captureId, event: 'calendar_viewed' }),
      }).catch(() => { /* best-effort */ })
    } catch { setErr('Erreur réseau. Réessayez.') }
    setCapturing(false)
  }

  // ── Étape 2 → réservation ─────────────────────────────────────────────────
  const confirm = async () => {
    if (!selTime) return
    setSubmitting(true); setErr(null)
    try {
      const r = await fetch(`/api/book/${slug}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone,
          start: selTime, answers: answers(), captureId: captureId ?? undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) {
        setErr(d.error ?? 'Échec de la réservation')
        if (r.status === 409) { setSelTime(null); setDays(null); setReloadKey(k => k + 1) }
        setSubmitting(false)
        return
      }
      setDone({ meetLink: d.meetLink ?? null, manageUrl: d.manageUrl ?? null, start: d.start })
      setStep('done')
    } catch { setErr('Erreur réseau. Réessayez.') }
    setSubmitting(false)
  }

  if (loadErr) return <Canvas><Card center><p style={{ color: 'var(--color-ink-3)', margin: 0 }}>{loadErr}</p></Card></Canvas>
  if (!link) return <Canvas><Card center><p style={{ color: 'var(--color-ink-4)', margin: 0 }}>Chargement…</p></Card></Canvas>

  const fmtWhen = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { timeZone: link.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  const canSubmitForm = form.firstName.trim() && /.+@.+\..+/.test(form.email) &&
    (link.questions ?? []).every(q => !q.required || (form[`q_${q.key}`] ?? '').trim())

  // ── Confirmation ───────────────────────────────────────────────────────────
  if (step === 'done' && done) {
    return (
      <Canvas>
        <Card center data-testid="confirm">
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--color-ok)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26, margin: '0 auto 18px' }}>✓</div>
          <h1 className="vf-title" style={{ fontSize: 28, lineHeight: 1.15, margin: '0 0 10px' }}>C’est confirmé.</h1>
          <p style={{ color: 'var(--color-ink-2)', margin: '0 0 2px', fontSize: 15 }}>{link.title}</p>
          <p className="vf-mono" style={{ color: 'var(--color-ink)', fontSize: 14, margin: '0 0 26px', textTransform: 'capitalize' }}>{fmtWhen(done.start)}</p>
          {done.meetLink ? (
            <a href={done.meetLink} target="_blank" rel="noreferrer" className="vf-btn-primary" style={{ textDecoration: 'none' }}>
              Rejoindre le Google Meet ↗
            </a>
          ) : (
            <p style={{ color: 'var(--color-ink-3)', fontSize: 14, margin: 0 }}>Votre rendez-vous est enregistré. Les détails vous seront envoyés par email.</p>
          )}
          <p style={{ color: 'var(--color-ink-4)', fontSize: 13, marginTop: 22 }}>Invitation envoyée à {form.email}</p>
          {done.manageUrl && (
            <a href={done.manageUrl} className="vf-btn-ghost" style={{ textDecoration: 'none', fontSize: 13 }}>Annuler ou gérer ce rendez-vous</a>
          )}
        </Card>
      </Canvas>
    )
  }

  return (
    <Canvas>
      <div style={{ width: '100%', maxWidth: 880 }}>
        <div className="vf-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>

            {/* ── Colonne gauche : l'événement + stepper ─────────────────── */}
            <aside style={{ flex: '1 1 280px', padding: '34px 32px', borderRight: '1px solid var(--color-line)', background: 'var(--color-paper-2)', display: 'flex', flexDirection: 'column' }}>
              <div className="vf-mono" style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--color-brand)', textTransform: 'uppercase', marginBottom: 14 }}>
                VividFlow
              </div>
              <h1 className="vf-title" style={{ fontSize: 30, lineHeight: 1.12, letterSpacing: '-.01em', margin: '0 0 12px' }}>{link.title}</h1>
              {link.description && <p style={{ color: 'var(--color-ink-3)', fontSize: 14, lineHeight: 1.6, margin: '0 0 22px' }}>{link.description}</p>}
              <div style={{ display: 'grid', gap: 10 }}>
                <MetaRow icon="◷" text={`${link.durationMin} minutes`} />
                <MetaRow icon="▣" text="Visioconférence Google Meet" />
                <MetaRow icon="◍" text={`Fuseau ${link.timezone.replace('_', ' ')}`} />
                {selTime && step === 'cal' && <MetaRow icon="▸" text={fmtWhen(selTime)} strong />}
              </div>
              <div className="vf-mono" style={{ marginTop: 'auto', paddingTop: 28, display: 'flex', gap: 8, alignItems: 'center', fontSize: 10.5, letterSpacing: '.06em', color: 'var(--color-ink-4)' }}>
                <StepDot n={1} state={step === 'form' ? 'cur' : 'done'} /> COORDONNÉES
                <span style={{ width: 26, height: 1, background: 'var(--color-line-strong)' }} />
                <StepDot n={2} state={step === 'form' ? 'off' : step === 'cal' ? 'cur' : 'done'} /> CRÉNEAU
              </div>
            </aside>

            {/* ── Colonne droite : fiche PUIS calendrier ────────────────────── */}
            <section style={{ flex: '1.35 1 340px', padding: '30px 32px', minHeight: 440 }}>
              {step === 'form' ? (
                <div className="vf-enter" style={{ maxWidth: 440 }}>
                  <SectionLabel>Vos coordonnées</SectionLabel>
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="Prénom *" testid="firstName" value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} />
                      <Field label="Nom" testid="lastName" value={form.lastName} onChange={v => setForm(f => ({ ...f, lastName: v }))} />
                    </div>
                    <Field label="Email *" testid="email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
                    <Field label="Téléphone" testid="phone" type="tel" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                    {(link.questions ?? []).map(q => (
                      <Field key={q.key} label={q.required ? `${q.label} *` : q.label}
                             value={form[`q_${q.key}`] ?? ''} onChange={v => setForm(f => ({ ...f, [`q_${q.key}`]: v }))} />
                    ))}
                  </div>
                  {err && <p style={{ color: 'var(--color-block)', fontSize: 13, margin: '12px 0 0' }}>{err}</p>}
                  <div style={{ marginTop: 22 }}>
                    <button className="vf-btn-primary" data-testid="toCal" disabled={!canSubmitForm || capturing} onClick={submitForm} style={{ width: '100%', justifyContent: 'center' }}>
                      {capturing ? 'Un instant…' : 'Voir les disponibilités →'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11.5, color: 'var(--color-ink-4)', marginTop: 12, lineHeight: 1.5 }}>
                    En continuant, vous acceptez d’être recontacté au sujet de votre demande. Vos informations restent confidentielles.
                  </p>
                </div>
              ) : (
                <div className="vf-enter">
                  <button className="vf-btn-ghost" data-testid="back" onClick={() => { setStep('form'); setSelTime(null) }} style={{ marginLeft: -14, marginBottom: 8 }}>← Modifier mes coordonnées</button>
                  {err && (
                    <div style={{ margin: '0 0 14px', padding: '10px 14px', background: 'var(--color-brand-soft)', border: '1px solid var(--color-brand)', borderRadius: 'var(--radius-sm)', color: 'var(--color-brand-deep)', fontSize: 13 }}>
                      {err}
                    </div>
                  )}
                  <SectionLabel>Choisissez votre créneau</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26 }}>
                    <div style={{ flex: '1 1 220px' }}>
                      <div style={{ display: 'grid', gap: 8, maxHeight: 330, overflowY: 'auto', paddingRight: 4 }} className="vf-scroll">
                        {!days ? <p style={{ color: 'var(--color-ink-4)', fontSize: 14 }}>Chargement des disponibilités…</p>
                          : days.length === 0 ? <p style={{ color: 'var(--color-ink-3)', fontSize: 14 }}>Aucun créneau disponible pour le moment. Nous vous recontactons rapidement.</p>
                          : days.map(d => (
                            <button key={d.date} data-testid={`day-${d.date}`}
                                    onClick={() => { setSelDate(d.date); setSelTime(null); trace('day_selected', dayLabel(d.date, link.timezone)) }}
                                    className={`vf-choice${selDate === d.date ? ' active' : ''}`}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
                              <span style={{ fontSize: 14, textTransform: 'capitalize' }}>{dayLabel(d.date, link.timezone)}</span>
                              <span className="vf-mono" style={{ fontSize: 11, color: 'var(--color-ink-4)' }}>{d.times.length}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8, maxHeight: 330, overflowY: 'auto', paddingRight: 4 }} className="vf-scroll">
                        {times.map(t => (
                          <button key={t.start} data-testid={`time-${t.label}`}
                                  className={`vf-tag${selTime === t.start ? ' active' : ''}`}
                                  onClick={() => { setErr(null); setSelTime(t.start); trace('slot_selected', t.label) }}
                                  style={{ textAlign: 'center', padding: '10px 8px', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      {selDate && times.length === 0 && <p style={{ color: 'var(--color-ink-4)', fontSize: 14 }}>Aucun créneau ce jour-là.</p>}
                    </div>
                  </div>
                  {selTime && (
                    <div className="vf-enter" style={{ marginTop: 20 }}>
                      <button className="vf-btn-primary" data-testid="submit" disabled={submitting} onClick={confirm} style={{ width: '100%', justifyContent: 'center' }}>
                        {submitting ? 'Réservation…' : `Confirmer — ${fmtWhen(selTime)}`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
        <p className="vf-mono" style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-ink-4)', letterSpacing: '.08em', marginTop: 18 }}>
          PROPULSÉ PAR VIVIDFLOW
        </p>
      </div>
    </Canvas>
  )
}

// ── Briques ──────────────────────────────────────────────────────────────────
function Canvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="vf-app" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '28px 16px' }}>
      {children}
    </div>
  )
}

function Card({ children, center, ...rest }: { children: React.ReactNode; center?: boolean } & Record<string, unknown>) {
  return (
    <div className="vf-card" {...rest} style={{ width: '100%', maxWidth: 480, padding: '40px 36px', textAlign: center ? 'center' : 'left' }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="vf-mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-ink-3)', marginBottom: 14 }}>{children}</div>
}

function StepDot({ n, state }: { n: number; state: 'off' | 'cur' | 'done' }) {
  const style: React.CSSProperties = {
    width: 20, height: 20, borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: 10, flexShrink: 0,
    border: '1px solid var(--color-line-strong)', transition: '.25s',
    ...(state === 'cur' ? { background: 'var(--color-ink)', borderColor: 'var(--color-ink)', color: 'var(--color-paper-2)' } : {}),
    ...(state === 'done' ? { background: 'var(--color-ok)', borderColor: 'var(--color-ok)', color: '#fff' } : {}),
  }
  return <span style={style}>{state === 'done' ? '✓' : n}</span>
}

function MetaRow({ icon, text, strong }: { icon: string; text: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: strong ? 'var(--color-brand-deep)' : 'var(--color-ink-2)', fontWeight: strong ? 600 : 400 }}>
      <span style={{ color: strong ? 'var(--color-brand)' : 'var(--color-ink-4)', width: 16, textAlign: 'center' }}>{icon}</span>
      <span style={{ textTransform: strong ? 'capitalize' : undefined }}>{text}</span>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', testid }: { label: string; value: string; onChange: (v: string) => void; type?: string; testid?: string }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-ink-2)', marginBottom: 6 }}>{label}</span>
      <input className="vf-input" data-testid={testid} type={type} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}
