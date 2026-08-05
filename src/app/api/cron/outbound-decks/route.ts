import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { getOAuth2Client, getRefreshToken } from '@/lib/google'

/**
 * Synchronisation des decks outbound depuis la feuille de sourcing.
 *
 * La feuille est la source de vérité : c'est là qu'un lien de présentation est
 * noté quand le deck est déployé. Le Data OS ne l'apprenait que si le script de
 * déploiement l'avait prévenu, ce qui laissait la moitié des fiches sans lien.
 *
 * Lecture seule côté Google. Écriture côté Data OS limitée au champ du deck :
 * aucun lead n'est créé ni déplacé ici (voir attachDecksFromSheet).
 *
 * Deux façons de la déclencher : le cron quotidien de vercel.json, qui s'annonce
 * avec CRON_SECRET, ou un appel manuel portant le secret interne quand on vient
 * d'ajouter une fournée de decks et qu'on ne veut pas attendre demain.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Colonnes lues dans l'onglet des leads. On cible les EN-TÊTES, jamais des
// positions figées : une colonne insérée dans la feuille ne doit pas décaler
// silencieusement la lecture.
const COL_EMAIL = 'email pro'
const COL_PRENOM = 'prénom'
const COL_NOM = 'nom'
const COL_DECK = 'lien deck outbound'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export async function GET(req: NextRequest) { return handler(req) }
export async function POST(req: NextRequest) { return handler(req) }

async function handler(req: NextRequest) {
  // Cette route n'est pas derrière la session Clerk (un cron n'en a pas) : elle
  // se garde donc elle-même. Deux clés acceptées, aucune devinette.
  const secret = process.env.INTERNAL_API_SECRET
  const cronSecret = process.env.CRON_SECRET
  const porteur = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const fourni = req.headers.get('x-vf-secret') ?? new URL(req.url).searchParams.get('secret')
  const autorise = (!!cronSecret && porteur === cronSecret) || (!!secret && fourni === secret)
  if (!secret) return NextResponse.json({ ok: false, error: 'INTERNAL_API_SECRET manquant' }, { status: 500 })
  if (!autorise) return NextResponse.json({ ok: false, error: 'Non autorisé' }, { status: 401 })

  const sheetId = process.env.OUTBOUND_SHEET_ID
  if (!sheetId) return NextResponse.json({ ok: false, error: 'OUTBOUND_SHEET_ID manquant' }, { status: 500 })

  const token = await getRefreshToken()
  if (!token) return NextResponse.json({ ok: false, error: 'Aucun compte Google connecté' }, { status: 400 })

  const auth = getOAuth2Client()
  auth.setCredentials({ refresh_token: token })
  const sheets = google.sheets({ version: 'v4', auth })

  // Premier onglet de la feuille, en entier. Le titre de l'onglet n'est pas
  // codé en dur : il a déjà changé une fois, et une plage nommée en dur aurait
  // rendu la synchro muette sans rien signaler.
  let valeurs: string[][] = []
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
    const onglet = meta.data.sheets?.[0]?.properties?.title
    if (!onglet) return NextResponse.json({ ok: false, error: 'Feuille sans onglet' }, { status: 500 })
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: onglet })
    valeurs = (res.data.values ?? []) as string[][]
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'lecture impossible'
    // Le cas le plus probable : le jeton Google n'a pas encore le droit de lire
    // les feuilles. On le dit en clair plutôt que de renvoyer un échec opaque.
    return NextResponse.json({ ok: false, error: `Google Sheets : ${msg}`, indice: 'Reconnecter Google pour accorder la lecture des feuilles.' }, { status: 502 })
  }

  const iEntete = valeurs.findIndex(r => r.some(c => norm(c ?? '') === COL_DECK))
  if (iEntete < 0) return NextResponse.json({ ok: false, error: `Colonne « ${COL_DECK} » introuvable` }, { status: 422 })
  const entete = valeurs[iEntete].map(c => norm(c ?? ''))
  const col = (nom: string) => entete.indexOf(nom)
  const iEmail = col(COL_EMAIL), iPrenom = col(COL_PRENOM), iNom = col(COL_NOM), iDeck = col(COL_DECK)

  const lignes = valeurs.slice(iEntete + 1)
    .map(r => ({
      email: (r[iEmail] ?? '').trim(),
      firstName: (r[iPrenom] ?? '').trim(),
      lastName: (r[iNom] ?? '').trim(),
      deckUrl: (r[iDeck] ?? '').trim(),
    }))
    .filter(r => r.deckUrl.startsWith('http'))

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_CONVEX_URL manquant' }, { status: 500 })
  const convex = new ConvexHttpClient(convexUrl)
  const r = await convex.mutation(api.outboundLeads.attachDecksFromSheet, { secret, lignes })

  return NextResponse.json({ ok: true, lues: lignes.length, ...r })
}
