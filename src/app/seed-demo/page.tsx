'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Données SOREN ───────────────────────────────────────────────────────────
const SOREN_COMPANY = {
  // localStorage (preview)
  entreprise: 'SOREN',
  adresse:    '215, avenue Clément Ader\n34173 Castelnau-Le-Lez',
  telephone:  '04 99 13 32 00',
  email:      'contact@soren.fr',
  capital:    '50 000 euros',
  siret:      '500 123 321 00012',
  tvaIntra:   'FR 25 500 123 321',
  assurance:  'AssureurPro — 15, rue des assurances 34000 Montpellier — N° 450123',
  prenom:     'Thomas',
  nom:        'Soren',
  logo:       '',
  secteur:    'BTP / Construction',
  fuseau:     'Europe/Paris (UTC+1)',
}

// company_settings Supabase (génération PDF serveur)
const SOREN_SETTINGS = {
  name:        'SOREN',
  tagline:     'Construction · Rénovation · Aménagement',
  address:     '215, avenue Clément Ader\n34173 Castelnau-Le-Lez',
  phone:       '04 99 13 32 00',
  email:       'contact@soren.fr',
  siret:       '500 123 321 00012',
  capital:     '50 000 euros',
  tva_intra:   'FR 25 500 123 321',
  assurance:   'AssureurPro — 15, rue des assurances 34000 Montpellier — N° 450123',
  brand_color: '#d28e46',
  logo_svg:    null,
}

// ─── Devis Jean Dupont ────────────────────────────────────────────────────────
const DEMO_DEVIS = {
  contact_name:     'Jean Dupont',
  contact_email:    'jean.dupont@email.fr',
  contact_phone:    '06 12 34 56 78',
  titre:            'Rénovation de maison',
  ville:            'Castelnau',
  date_validite:    '2026-05-18',
  adresse_chantier: '25, rue Jacques d\'Aragon\n34000 MONTPELLIER',
  adresse_client:   '21, chemin des Vignes\n34130 MAUGUIO',
  notes:            '4 mois à compter de la signature du devis',
  source:           'manuel',
  lignes: [
    {
      description: 'Porte fenêtre croisée standard ouvrante à la française 3 vantaux, ht 125 x 180 cm, PVC blanc ép.60 mm, vitrage isolant 4-16-4 faible émissivité. Ferrage paumelles, crémone à galets 3 points, poignées époxy. Fixations et pose sur fond de joint et joint d\'étanchéité.',
      quantite:     2,
      unite:        'U',
      prixUnitaire: 524.52,
      tvaRate:      10,
    },
    {
      description: 'Tableau d\'abonné monophasé 1 rangée 9 circuits avec disjoncteur magnétothermique pour F3 ou F4. Equipement : Coffret de base à 1 rangée de 13 modules : 2 x 10 A, 2 x 16 A, 2 x 20 A et en complément 1 x 10 A, 1 x 16 A, 1 x 32 A.',
      quantite:     1,
      unite:        'U',
      prixUnitaire: 511.73,
      tvaRate:      20,
    },
    {
      description: 'Mitigeur thermostatique sur gorge à disques céramique, chromé à inverseur bain-douche, compris montage et façon des joints.',
      quantite:     1,
      unite:        'U',
      prixUnitaire: 573.94,
      tvaRate:      20,
    },
    {
      description: 'ESCALIER A LA FRANÇAISE CHENE FABRICATION ARTISANALE 2 QUARTS TOURNANT. Fabrication et pose d\'escalier à la française à 2 quarts tournant en chêne, emmarchement 80 cm, composé de 15 marches ép. 36 mm, contremarches ép. 24 mm, crémaillère ép. 36 mm et limon ép. 48 mm, garde corps en rampant avec main courante, poteaux et balustres, compris toutes sujétions d\'accessoires de pose, ponçage et vernissage 2 couches.',
      quantite:     1,
      unite:        'U',
      prixUnitaire: 6279.65,
      tvaRate:      20,
    },
  ],
  montant_ht: 8414.84,
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Step = 'idle' | 'settings' | 'devis' | 'pdf' | 'done' | 'error'

export default function SeedDemoPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('idle')
  const [msg,  setMsg]  = useState('')
  const [devisId, setDevisId] = useState<string | null>(null)

  async function handleSeed() {
    setStep('settings')
    try {
      // 1. localStorage → preview
      localStorage.setItem('soren_compte', JSON.stringify(SOREN_COMPANY))

      // 2. Supabase company_settings → PDF serveur
      const sr = await fetch('/api/settings/company', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(SOREN_SETTINGS),
      })
      if (!sr.ok) throw new Error(`Paramètres : ${await sr.text()}`)

      // 3. Créer le devis
      setStep('devis')
      const dr = await fetch('/api/devis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(DEMO_DEVIS),
      })
      const dj = await dr.json()
      if (!dr.ok) throw new Error(dj.error ?? 'Erreur création devis')
      const id: string = dj.devis.id
      setDevisId(id)

      // 4. Générer le PDF
      setStep('pdf')
      const pr = await fetch(`/api/devis/${id}/pdf`, { method: 'POST' })
      const pj = await pr.json()
      if (!pr.ok) throw new Error(pj.error ?? 'Erreur génération PDF')

      setMsg(`Devis ${dj.devis.numero} créé — redirection…`)
      setStep('done')
      setTimeout(() => router.push(`/devis/${id}`), 1200)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erreur inconnue')
      setStep('error')
    }
  }

  const STEPS: { key: Step; label: string }[] = [
    { key: 'settings', label: 'Paramètres SOREN' },
    { key: 'devis',    label: 'Création devis Jean Dupont' },
    { key: 'pdf',      label: 'Génération PDF' },
    { key: 'done',     label: 'Terminé' },
  ]
  const stepIndex = STEPS.findIndex(s => s.key === step)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f0', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '40px 48px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 440, width: '100%' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🏠</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>Seed démo</h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 28, lineHeight: 1.5 }}>
          Injecte les paramètres <strong>SOREN</strong> (local + Supabase), crée le devis <strong>Jean Dupont</strong> avec les 4 lignes et génère le PDF.
        </p>

        {step === 'idle' && (
          <button
            onClick={handleSeed}
            style={{ background: '#111', color: 'white', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Lancer le seed
          </button>
        )}

        {step !== 'idle' && step !== 'error' && (
          <div style={{ textAlign: 'left', marginBottom: 16 }}>
            {STEPS.map((s, i) => {
              const done    = stepIndex > i || step === 'done'
              const active  = stepIndex === i && step !== 'done'
              const pending = stepIndex < i
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f0f0eb' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                    background: done ? '#16a34a' : active ? '#d28e46' : '#e5e7eb',
                    color: done || active ? 'white' : '#9ca3af',
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: done ? '#16a34a' : active ? '#111' : '#9ca3af', fontWeight: active ? 600 : 400 }}>
                    {s.label}
                    {active && <span style={{ color: '#d28e46' }}> …</span>}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {step === 'done' && (
          <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 12 }}>{msg}</p>
        )}
        {step === 'error' && (
          <p style={{ fontSize: 13, color: '#dc2626', marginTop: 12 }}>{msg}</p>
        )}
      </div>
    </div>
  )
}
