import { test, expect } from '@playwright/test'

// Vérifie que les fiches agents (AgentSheet) s'ouvrent depuis le module Équipe IA.
// La fiche est une modale à onglets (Soul / Personnalité / Heartbeats…).
// next dev hydrate après le rendu : on re-clique via toPass jusqu'à ce que le
// handler soit attaché (sinon faux négatif d'hydratation, pas un bug applicatif).

test('Équipe IA : la fiche agent s’ouvre depuis une carte', async ({ page }) => {
  await page.goto('/equipe', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('COO', { exact: true }).first()).toBeVisible({ timeout: 30_000 })

  await expect(async () => {
    await page.getByText('COO', { exact: true }).first().click()
    await expect(page.getByText('Heartbeats').first()).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 30_000 })

  // Onglets de la fiche présents → la fiche est bien ouverte et fonctionnelle.
  await expect(page.getByText('Personnalité').first()).toBeVisible()
  await expect(page.getByText('Règles d’action').first()).toBeVisible()
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/Application error|Unhandled Runtime|cannot read propert/i)
})

test('Équipe IA : la fiche s’ouvre depuis l’organigramme', async ({ page }) => {
  await page.goto('/equipe', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Organisation agentique').first()).toBeVisible({ timeout: 30_000 })

  // Nœud coordinateur (bouton dont le nom contient le rôle Coordination).
  const node = page.getByRole('button', { name: /Coordination opérationnelle/ }).first()
  await expect(async () => {
    await node.click()
    await expect(page.getByText('Heartbeats').first()).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 30_000 })
})
