import { test } from 'node:test'
import assert from 'node:assert/strict'
import { REFERENTIAL, CONSISTENCY, ALL_TABLES } from './invariant-map.mjs'

test('la carte contient les règles seedées par l\'audit', () => {
  const refIds = REFERENTIAL.map(r => r.id)
  assert.ok(refIds.includes('pipeline_clients.ghl_contact_id→crm_contacts'), 'relique GHL surveillée')
  assert.ok(refIds.includes('crm_leads.contactId→crm_contacts'))
  // chaque règle a les champs requis
  for (const r of REFERENTIAL) {
    assert.ok(r.id && r.table && r.field && r.target, `règle ref incomplète: ${JSON.stringify(r)}`)
  }
})

test('chaque règle de cohérence expose ok() et describe()', () => {
  for (const r of CONSISTENCY) {
    assert.equal(typeof r.ok, 'function', `ok() manquant: ${r.id}`)
    assert.equal(typeof r.describe, 'function', `describe() manquant: ${r.id}`)
    assert.ok(r.via && r.table && r.parentTable, `règle consistency incomplète: ${r.id}`)
  }
})

test('ALL_TABLES couvre toutes les tables référencées par les règles', () => {
  for (const r of REFERENTIAL) {
    assert.ok(ALL_TABLES.includes(r.table), `table source manquante: ${r.table}`)
    assert.ok(ALL_TABLES.includes(r.target), `table cible manquante: ${r.target}`)
  }
  for (const r of CONSISTENCY) {
    assert.ok(ALL_TABLES.includes(r.table) && ALL_TABLES.includes(r.parentTable))
  }
})
