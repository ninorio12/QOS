import { describe, it, expect } from "vitest"
import { convexTest } from "convex-test"
import schema from "./schema"
import { api } from "./_generated/api"

const now = () => new Date().toISOString()
const today = () => new Date().toISOString().split("T")[0]

// Seede un contact 'lead' + un lead OUVERT lié + un record prospection lié.
// Renvoie l'id du contact (typé) pour appeler convertToClient.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedLeadContact(t: any, opts: { firstName: string; email: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await t.run(async (ctx: any) => {
    const contactId = await ctx.db.insert("crm_contacts", {
      firstName: opts.firstName,
      lastName: "Test",
      email: opts.email,
      source: "inbound",
      statut: "lead",
      tags: [],
      createdAt: now(),
      updatedAt: now(),
    })
    const leadId = await ctx.db.insert("crm_leads", {
      contactId,
      name: `${opts.firstName} Test`,
      email: opts.email,
      pipelineId: "leads",
      stageId: "nouveau-lead",
      value: 0,
      source: "inbound",
      status: "open",
      initials: opts.firstName.slice(0, 2).toUpperCase(),
      createdAt: now(),
    })
    await ctx.db.insert("lead_stage_history", {
      leadId,
      stageId: "nouveau-lead",
      stageName: "Nouveau lead",
      enteredAt: today(),
    })
    await ctx.db.insert("prospection_records", {
      workspaceId: "vividflow",
      contactId: contactId.toString(),
      leadId: leadId.toString(),
      phase: "phase1",
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    })
    return contactId
  })
}

// Helpers de lecture d'état après mutation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientsFor = (t: any, contactId: any) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t.run((ctx: any) =>
    ctx.db
      .query("pipeline_clients")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_contact", (q: any) => q.eq("contactId", contactId))
      .collect(),
  )

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const openLeadsFor = (t: any, contactId: any) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t.run((ctx: any) =>
    ctx.db
      .query("crm_leads")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_contact", (q: any) => q.eq("contactId", contactId))
      .collect(),
  )

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onboardingFor = (t: any, cid: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t.run((ctx: any) =>
    ctx.db
      .query("onboarding")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_contact", (q: any) => q.eq("contactId", cid))
      .collect(),
  )

// Toutes les entrées d'historique 'nouveau-client' liées à un contact (via ses leads, vivants ou supprimés).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function nouveauClientHistory(t: any, contactId: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await t.run(async (ctx: any) => {
    const all = await ctx.db
      .query("lead_stage_history")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_stage", (q: any) => q.eq("stageId", "nouveau-client"))
      .collect()
    // Le lead a pu être supprimé par enforce ; on lit l'id de lead qui était lié à ce contact
    // au moment de l'écriture. Comme on n'a qu'un contact par test, toutes les entrées
    // 'nouveau-client' présentes appartiennent à ce parcours.
    return all
  })
}

