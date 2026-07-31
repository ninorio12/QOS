/**
 * Niche : un mot-clé, pas une phrase.
 *
 * Les niches saisies décrivent un métier en une ligne entière (« Fiduciaire /
 * fiscalité / conseil financier »), ce qui mange toute la largeur d'une carte de
 * prospection ou de pipeline. On les ramène au métier, en un ou deux mots.
 *
 * La donnée d'origine n'est PAS modifiée : la phrase complète reste dans la
 * fiche contact et sert d'infobulle. Seul l'affichage compact est raccourci.
 */

// Ordre important : la première correspondance gagne, donc le plus spécifique d'abord.
const RULES: { test: RegExp; keyword: string }[] = [
  // Hors cible d'abord : c'est l'information qui compte, pas le métier.
  { test: /hors cible/i, keyword: 'Hors cible' },
  // Métiers MIXTES : quand deux activités cibles cohabitent, ranger sous la
  // première serait faux. Une fiduciaire qui fait de la gérance immobilière ne
  // se pilote pas comme une fiduciaire : c'est l'activité qui distingue qui gagne.
  { test: /fiduciaire.*(immobil|gérance|gerance|régie|regie)/i, keyword: 'Immobilier' },
  { test: /notari/i, keyword: 'Notaire' },
  { test: /avocat|juridique|contentieux|arbitrage/i, keyword: 'Avocats' },
  { test: /fiduciaire|comptab|audit/i, keyword: 'Fiduciaire' },
  { test: /assurance|courtier/i, keyword: 'Assurance' },
  { test: /intérim|interim|staffing|placement|recrutement/i, keyword: 'Recrutement' },
  { test: /\bRH\b|ressources humaines|organisationnel/i, keyword: 'RH' },
  { test: /immobil|régie|regie|gérance|gerance|patrimoni/i, keyword: 'Immobilier' },
  { test: /M&A|transmission|cession/i, keyword: 'M&A' },
  { test: /fiscal|financ/i, keyword: 'Finance' },
  { test: /conseil|gestion d'entreprise/i, keyword: 'Conseil' },
  { test: /interne|test/i, keyword: 'Interne' },
]

/** Mot-clé d'affichage pour une niche. Renvoie la valeur telle quelle si elle est déjà courte. */
export function nicheKeyword(niche: string | null | undefined): string | null {
  if (!niche) return null
  const n = niche.trim()
  if (!n) return null
  for (const r of RULES) if (r.test.test(n)) return r.keyword
  // Pas de règle : on garde le premier segment, souvent le métier principal.
  const first = n.split(/[/,·|]/)[0].trim()
  return first.length <= 14 ? first : first.slice(0, 13) + '…'
}
