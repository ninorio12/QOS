import { test, expect } from '@playwright/test'

// Test INTERACTIF du module Contacts : clique le bouton "Nouveau contact", remplit le
// formulaire, soumet, et vérifie que les variables saisies sont stockées de façon LOGIQUE
// (ce qu'on tape = ce qui est persisté dans Convex). Données préfixées AUDIT-TEST + nettoyage.

const TAG = 'AUDIT-TEST'
const EMAIL = 'audit-test-form@vividflow-audit.ch'

async function deleteTestContacts(page) {
  // Supprime tous les contacts AUDIT-TEST via l'API (cleanup idempotent).
  await page.goto('/contacts', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    const res = await fetch('/api/contact', { cache: 'no-store' })
    const j = await res.json()
    const list = j.contacts ?? j
    for (const c of list) {
      const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`
      if (name.includes('AUDIT-TEST') || (c.email ?? '').includes('vividflow-audit.ch')) {
        await fetch('/api/contact/' + (c.id ?? c._id), { method: 'DELETE' }).catch(() => {})
      }
    }
  })
}

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage()
  await deleteTestContacts(page)
  await page.close()
})

test('Nouveau contact : le formulaire crée un contact aux variables cohérentes', async ({ page }) => {
  await deleteTestContacts(page) // état propre

  await page.goto('/contacts', { waitUntil: 'domcontentloaded' })
  await page.getByText('Nouveau contact', { exact: false }).first().click()

  // Le formulaire doit s'ouvrir.
  await expect(page.getByPlaceholder('Jean', { exact: true })).toBeVisible({ timeout: 15_000 })

  // Remplir les champs (variables connues).
  await page.getByPlaceholder('Jean', { exact: true }).fill(`${TAG}`)
  await page.getByPlaceholder('Dupont', { exact: true }).fill('FormFlow')
  await page.getByPlaceholder('jean@exemple.fr').fill(EMAIL)
  // Numéro local UNIQUE (évite la dédup par téléphone) ; défaut pays = Suisse (+41).
  await page.getByPlaceholder('6 12 34 56 78').fill('788007799')
  await page.getByPlaceholder('Dupont Construction').fill('FormCo')

  // Soumettre (bouton "Créer le contact"/"Créer le lead"/"Créer le client").
  await page.getByRole('button', { name: /Créer (le )?(contact|lead|client)/i }).click()

  // Vérifier la COHÉRENCE : ce qu'on a tapé est exactement ce qui est persisté dans Convex.
  await expect.poll(async () => {
    return await page.evaluate(async () => {
      const res = await fetch('/api/contact', { cache: 'no-store' })
      const j = await res.json()
      const list = j.contacts ?? j
      const c = list.find((x) => x.firstName === 'AUDIT-TEST' && x.lastName === 'FormFlow')
      return c ? { firstName: c.firstName, lastName: c.lastName, email: c.email, company: c.companyName, phone: c.phone } : null
    })
  }, { timeout: 25_000 }).toEqual({
    firstName: TAG,
    lastName: 'FormFlow',
    email: EMAIL,
    company: 'FormCo',
    phone: '+41788007799', // défaut Suisse appliqué au numéro local unique
  })
})
