'use client'

import { useEffect, useState } from 'react'
import {
  ONBOARDING_STEPS, TOTAL_STEPS, SECURITY_NOTE,
  type Field, type Step,
} from '@/lib/onboarding-schema'

type Values = Record<string, unknown>

const STORAGE_KEY = 'vividflow-onboarding.values'
const STEP_KEY = 'vividflow-onboarding.step'

const COUNTRY_CODES = [
  '🇨🇭 Suisse +41', '🇫🇷 France +33', '🇧🇪 Belgique +32', '🇱🇺 Luxembourg +352',
  '🇱🇮 Liechtenstein +423', '🇬🇧 Royaume-Uni +44', '🇮🇪 Irlande +353', '🇮🇹 Italie +39',
  '🇪🇸 Espagne +34', '🇵🇹 Portugal +351', '🇳🇱 Pays-Bas +31', '🇨🇦 Canada +1', '🇺🇸 États-Unis +1',
]

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

// Regroupe les valeurs plates par section (= id de step) pour onboarding.form.
export function buildSubmission(values: Values) {
  const out: Record<string, Record<string, unknown>> = {}
  for (const step of ONBOARDING_STEPS) {
    if (!step.groups.length) continue
    const section: Record<string, unknown> = {}
    for (const g of step.groups) for (const f of g.fields) {
      if (values[f.key] !== undefined && values[f.key] !== '') section[f.key] = values[f.key]
      if (f.kind === 'account') {
        const a = values[f.key + '_access']
        if (a !== undefined && a !== '') section[f.key + '_access'] = a
      }
    }
    if (Object.keys(section).length) out[step.id] = section
  }
  return out
}

