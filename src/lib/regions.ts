// Référentiel régional partagé — cohérent CH (cantons) et FR (régions).
// Utilisé par la fiche contact (champ « Canton / Région ») et la vue Contacts.

export const SWISS_CANTONS = [
  'AG','AI','AR','BE','BL','BS','FR','GE','GL','GR',
  'JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG',
  'TI','UR','VD','VS','ZG','ZH',
] as const

export const CANTON_NAMES: Record<string, string> = {
  AG: 'Argovie', AI: 'Appenzell Rh.-Int.', AR: 'Appenzell Rh.-Ext.', BE: 'Berne',
  BL: 'Bâle-Campagne', BS: 'Bâle-Ville', FR: 'Fribourg', GE: 'Genève', GL: 'Glaris',
  GR: 'Grisons', JU: 'Jura', LU: 'Lucerne', NE: 'Neuchâtel', NW: 'Nidwald',
  OW: 'Obwald', SG: 'Saint-Gall', SH: 'Schaffhouse', SO: 'Soleure', SZ: 'Schwytz',
  TG: 'Thurgovie', TI: 'Tessin', UR: 'Uri', VD: 'Vaud', VS: 'Valais', ZG: 'Zoug', ZH: 'Zurich',
}

// Régions administratives françaises (métropole + outre-mer principales).
export const FRENCH_REGIONS = [
  'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire',
  'Corse', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie',
  'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
  'Guadeloupe', 'Martinique', 'Guyane', 'La Réunion', 'Mayotte',
] as const

// Liste de pays proposée dans la fiche (Suisse/France en tête car régions gérées).
export const COUNTRIES = [
  'Suisse', 'France', 'Belgique', 'Luxembourg', 'Monaco',
  'Allemagne', 'Italie', 'Espagne', 'Portugal', 'Royaume-Uni',
  'Pays-Bas', 'Autriche', 'Canada', 'États-Unis', 'Autre',
] as const

const norm = (s: string) => (s || '').toLowerCase().trim()
const isCH = (c: string) => ['suisse', 'switzerland', 'ch', 'schweiz', 'svizzera', 'svizra'].includes(norm(c))
const isFR = (c: string) => ['france', 'fr', 'français', 'francaise', 'française'].includes(norm(c))

export type RegionOption = { value: string; label: string }

/** Config du champ régional selon le pays : libellé + options (null = texte libre). */
export function regionConfig(country: string): { label: string; options: RegionOption[] | null } {
  if (isCH(country)) return { label: 'Canton', options: SWISS_CANTONS.map(code => ({ value: code, label: `${code} — ${CANTON_NAMES[code]}` })) }
  if (isFR(country)) return { label: 'Région', options: FRENCH_REGIONS.map(r => ({ value: r, label: r })) }
  return { label: 'Canton / Région', options: null }
}

/** Affichage lisible d'une valeur (déplie le code canton CH → nom). */
export function regionDisplay(country: string, value: string): string {
  if (!value) return ''
  if (isCH(country) && CANTON_NAMES[value]) return `${value} — ${CANTON_NAMES[value]}`
  return value
}
