'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ExternalLink, Building2, Check } from 'lucide-react'

type Tab = 'compte' | 'integrations' | 'paiement'

const LS_KEY = 'soren_compte'

// ─── Compte tab ──────────────────────────────────────────────
function CompteTab() {
  const stored = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return {} } })()
    : {}

  const [prenom,    setPrenom]    = useState<string>(stored.prenom    ?? '')
  const [nom,       setNom]       = useState<string>(stored.nom       ?? '')
  const [email,     setEmail]     = useState<string>(stored.email     ?? '')
  const [telephone, setTelephone] = useState<string>(stored.telephone ?? '')
  const [entreprise,setEntreprise]= useState<string>(stored.entreprise ?? '')
  const [secteur,   setSecteur]   = useState<string>(stored.secteur   ?? 'BTP / Construction')
  const [fuseau,    setFuseau]    = useState<string>(stored.fuseau    ?? 'Europe/Paris (UTC+1)')
  const _parseAdresse = (raw: string) => {
    const lines = raw.split('\n')
    const rue = lines[0] ?? ''
    const line2 = lines[1] ?? ''
    const spaceIdx = line2.search(/\s/)
    return {
      rue,
      cp:   spaceIdx > 0 ? line2.slice(0, spaceIdx) : line2,
      city: spaceIdx > 0 ? line2.slice(spaceIdx + 1) : '',
    }
  }
  const _p = _parseAdresse(stored.adresse ?? '')
  const [adresseRue,  setAdresseRue]  = useState<string>(_p.rue)
  const [adresseCP,   setAdresseCP]   = useState<string>(_p.cp)
  const [adresseCity, setAdresseCity] = useState<string>(_p.city)
  const [logo,      setLogo]      = useState<string>(stored.logo      ?? '')
  const [capital,   setCapital]   = useState<string>(stored.capital   ?? '')
  const [siret,     setSiret]     = useState<string>(stored.siret     ?? '')
  const [tvaIntra,  setTvaIntra]  = useState<string>(stored.tvaIntra  ?? '')
  const [assurance, setAssurance] = useState<string>(stored.assurance ?? '')
  const [saved,     setSaved]     = useState(false)

  async function handleSave() {
    const adresse = [adresseRue, [adresseCP, adresseCity].filter(Boolean).join(' ')].filter(Boolean).join('\n')
    // Cache local (retour immédiat si offline)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        prenom, nom, email, telephone, entreprise, adresse, secteur, fuseau, logo,
        capital, siret, tvaIntra, assurance,
      }))
    } catch {}
    // Persistance serveur — champs qui correspondent à company_settings
    try {
      await fetch('/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       entreprise || undefined,
          address:    adresse    || undefined,
          phone:      telephone  || undefined,
          email:      email      || undefined,
          siret:      siret      || undefined,
          capital:    capital    || undefined,
          tva_intra:  tvaIntra   || undefined,
          assurance:  assurance  || undefined,
        }),
      })
      window.dispatchEvent(new Event('company-settings-updated'))
    } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom"    value={prenom}    onChange={setPrenom}    placeholder="Thomas" />
        <Field label="Nom"       value={nom}       onChange={setNom}       placeholder="Dupont" />
      </div>
      <Field label="Email"     value={email}     onChange={setEmail}     placeholder="thomas@qorpoia.com" type="email" />
      <Field label="Téléphone" value={telephone} onChange={setTelephone} placeholder="+33 6 00 00 00 00"  type="tel" />
      <Field label="Entreprise" value={entreprise} onChange={setEntreprise} placeholder="Qorpo" />

      <div className="border-t border-soren-border pt-5">
        <p className="text-xs font-bold text-soren-subtle uppercase tracking-wider mb-4">Coordonnées</p>
        <div className="space-y-4">
          <Field label="Rue" value={adresseRue} onChange={setAdresseRue} placeholder="215, avenue Clément Ader" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code postal" value={adresseCP}   onChange={setAdresseCP}   placeholder="34173" />
            <Field label="Ville"       value={adresseCity} onChange={setAdresseCity} placeholder="Castelnau-Le-Lez" />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-soren-muted mb-1.5">Secteur</label>
        <select
          value={secteur}
          onChange={e => setSecteur(e.target.value)}
          className="w-full bg-soren-card border border-soren-border text-soren-text text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#3462EE] transition-colors appearance-none"
        >
          <option>BTP / Construction</option>
          <option>Immobilier</option>
          <option>Services B2B</option>
          <option>Retail</option>
          <option>Autre</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-soren-muted mb-1.5">Fuseau horaire</label>
        <select
          value={fuseau}
          onChange={e => setFuseau(e.target.value)}
          className="w-full bg-soren-card border border-soren-border text-soren-text text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#3462EE] transition-colors appearance-none"
        >
          <option>Europe/Paris (UTC+1)</option>
          <option>Europe/London (UTC+0)</option>
          <option>America/New_York (UTC-5)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-soren-muted mb-1.5">Logo entreprise</label>
        <div className="flex items-center gap-3">
          <label className="w-16 h-16 rounded-xl bg-soren-card border border-soren-border flex items-center justify-center cursor-pointer hover:border-[#3462EE] transition-colors overflow-hidden flex-shrink-0">
            {logo
              ? <img src={logo} alt="logo" style={{ width: 64, height: 64, objectFit: 'contain', display: 'block' }} />
              : <Building2 size={20} className="text-soren-muted" />
            }
            <input
              type="file"
              accept="image/*,image/svg+xml"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = ev => setLogo(ev.target?.result as string)
                reader.readAsDataURL(file)
              }}
            />
          </label>
          <div>
            <label className="text-xs font-medium text-[#3462EE] hover:text-[#5a7ff4] transition-colors border border-[#3462EE]/30 px-3 py-1.5 rounded-lg cursor-pointer">
              Changer le logo
              <input
                type="file"
                accept="image/*,image/svg+xml"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => setLogo(ev.target?.result as string)
                  reader.readAsDataURL(file)
                }}
              />
            </label>
            {logo && (
              <button
                onClick={() => setLogo('')}
                className="block mt-1.5 text-[11px] text-[#EF4444] hover:text-[#dc2626] transition-colors"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-soren-border pt-5 mt-1">
        <p className="text-xs font-bold text-soren-subtle uppercase tracking-wider mb-4">Mentions légales (pied de devis)</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Capital social" value={capital} onChange={setCapital} placeholder="50 000 euros" />
            <Field label="SIRET"          value={siret}   onChange={setSiret}   placeholder="500 123 321 00012" />
          </div>
          <Field label="TVA intracommunautaire" value={tvaIntra}  onChange={setTvaIntra}  placeholder="FR 25 500 123 321" />
          <Field label="Assurance décennale"    value={assurance} onChange={setAssurance} placeholder="AssureurPro — 15, rue des assurances 34000 Montpellier — N° 450123" />
        </div>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all ${
            saved
              ? 'bg-[#22c55e] text-white'
              : 'bg-[#3462EE] hover:bg-[#2a50d4] text-white'
          }`}
        >
          {saved ? <><Check size={14} /> Sauvegardé</> : 'Enregistrer'}
        </button>
        {saved && <p className="text-xs text-[#22c55e]">Modifications enregistrées</p>}
      </div>
    </div>
  )
}

function Field({
  label, placeholder, type = 'text', value, onChange,
}: {
  label: string; placeholder: string; type?: string
  value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-soren-muted mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-soren-card border border-soren-border text-soren-text text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#3462EE] placeholder-[#9CA3AF] transition-colors"
      />
    </div>
  )
}

// ─── Integration row ──────────────────────────────────────────
type IntegrationStatus = 'connected' | 'disconnected' | 'pending'

function IntegrationRow({
  name, description, status, badge,
}: {
  name: string
  description: string
  status: IntegrationStatus
  badge?: string
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-soren-border last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          status === 'connected' ? 'bg-[#22c55e]' :
          status === 'pending'   ? 'bg-[#EFE347]' :
          'bg-[#3D4F6B]'
        }`} />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-soren-text">{name}</p>
            {badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#6B7280]/12 text-soren-muted">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-soren-subtle mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status === 'connected' ? (
          <CheckCircle size={14} className="text-[#22c55e]" />
        ) : (
          <XCircle size={14} className="text-soren-subtle" />
        )}
        <button className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          status === 'connected'
            ? 'border-soren-border text-soren-muted hover:text-soren-text hover:border-[#3D4F6B]'
            : 'border-[#3462EE]/40 text-[#3462EE] hover:bg-[#3462EE]/10'
        }`}>
          {status === 'connected' ? 'Configurer' : 'Connecter'}
        </button>
      </div>
    </div>
  )
}

function IntegrationsTab() {
  return (
    <div className="max-w-xl">
      <div className="bg-soren-card border border-soren-border rounded-2xl divide-y divide-[#E5E7EB]">
        <div className="px-4 py-3">
          <p className="text-xs font-bold text-soren-subtle uppercase tracking-wider">CRM & Communication</p>
        </div>
        <div className="px-4">
          <IntegrationRow
            name="CRM" description="CRM principal · Location VZxWSmcMt2Hdtae8RuPs"
            status="connected" badge="ACTIF"
          />
          <IntegrationRow
            name="Twilio" description="SMS & appels sortants"
            status="disconnected"
          />
          <IntegrationRow
            name="Meta Ads" description="Facebook & Instagram Ads"
            status="disconnected"
          />
        </div>
      </div>

      <div className="bg-soren-card border border-soren-border rounded-2xl divide-y divide-[#E5E7EB] mt-4">
        <div className="px-4 py-3">
          <p className="text-xs font-bold text-soren-subtle uppercase tracking-wider">IA & Automatisation</p>
        </div>
        <div className="px-4">
          <IntegrationRow
            name="OpenClaw Gateway" description="Runtime agent · ws://localhost:18789 · Sessions Soren / Kai / Mia"
            status="pending" badge="SPRINT 1"
          />
          <IntegrationRow
            name="Vapi" description="Voice AI · Appels entrants automatisés"
            status="pending" badge="BIENTÔT"
          />
          <IntegrationRow
            name="Google Calendar" description="Synchronisation rendez-vous"
            status="disconnected"
          />
          <IntegrationRow
            name="N8N Webhook" description="Automatisations externes"
            status="disconnected"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Paiement tab ─────────────────────────────────────────────
const PLANS = [
  {
    name: 'Free',      price: '€0',  period: '/mois', current: false,
    features: ['1 pipeline', '50 contacts', 'IA basique'],
  },
  {
    name: 'Starter',   price: '€49', period: '/mois', current: false,
    features: ['3 pipelines', '500 contacts', '1 agent IA'],
  },
  {
    name: 'Pro',       price: '€149', period: '/mois', current: true,
    features: ['Pipelines illimités', 'Contacts illimités', '3 agents IA', 'Analytics avancés'],
  },
  {
    name: 'Agency',    price: '€399', period: '/mois', current: false,
    features: ['Multi-comptes', 'White-label', 'SLA 99.9%', 'Support dédié'],
  },
]

const BILLING = [
  { date: '01 mars 2026',    amount: '€149.00', status: 'Payé' },
  { date: '01 fév. 2026',    amount: '€149.00', status: 'Payé' },
  { date: '01 jan. 2026',    amount: '€149.00', status: 'Payé' },
]

function PaiementTab() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Plans */}
      <div className="grid grid-cols-2 gap-3">
        {PLANS.map(plan => (
          <div key={plan.name} className={`rounded-2xl p-4 border ${
            plan.current
              ? 'border-[#111111] bg-soren-sidebar/4'
              : 'border-soren-border bg-soren-card'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-soren-text">{plan.name}</p>
              {plan.current && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-soren-sidebar text-white">
                  ACTUEL
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-soren-text">
              {plan.price}
              <span className="text-xs font-normal text-soren-subtle">{plan.period}</span>
            </p>
            <ul className="mt-3 space-y-1">
              {plan.features.map(f => (
                <li key={f} className="text-[11px] text-soren-muted flex items-center gap-1.5">
                  <span className="text-soren-text font-bold">·</span> {f}
                </li>
              ))}
            </ul>
            {!plan.current && (
              <button className="mt-3 w-full text-xs font-semibold py-2 rounded-xl border border-[#3462EE]/30 text-[#3462EE] hover:bg-[#3462EE]/10 transition-colors">
                {plan.name === 'Free' ? 'Rétrograder' : 'Mettre à jour'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Billing history */}
      <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-soren-border">
          <p className="text-xs font-bold text-soren-subtle uppercase tracking-wider">Historique de facturation</p>
        </div>
        {BILLING.map(b => (
          <div key={b.date} className="flex items-center justify-between px-4 py-3 border-b border-soren-border last:border-0">
            <span className="text-sm text-soren-text">{b.date}</span>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-soren-text">{b.amount}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e]">{b.status}</span>
              <button className="text-soren-subtle hover:text-soren-text transition-colors">
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: 'compte',       label: 'Compte' },
  { id: 'integrations', label: 'Intégrations' },
  { id: 'paiement',     label: 'Paiement' },
]

export default function ParametresView() {
  const [activeTab, setActiveTab] = useState<Tab>('compte')

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-soren-text leading-none">Paramètres</h1>
        <p className="text-xs text-soren-muted mt-0.5">Configuration de votre espace Soren</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-soren-border pb-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-[#111111] text-soren-text font-semibold'
                : 'border-transparent text-soren-muted hover:text-soren-text hover:border-[#D1D5DB]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'compte'       && <CompteTab />}
      {activeTab === 'integrations' && <IntegrationsTab />}
      {activeTab === 'paiement'     && <PaiementTab />}
    </div>
  )
}
