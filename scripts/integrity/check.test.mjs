import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkReferential } from './check.mjs'

test('checkReferential : signale une valeur qui ne pointe vers aucune cible', () => {
  const rows = [
    { _id: 'p1', contactId: 'c1' },   // ok
    { _id: 'p2', contactId: 'cX' },   // orphelin
    { _id: 'p3', contactId: null },   // optionnel absent → ignoré
  ]
  const targetIds = new Set(['c1', 'c2'])
  const rule = { id: 'paiement.contactId→crm_contacts', kind: 'ref', table: 'paiements', field: 'contactId', target: 'crm_contacts' }
  const out = checkReferential(rows, targetIds, rule)
  assert.equal(out.length, 1)
  assert.equal(out[0].id, 'p2')
  assert.equal(out[0].kind, 'ref')
  assert.equal(out[0].rule, 'paiement.contactId→crm_contacts')
  assert.match(out[0].reason, /crm_contacts/)
})

test('checkReferential : required=true signale aussi les valeurs nulles', () => {
  const rows = [{ _id: 'x1', leadId: null }]
  const rule = { id: 'r', kind: 'ref', table: 't', field: 'leadId', target: 'crm_leads', required: true }
  const out = checkReferential(rows, new Set(), rule)
  assert.equal(out.length, 1)
  assert.match(out[0].reason, /manquant/)
})