export default function OnboardingPublicForm() {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Values>({})
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // hydrate from localStorage (le mockup persistait l'avancement localement)
  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v) setValues(JSON.parse(v))
      const s = localStorage.getItem(STEP_KEY)
      if (s) setStep(Math.min(parseInt(s, 10) || 0, TOTAL_STEPS - 1))
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  useEffect(() => { if (hydrated) try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)) } catch { /* ignore */ } }, [values, hydrated])
  useEffect(() => { if (hydrated) try { localStorage.setItem(STEP_KEY, String(step)) } catch { /* ignore */ } }, [step, hydrated])

  const set = (key: string, val: unknown) => setValues(prev => ({ ...prev, [key]: val }))
  const toggleArr = (key: string, opt: string) => setValues(prev => {
    const arr = Array.isArray(prev[key]) ? [...(prev[key] as string[])] : []
    const i = arr.indexOf(opt)
    if (i >= 0) arr.splice(i, 1); else arr.push(opt)
    return { ...prev, [key]: arr }
  })

  const cur = ONBOARDING_STEPS[step]
  const pct = Math.round(((step + 1) / TOTAL_STEPS) * 100)
  const isLast = step === TOTAL_STEPS - 1

  function next() {
    setError(null)
    if (isLast) return submit()
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
  }
  function back() { setError(null); setStep(s => Math.max(s - 1, 0)) }

  async function submit() {
    if (submitting) return
    const email = String(values.email ?? '')
    if (!isValidEmail(email)) {
      setError("Entrez un email valide à l'étape « Votre entreprise » pour qu'on rattache votre onboarding.")
      // renvoie à l'étape entreprise (où se trouve l'email)
      const emailStep = ONBOARDING_STEPS.findIndex(s => s.id === 'company')
      if (emailStep >= 0) setStep(emailStep)
      return
    }
    setError(null); setSubmitting(true)
    try {
      // Unique trigger : enregistre la soumission → intakeSubmit (stamp formReceivedAt) → carte en "Onboarding complété".
      const phone = values.phone ? `${(values.phoneCountry as string) ?? ''} ${values.phone}`.trim() : undefined
      const res = await fetch('/api/onboarding/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          submission: buildSubmission(values),
          profile: {
            firstName:   values.firstName as string | undefined,
            lastName:    values.lastName as string | undefined,
            companyName: values.companyName as string | undefined,
            phone,
            website:     values.website as string | undefined,
          },
        }),
      })
      const data = await res.json().catch(() => ({ ok: false }))
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'submit_failed')
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STEP_KEY) } catch { /* ignore */ }
      setDone(true)
    } catch {
      setError("L'envoi a échoué. Vérifiez votre connexion et réessayez.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return <Completed />

  return (
    <div className="vf-app">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* progress */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: '.08em', color: 'var(--color-ink-3)', marginBottom: 8, textTransform: 'uppercase' }}>
            <span>Étape {step + 1} sur {TOTAL_STEPS}</span>
            <span>{pct}% · Progression</span>
          </div>
          <div className="vf-progress-track"><div className="vf-progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="vf-enter" key={cur.id}>
          {cur.eyebrow && <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: 'var(--color-brand)', marginBottom: 8 }}>{cur.eyebrow}</p>}
          <h1 className="vf-title" style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: '-.01em', marginBottom: cur.intro ? 10 : 20 }}>{cur.title}</h1>
          {cur.intro && <p style={{ fontSize: 14, color: 'var(--color-ink-3)', lineHeight: 1.6, marginBottom: 24, maxWidth: 560 }}>{cur.intro}</p>}

          {cur.variant === 'intro' && <IntroStep />}
          {cur.variant === 'schedule' && <ScheduleStep />}

          {cur.groups.map((g, gi) => (
            <div key={gi} style={{ marginBottom: 24 }}>
              {g.title && <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', color: 'var(--color-ink-3)', margin: '4px 0 12px' }}>{g.title}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {g.fields.map(f => (
                  <FieldRenderer key={f.key} field={f} values={values} set={set} toggleArr={toggleArr} />
                ))}
              </div>
            </div>
          ))}

          {error && <p style={{ color: 'var(--color-block)', fontSize: 13, marginBottom: 16 }}>{error}</p>}

          {/* nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
            {step > 0
              ? <button className="vf-btn-ghost" onClick={back}>← Retour</button>
              : <span />}
            <button className="vf-btn-primary" onClick={next} disabled={submitting} style={submitting ? { opacity: 0.6, cursor: 'default' } : undefined}>
              {submitting ? 'Envoi…' : isLast ? 'Terminer' : 'Sauvegarder et continuer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldRenderer({ field, values, set, toggleArr }: {
  field: Field; values: Values; set: (k: string, v: unknown) => void; toggleArr: (k: string, o: string) => void
}) {
  const f = field
  const sval = (values[f.key] ?? '') as string
  const aval = Array.isArray(values[f.key]) ? (values[f.key] as string[]) : []
  const labelEl = f.label && (
    <label style={{ display: 'block', fontSize: 13, color: 'var(--color-ink-2)', marginBottom: 7 }}>
      {f.label}{f.optional && <span style={{ color: 'var(--color-ink-4)' }}> (optionnel)</span>}
    </label>
  )

  if (f.kind === 'text' || f.kind === 'email') return (
    <div>{labelEl}<input className="vf-input" type={f.kind === 'email' ? 'email' : 'text'} value={sval} placeholder={f.placeholder} onChange={e => set(f.key, e.target.value)} /></div>
  )
  if (f.kind === 'textarea') return (
    <div>{labelEl}<textarea className="vf-textarea" value={sval} placeholder={f.placeholder} onChange={e => set(f.key, e.target.value)} /></div>
  )
  if (f.kind === 'select') return (
    <div>{labelEl}
      <select className="vf-select" value={sval} onChange={e => set(f.key, e.target.value)}>
        <option value="">Sélectionner…</option>
        {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
  if (f.kind === 'phone') return (
    <div>{labelEl}
      <div style={{ display: 'flex', gap: 8 }}>
        <select className="vf-select" style={{ width: 160, flexShrink: 0 }} value={(values.phoneCountry ?? COUNTRY_CODES[0]) as string} onChange={e => set('phoneCountry', e.target.value)}>
          {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="vf-input" type="tel" value={sval} onChange={e => set(f.key, e.target.value)} />
      </div>
    </div>
  )
  if (f.kind === 'tags') return (
    <div>{labelEl}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {f.options?.map(o => (
          <button key={o} className={`vf-tag${aval.includes(o) ? ' active' : ''}`} onClick={() => toggleArr(f.key, o)}>{o}</button>
        ))}
      </div>
    </div>
  )
  if (f.kind === 'checklist') return (
    <div>{labelEl}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {f.options?.map(o => (
          <button key={o} className={`vf-choice${aval.includes(o) ? ' active' : ''}`} onClick={() => toggleArr(f.key, o)} style={{ fontSize: 14 }}>{o}</button>
        ))}
      </div>
    </div>
  )
  if (f.kind === 'account') {
    const access = (values[f.key + '_access'] ?? '') as string
    return (
      <div className="vf-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>{f.label}</p>
          <span style={{ fontSize: 12, fontWeight: 500, color: sval ? 'var(--color-brand)' : 'var(--color-ink-4)' }}>{sval || 'Manquant'}</span>
        </div>
        {f.desc && <p style={{ fontSize: 13, color: 'var(--color-ink-3)', lineHeight: 1.55, margin: '6px 0 12px' }}>{f.desc}</p>}

        {/* lien de souscription à prendre + espace vidéo de présentation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {f.signupUrl && <a className="vf-link" href={f.signupUrl} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start' }}>↗ {f.signupLabel ?? 'Prendre la souscription'}</a>}
          <div className="vf-video">
            {f.videoUrl
              ? <iframe src={f.videoUrl} allowFullScreen title={`Vidéo ${f.label}`} />
              : <span>▶ Vidéo de présentation — à venir</span>}
          </div>
        </div>

        {/* statut */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {f.statuses?.map(s => (
            <button key={s} className={`vf-tag${sval === s ? ' active' : ''}`} onClick={() => set(f.key, sval === s ? '' : s)}>{s}</button>
          ))}
        </div>

        {/* champ libre pour récupérer l'accès */}
        <textarea
          className="vf-textarea" style={{ minHeight: 64 }} value={access}
          placeholder={f.accessPlaceholder ?? "Collez ici l'accès / l'invitation / une note…"}
          onChange={e => set(f.key + '_access', e.target.value)}
        />
      </div>
    )
  }
  return null
}