describe("convertToClient : parcours de passage en client", () => {
  it("1. GARDE 0 CHF : sans montant ni amountTbd → rejette (Montant requis)", async () => {
    const t = convexTest(schema)
    const contactId = await seedLeadContact(t, { firstName: "Alice", email: "alice@ex.com" })
    await expect(
      t.mutation(api.sync.convertToClient, { contactId }),
    ).rejects.toThrow(/Montant requis/)
    // Et rien n'a basculé : pas de client, le lead ouvert est intact.
    expect((await clientsFor(t, contactId)).length).toBe(0)
    expect((await openLeadsFor(t, contactId)).length).toBe(1)
  })

  it("2. AVEC MONTANT : crée le client à la bonne valeur, supprime le lead, historise, onboarding", async () => {
    const t = convexTest(schema)
    const contactId = await seedLeadContact(t, { firstName: "Bob", email: "bob@ex.com" })
    const cid = contactId.toString()

    await t.mutation(api.sync.convertToClient, { contactId, dealValue: 3500 })

    // Contact passé en client.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = await t.run((ctx: any) => ctx.db.get(contactId)) as any
    expect(contact.statut).toBe("client")

    // Une ligne pipeline_clients avec value 3500 (PAS 0).
    const clients = await clientsFor(t, contactId)
    expect(clients.length).toBe(1)
    expect(clients[0].value).toBe(3500)

    // Le lead ouvert n'existe plus (supprimé par enforce).
    expect((await openLeadsFor(t, contactId)).length).toBe(0)

    // Historique 'nouveau-client' présent.
    const hist = await nouveauClientHistory(t, contactId)
    expect(hist.length).toBe(1)
    expect(hist[0].stageId).toBe("nouveau-client")

    // Doc onboarding présent pour ce contact.
    expect((await onboardingFor(t, cid)).length).toBe(1)
  })

  it("3. MONTANT À DÉFINIR : amountTbd sans dealValue → autorisé ; amountTbd=true, value=0", async () => {
    const t = convexTest(schema)
    const contactId = await seedLeadContact(t, { firstName: "Carol", email: "carol@ex.com" })

    await t.mutation(api.sync.convertToClient, { contactId, amountTbd: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = await t.run((ctx: any) => ctx.db.get(contactId)) as any
    expect(contact.statut).toBe("client")
    expect(contact.amountTbd).toBe(true)

    const clients = await clientsFor(t, contactId)
    expect(clients.length).toBe(1)
    expect(clients[0].value).toBe(0)
  })

  it("4. IDEMPOTENCE : re-convertir un client → met à jour value, pas de doublon onboarding ni historique", async () => {
    const t = convexTest(schema)
    const contactId = await seedLeadContact(t, { firstName: "Dave", email: "dave@ex.com" })
    const cid = contactId.toString()

    // 1re conversion à 3500.
    await t.mutation(api.sync.convertToClient, { contactId, dealValue: 3500 })
    // 2e conversion à 4200 (déjà client) → ne doit pas throw.
    await expect(
      t.mutation(api.sync.convertToClient, { contactId, dealValue: 4200 }),
    ).resolves.toBeTruthy()

    // value mise à jour à 4200.
    const clients = await clientsFor(t, contactId)
    expect(clients.length).toBe(1)
    expect(clients[0].value).toBe(4200)

    // Un SEUL doc onboarding.
    expect((await onboardingFor(t, cid)).length).toBe(1)

    // Pas de doublon d'historique 'nouveau-client' : exactement 1.
    expect((await nouveauClientHistory(t, contactId)).length).toBe(1)
  })

  it("5. INTAKE NE CRÉE PLUS DE CLIENT : intakeSubmit (email neuf) → contact 'lead', aucun pipeline_clients", async () => {
    const t = convexTest(schema)
    const email = "newlead@ex.com"

    const res = await t.mutation(api.onboarding.intakeSubmit, {
      email,
      submission: { profil: { objectif: "scaler" } },
      profile: { firstName: "Eve", companyName: "Eve SARL" },
    })
    expect(res.ok).toBe(true)
    expect(res.created).toBe(true)

    // Le contact créé a statut 'lead' (PAS 'client').
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = await t.run((ctx: any) =>
      ctx.db
        .query("crm_contacts")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first(),
    ) as any
    expect(contact).not.toBeNull()
    expect(contact.statut).toBe("lead")

    const cid = contact._id.toString()

    // AUCUNE ligne pipeline_clients pour ce contact (ni par contactId typé ni par ghl_contact_id).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientRows = await t.run((ctx: any) => ctx.db.query("pipeline_clients").collect()) as any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mine = clientRows.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.ghl_contact_id === cid || (r.contactId && r.contactId.toString() === cid),
    )
    expect(mine.length).toBe(0)

    // Un doc onboarding peut exister (et doit, ici).
    expect((await onboardingFor(t, cid)).length).toBe(1)
  })
})
