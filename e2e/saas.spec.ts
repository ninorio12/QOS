import { test, expect } from '@playwright/test'

// Smoke E2E du SaaS Data OS. Serveur démarré avec bypass auth local (voir e2e/run-e2e.sh).
// On vérifie : les pages clés rendent sans erreur applicative, la fiche client (réparée Vague 2)
// affiche un vrai contact Convex, les routes legacy supprimées (Vague 1) renvoient 404.

const KEPT_PAGES = ['/dashboard', '/contacts', '/pipeline', '/knowledge', '/modules', '/paiement', '/equipe']
const DELETED_ROUTES = ['/devis', '/conversations', '/chatbot', '/agent', '/architecture', '/communication', '/conversion', '/transcripts']

// Aucune page gardée ne doit afficher une erreur applicative Next/React.
async function expectNoAppError(page) {
  const body = await page.locator('body').innerText()
  expect(body, 'page ne doit pas contenir une erreur applicative').not.toMatch(/Application error|Unhandled Runtime|This page could not be found|cannot read propert/i)
}

test.describe('Pages gardées — rendu sans erreur', () => {
  for (const route of KEPT_PAGES) {
    test(`${route} rend la coquille + aucune erreur`, async ({ page }) => {
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(resp?.status(), `${route} doit répondre 200`).toBe(200)
      // La sidebar (coquille app) doit être présente.
      await expect(page.getByText('VividFlow').first()).toBeVisible()
      await expectNoAppError(page)
    })
  }
})

test('Fiche client : affiche un vrai contact Convex (fix Vague 2)', async ({ page }) => {
  const resp = await page.goto('/contacts/p57eqs986m61q601w3h6m242an889jtb', { waitUntil: 'domcontentloaded' })
  expect(resp?.status(), 'la fiche ne doit plus 404').toBe(200)
  // Le contact réel doit s'afficher (avant le fix : notFound() systématique).
  await expect(page.getByText('Jonathan Joao').first()).toBeVisible()
  await expect(page.getByText('jonathan@gmail.com').first()).toBeVisible()
  await expectNoAppError(page)
})

test('Contacts : la table liste de vrais contacts', async ({ page }) => {
  await page.goto('/contacts', { waitUntil: 'domcontentloaded' })
  // Au moins un contact réel rendu depuis Convex (présence DOM ; robuste aux duplicatas responsive).
  await expect.poll(() => page.getByText('Jonathan Joao').count(), { timeout: 30_000 }).toBeGreaterThan(0)
})

test('Pipeline : le kanban rend ses colonnes', async ({ page }) => {
  await page.goto('/pipeline', { waitUntil: 'domcontentloaded' })
  // Colonnes du kanban présentes (présence DOM ; le layout a des duplicatas desktop/mobile).
  await expect.poll(() => page.getByText('Nouveau lead').count(), { timeout: 30_000 }).toBeGreaterThan(0)
  await expect.poll(() => page.getByText('R1').count()).toBeGreaterThan(0)
})

test.describe('Routes legacy supprimées (Vague 1) → 404', () => {
  for (const route of DELETED_ROUTES) {
    test(`${route} doit renvoyer 404`, async ({ page }) => {
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(resp?.status(), `${route} doit être supprimée (404)`).toBe(404)
    })
  }
})
