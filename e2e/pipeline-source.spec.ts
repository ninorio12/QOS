import { test, expect } from '@playwright/test'

// La card du pipeline doit refléter la SOURCE RÉELLE du lead/contact (inbound/outbound),
// pas une valeur localStorage figée à "inbound". Les données seed ont des leads "outbound"
// → au moins un badge "outbound" doit apparaître. (Test rouge avant le fix, vert après.)
test('Pipeline : le badge source reflète la donnée réelle (outbound visible)', async ({ page }) => {
  await page.goto('/pipeline', { waitUntil: 'domcontentloaded' })
  // Attendre que le kanban charge ses cards.
  await expect.poll(() => page.getByText('Nouveau lead').count(), { timeout: 30_000 }).toBeGreaterThan(0)
  // Au moins une card "outbound" (les contacts seed sont majoritairement outbound).
  await expect.poll(() => page.getByText('outbound', { exact: true }).count(), { timeout: 15_000 }).toBeGreaterThan(0)
})
