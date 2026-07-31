/// <reference types="vite/client" />
// Deal meta (fiche + colonnes Contacts) : montant total, mensualités, prochaine
// échéance et prochain RDV sont DÉRIVÉS des sources de vérité (pipeline_clients,
// onboarding, os_sales_calls) — jamais dupliqués sur crm_contacts.
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

async function seedContact(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("crm_contacts", {
      firstName: "Rafaela", lastName: "Francisco", statut: "client",
      tags: [], createdAt: new Date().toISOString(),
    })
  })
}

test("dealMetaAll dérive montant, mensualités, échéance et prochain RDV", async () => {
  const t = convexTest(schema, modules)
  const contactId = await seedContact(t)
  const cid = contactId.toString()
  const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()

  await t.run(async (ctx) => {
    await ctx.db.insert("pipeline_clients", {
      contactId, name: "Rafaela Francisco", value: 6000, stageId: "consulting",
      initials: "RF", createdAt: new Date().toISOString(),
    })
    await ctx.db.insert("onboarding", {
      contactId: cid,
      payment: { installments: 6, amounts: [1000, 1000, 1000, 1000, 1000, 1000] },
      paidStatus: [true, false, false, false, false, false],
      dueDates: ["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01"],
      updatedAt: new Date().toISOString(),
    })
    await ctx.db.insert("os_sales_calls", {
      workspaceId: "vividflow", title: "Call de suivi", contactId: cid,
      date: future, status: "planned", stage: "R2",
      createdBy: "test", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    // RDV passé + RDV done : ne doivent PAS être retenus comme prochain RDV
    await ctx.db.insert("os_sales_calls", {
      workspaceId: "vividflow", title: "R1", contactId: cid,
      date: "2026-01-05T10:00:00.000Z", status: "done",
      createdBy: "test", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
  })

  const all = await t.query(api.crm_contacts.dealMetaAll, {})
  const meta = all[cid]
  expect(meta).toBeDefined()
  expect(meta.totalAmount).toBe(6000)
  expect(meta.installments).toBe(6)
  expect(meta.perInstallment).toBe(1000)
  // 1re échéance payée → la prochaine non payée est le 2e versement
  expect(meta.nextDueDate).toBe("2026-07-01")
  expect(meta.nextDueAmount).toBe(1000)
  expect(meta.nextCallDate).toBe(future)
  expect(meta.nextCallTitle).toBe("R2")

  // La version unitaire (fiche) renvoie la même chose
  const one = await t.query(api.crm_contacts.dealMeta, { contactId })
  expect(one).toEqual(meta)
})

test("dealMetaAll sans plan de paiement : montant seul, pas d'échéance", async () => {
  const t = convexTest(schema, modules)
  const contactId = await seedContact(t)
  await t.run(async (ctx) => {
    await ctx.db.insert("pipeline_clients", {
      contactId, name: "Rafaela Francisco", value: 3500, stageId: "nouveau-client",
      initials: "RF", createdAt: new Date().toISOString(),
    })
  })
  const all = await t.query(api.crm_contacts.dealMetaAll, {})
  expect(all[contactId.toString()]).toEqual({ totalAmount: 3500 })
})

test("les champs deal de la fiche (dates, durée, type de paiement) se sauvegardent via update", async () => {
  const t = convexTest(schema, modules)
  const contactId = await seedContact(t)
  await t.mutation(api.crm_contacts.update, {
    id: contactId,
    dealStartDate: "2026-07-01", dealEndDate: "2027-01-01",
    dealDurationMonths: 6, paymentType: "mensuel",
  })
  const doc = await t.query(api.crm_contacts.get, { id: contactId })
  expect(doc?.dealStartDate).toBe("2026-07-01")
  expect(doc?.dealEndDate).toBe("2027-01-01")
  expect(doc?.dealDurationMonths).toBe(6)
  expect(doc?.paymentType).toBe("mensuel")
})
