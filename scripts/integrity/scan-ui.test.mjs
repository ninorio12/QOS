import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findDeadUi } from './scan-ui.mjs'

const knownRoutes = new Set(['/dashboard', '/contacts', '/pipeline'])

test('détecte href="#"', () => {
  const out = findDeadUi('a.tsx', '<a href="#">X</a>', knownRoutes)
  assert.ok(out.some(v => v.reason.includes('href="#"')))
})

test('détecte un onClick vide', () => {
  const out = findDeadUi('b.tsx', '<button onClick={() => {}}>X</button>', knownRoutes)
  assert.ok(out.some(v => v.reason.includes('handler vide')))
})

test('détecte une route inexistante dans router.push', () => {
  const out = findDeadUi('c.tsx', "router.push('/activites')", knownRoutes)
  assert.ok(out.some(v => v.reason.includes('route inexistante') && v.reason.includes('/activites')))
})

test('ne signale pas une route existante', () => {
  const out = findDeadUi('d.tsx', "router.push('/dashboard')", knownRoutes)
  assert.equal(out.filter(v => v.reason.includes('route inexistante')).length, 0)
})

test('signale une valeur affichée sourcée depuis localStorage', () => {
  const out = findDeadUi('e.tsx', "const source = localStorage.getItem('vividflow_contact_source') || 'inbound'", knownRoutes)
  assert.ok(out.some(v => v.reason.includes('localStorage')))
})
