'use client'

import { useState } from 'react'
import { BarChart3, Inbox, Copy, Check, ExternalLink, ShieldCheck, Clock } from 'lucide-react'
import MetaLogo from './MetaLogo'

const WEBHOOK_URL = 'https://data-os.vividflow.co/api/webhooks/meta'

function Copyable({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="group inline-flex items-center gap-2 max-w-full bg-soren-elevated border border-soren-border rounded-lg px-3 py-1.5 text-[12px] font-mono text-soren-text hover:border-soren-accent/40 transition-colors"
    >
      <span className="truncate">{value}</span>
      {copied ? <Check size={13} className="text-emerald-600 flex-none" /> : <Copy size={13} className="text-soren-subtle group-hover:text-soren-accent flex-none" />}
    </button>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5">
      <div className="mt-0.5 w-[26px] h-[26px] flex-none rounded-full bg-soren-accent/12 text-soren-accent grid place-items-center text-[12px] font-bold">{n}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-soren-text">{title}</div>
        <div className="text-[12.5px] text-soren-muted leading-relaxed mt-1 space-y-1.5">{children}</div>
      </div>
    </div>
  )
}

function Perm({ children }: { children: React.ReactNode }) {
  return <span className="inline-block text-[11px] font-mono font-medium text-soren-accent bg-soren-accent/10 rounded px-1.5 py-0.5">{children}</span>
}

export default function MetaGuide() {
  return (
    <div className="max-w-[760px] mx-auto pb-6">
      {/* intro */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-soren-elevated grid place-items-center flex-none"><MetaLogo size={20} /></div>
        <div>
          <h2 className="text-[17px] font-bold tracking-tight text-soren-text">Brancher Meta Business</h2>
          <p className="text-[12px] text-soren-muted mt-0.5">Deux étapes : la performance (rapide) puis la réception des leads.</p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-[12px] text-soren-muted bg-soren-elevated/50 border border-soren-border rounded-xl px-4 py-3 mb-6">
        <Clock size={15} className="flex-none mt-0.5 text-soren-accent" />
        <span><b className="text-soren-text font-semibold">Performance = quelques minutes</b> (aucune validation Meta sur ton propre compte). La <b className="text-soren-text font-semibold">réception des leads</b> demande un peu plus de config (App + Webhook) ; rapide sur ta propre Page.</span>
      </div>

      {/* SECTION 1 — Performance */}
      <div className="bg-soren-card border border-soren-border rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-soren-accent" />
          <h3 className="text-[14px] font-bold text-soren-text">1 · Connecter le compte (performance)</h3>
          <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">~ 5 min</span>
        </div>
        <div className="space-y-4">
          <Step n={1} title="Ouvre Meta Business Settings">
            <p><a href="https://business.facebook.com/settings" target="_blank" rel="noreferrer" className="text-soren-accent inline-flex items-center gap-1 hover:underline">business.facebook.com/settings <ExternalLink size={11} /></a> (tu dois être admin du Business).</p>
          </Step>
          <Step n={2} title="Crée / ouvre un Utilisateur système">
            <p><b>Utilisateurs → Utilisateurs système</b> → « Ajouter » → rôle <b>Admin</b> (ou réutilise l'existant).</p>
          </Step>
          <Step n={3} title="Assigne ton compte publicitaire">
            <p>Sur le system user → <b>Ajouter des actifs → Comptes publicitaires</b> → sélectionne ton compte → active l'accès <b>Gérer / Voir les performances</b>.</p>
          </Step>
          <Step n={4} title="Génère le token longue durée">
            <p>Sur le system user → <b>Générer un nouveau token</b> → choisis ton App → coche <Perm>ads_read</Perm> <Perm>read_insights</Perm> (+ <Perm>leads_retrieval</Perm> pour les leads) → génère et <b>copie le token</b>.</p>
          </Step>
          <Step n={5} title="Récupère ton Ad Account ID">
            <p>Dans Ads Manager, en haut : format <span className="font-mono text-soren-text">act_XXXXXXXXXX</span>.</p>
          </Step>
          <Step n={6} title="Connecte dans le Data OS">
            <p>Onglet <b>Performance</b> → bouton <b>Connecter Meta Ads</b> → colle l'Account ID + le token → <b>Sync Meta</b>. Les 90 derniers jours remontent. ✅</p>
          </Step>
        </div>
      </div>

      {/* SECTION 2 — Leads */}
      <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Inbox size={16} className="text-soren-accent" />
          <h3 className="text-[14px] font-bold text-soren-text">2 · Recevoir les leads de formulaire</h3>
          <span className="ml-auto text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">config Webhook</span>
        </div>
        <div className="space-y-4">
          <Step n={1} title="Ton App Meta">
            <p><a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-soren-accent inline-flex items-center gap-1 hover:underline">developers.facebook.com/apps <ExternalLink size={11} /></a> → ouvre (ou crée) une App de type <b>Business</b>.</p>
          </Step>
          <Step n={2} title="Ajoute le produit Webhooks → Page">
            <p>Champ à abonner : <Perm>leadgen</Perm>. Renseigne :</p>
            <div className="flex flex-col gap-1.5 mt-1.5">
              <div><span className="text-[11px] text-soren-subtle">Callback URL</span><div className="mt-1"><Copyable value={WEBHOOK_URL} /></div></div>
              <p className="text-[11.5px]"><span className="text-[11px] text-soren-subtle">Verify Token</span> = la valeur que tu mettras dans <span className="font-mono text-soren-text">META_VERIFY_TOKEN</span> (au choix).</p>
            </div>
          </Step>
          <Step n={3} title="Abonne ta Page à l'App">
            <p>Webhooks → <b>Subscribe</b> ta Page à l'objet, puis abonne le champ <Perm>leadgen</Perm>. Permission <Perm>leads_retrieval</Perm> requise (App Review possible pour la prod multi-comptes).</p>
          </Step>
          <Step n={4} title="Variables d'environnement (Vercel)">
            <div className="flex flex-wrap gap-1.5 mt-1">
              <Perm>META_VERIFY_TOKEN</Perm><Perm>META_APP_SECRET</Perm><Perm>META_ACCESS_TOKEN</Perm>
            </div>
            <p className="mt-1.5"><span className="font-mono text-soren-text">META_APP_SECRET</span> = clé secrète de l'App (signature) · <span className="font-mono text-soren-text">META_ACCESS_TOKEN</span> = token de Page avec <Perm>leads_retrieval</Perm>.</p>
          </Step>
          <Step n={5} title="Teste">
            <p>Utilise le <b>Lead Ads Testing Tool</b> de Meta → le contact apparaît dans <b>Contacts</b> et un <b>lead inbound</b> dans la pipeline. La flèche de la card Leads liste ces contacts.</p>
          </Step>
        </div>
        <div className="flex items-start gap-2 text-[11.5px] text-soren-muted mt-4 pt-4 border-t border-soren-border">
          <ShieldCheck size={14} className="flex-none mt-0.5" />
          Sans <span className="font-mono">META_APP_SECRET</span>, le webhook n'est pas signé — définis-le pour bloquer les faux leads.
        </div>
      </div>
    </div>
  )
}