function IntroStep() {
  const items = ['Contexte entreprise', 'Process actuels', 'Modules à cadrer', 'Cadre sécurité & RGPD']
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {items.map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--color-ink-2)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--color-brand)', flexShrink: 0 }} />{i}
          </div>
        ))}
      </div>
      <div className="vf-card" style={{ fontSize: 13, color: 'var(--color-ink-3)', lineHeight: 1.6 }}>{SECURITY_NOTE}</div>
    </div>
  )
}

function ScheduleStep() {
  return (
    <div className="vf-card" style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 15, fontWeight: 600 }}>Appel de kick-off avec Thomas · 30 min</p>
      <p style={{ fontSize: 13, color: 'var(--color-ink-3)', marginTop: 6 }}>
        Visio. Le créneau est confirmé immédiatement après la réservation.
      </p>
      <p style={{ fontSize: 12, color: 'var(--color-ink-4)', marginTop: 12 }}>
        (Intégration calendrier à brancher — lot suivant.)
      </p>
    </div>
  )
}

function Completed() {
  return (
    <div className="vf-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      <div className="vf-enter" style={{ maxWidth: 460 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--color-brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 26 }}>✓</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>Onboarding terminé</h1>
        <p style={{ fontSize: 14, color: 'var(--color-ink-3)', lineHeight: 1.6 }}>
          Votre préparation est enregistrée. Thomas la parcourt avant le kick-off.
        </p>
      </div>
    </div>
  )
}
