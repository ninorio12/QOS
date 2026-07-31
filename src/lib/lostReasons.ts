import {
  PhoneOff, ThumbsDown, PhoneMissed, UserX, UserMinus, CalendarX, CircleSlash, CircleHelp,
  Wallet, Truck, Users, ShieldQuestion, Cloud, CircleCheck, type LucideIcon,
} from 'lucide-react'

// ─── Prospection : raisons de perte (board → colonne "Perdu") ───
// Source unique partagée : board Prospection, carte (chip rouge), fiche Contact.
export type LostReasonCode = 'faux_numero' | 'pas_interesse' | 'jamais_repondu'

export const LOST_REASONS: { code: LostReasonCode; label: string; icon: LucideIcon }[] = [
  { code: 'faux_numero',    label: 'Faux numéro',        icon: PhoneOff },
  { code: 'pas_interesse',  label: 'Pas intéressé',      icon: ThumbsDown },
  { code: 'jamais_repondu', label: "N'a jamais répondu", icon: PhoneMissed },
]

// ─── Pipeline R1/R2 : raisons de NON-VENTE ───
export const NONVENTE_REASONS: { code: string; label: string; desc: string; icon: LucideIcon }[] = [
  { code: 'non_qualifie',     label: 'Non qualifié',              desc: 'Le contact était faible',             icon: UserX },
  { code: 'non_presentation', label: 'No-show',                    desc: "Ne s'est pas présenté à l'appel",     icon: UserMinus },
  { code: 'annulation_admin', label: 'Annulation administrative', desc: "L'appel a été annulé de votre côté",  icon: CalendarX },
  { code: 'contact_annule',   label: 'Contact annulé',            desc: "Le contact a annulé l'appel",         icon: PhoneOff },
]

// ─── Objections (uniquement après "Non qualifié") ───
export const NONVENTE_OBJECTIONS: { code: string; label: string; desc: string; icon: LucideIcon }[] = [
  { code: 'argent',        label: 'Argent',          desc: "Je n'ai pas d'argent",                 icon: Wallet },
  { code: 'logistique',    label: 'La logistique',   desc: 'Il faut trouver une solution',         icon: Truck },
  { code: 'partenaire',    label: 'Partenaire',      desc: 'Je dois parler à mon partenaire',      icon: Users },
  { code: 'peur',          label: 'Peur',            desc: 'Je ne sais pas si vous pouvez aider',  icon: ShieldQuestion },
  { code: 'ecran_fumee',   label: 'Écran de fumée',  desc: 'Objection de surface ou faux prétexte', icon: Cloud },
  { code: 'pas_objection', label: "Pas d'objection", desc: 'Aucune objection restante',            icon: CircleCheck },
]

// Codes historiques (quickAction / MCP).
const LEGACY: Record<string, { label: string; icon: LucideIcon }> = {
  reponse_negative:      { label: 'Réponse négative', icon: ThumbsDown },
  pas_de_reponse_phase3: { label: 'Pas de réponse',   icon: PhoneMissed },
  mauvais_numero:        { label: 'Faux numéro',      icon: PhoneOff },
  hors_cible:            { label: 'Hors cible',       icon: CircleSlash },
  autre:                 { label: 'Autre',            icon: CircleHelp },
}

const ALL_REASONS = [...LOST_REASONS, ...NONVENTE_REASONS]

export function lostReasonLabel(code?: string | null): string | null {
  if (!code) return null
  return ALL_REASONS.find(r => r.code === code)?.label ?? LEGACY[code]?.label ?? code
}
export function lostReasonIcon(code?: string | null): LucideIcon {
  if (!code) return CircleHelp
  return ALL_REASONS.find(r => r.code === code)?.icon ?? LEGACY[code]?.icon ?? CircleHelp
}
export function lostObjectionLabel(code?: string | null): string | null {
  if (!code) return null
  return NONVENTE_OBJECTIONS.find(o => o.code === code)?.label ?? code
}
export function lostObjectionIcon(code?: string | null): LucideIcon {
  return NONVENTE_OBJECTIONS.find(o => o.code === code)?.icon ?? CircleHelp
}

// Colonne exacte au moment de la perte. Fallback : pas d'étape mais une raison → prospection.
const LOST_STAGE_LABELS: Record<string, string> = {
  leads_a_traiter: 'Leads à traiter', nrp1: 'NRP 1', nrp2: 'NRP 2', nrp3: 'NRP 3', nrp4: 'NRP 4',
  rdv_booke: 'RDV booké', 'nouveau-lead': 'Nouveau lead', conversation: 'En conversation',
  r1: 'R1', r2: 'R2', prospection: 'Prospection',
}
export function lostStageLabel(stage?: string | null, reason?: string | null): string | null {
  if (stage && LOST_STAGE_LABELS[stage]) return LOST_STAGE_LABELS[stage]
  if (!stage && reason) return 'Prospection'
  return stage ? stage : null
}
