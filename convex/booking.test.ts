/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, beforeAll } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")
const SECRET = "test-secret-booking"
beforeAll(() => { process.env.INTERNAL_API_SECRET = SECRET })

async function seedLink(t: ReturnType<typeof convexTest>, hosts: string[]) {
  return await t.run(async (ctx) => {
    for (const h of hosts) {
      await ctx.db.insert("users", { name: `Closer ${h}`, email: `${h}@vf.co`, role: "closer", clerkUserId: h, createdAt: Date.now() } as never)
      await ctx.db.insert("google_accounts", { clerkUserId: h, refreshToken: `tok-${h}`, connectedAt: Date.now() })
    }
    return await ctx.db.insert("booking_links", {
      slug: "audit", title: "Audit IA", durationMin: 30, timezone: "Europe/Zurich",
      stage: "R1", hosts, availability: [{ day: 1, start: 540, end: 1020 }],
      active: true, rrCursor: 0, createdBy: "admin", createdAt: new Date().toISOString(),
    })
  })
}

test("round-robin : les RDV alternent entre les closers libres", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a", "b"])

  const r1 = await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Jean", email: "jean@x.com", startIso: "2026-01-05T08:00:00.000Z",
    freeHosts: ["a", "b"], secret: SECRET,
  })
  const r2 = await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Marie", email: "marie@x.com", startIso: "2026-01-05T08:30:00.000Z",
    freeHosts: ["a", "b"], secret: SECRET,
  })
  const r3 = await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Paul", email: "paul@x.com", startIso: "2026-01-05T09:00:00.000Z",
    freeHosts: ["a", "b"], secret: SECRET,
  })
  expect(r1.closerUserId).toBe("a")
  expect(r2.closerUserId).toBe("b")
  expect(r3.closerUserId).toBe("a")
})

test("une réservation crée contact (inbound) + lead + RDV planifié assigné", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a"])
  const res = await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Alice", lastName: "Martin", email: "Alice@Corp.com", phone: "+41 79 000 00 00",
    startIso: "2026-01-05T08:00:00.000Z", freeHosts: ["a"],
    answers: [{ q: "Budget ?", a: "5k" }], secret: SECRET,
  })

  await t.run(async (ctx) => {
    const contact = await ctx.db.get(res.contactId as never) as any
    expect(contact.source).toBe("inbound")
    expect(contact.statut).toBe("lead")
    expect(contact.email).toBe("alice@corp.com") // normalisé lowercase

    const call = await ctx.db.query("os_sales_calls").withIndex("by_closer", q => q.eq("closerUserId", "a")).first() as any
    expect(call.status).toBe("planned")
    expect(call.stage).toBe("R1")
    expect(call.date).toBe("2026-01-05T08:00:00.000Z")
    expect(call.closerUserId).toBe("a")
    expect(call.createdBy).toBe("booking")
    expect(call.quizJson).toContain("Budget")

    const lead = await ctx.db.query("crm_leads").withIndex("by_contact", q => q.eq("contactId", res.contactId as never)).first() as any
    expect(lead).not.toBeNull()
    expect(lead.stageId).toBe("r1") // advanceForCall a fait progresser le lead
  })
})

test("idempotence : même closer + même créneau = pas de doublon", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a"])
  const a1 = await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Bob", email: "bob@x.com", startIso: "2026-01-05T08:00:00.000Z", freeHosts: ["a"], secret: SECRET,
  })
  const a2 = await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Bob", email: "bob@x.com", startIso: "2026-01-05T08:00:00.000Z", freeHosts: ["a"], secret: SECRET,
  })
  expect(a2.already).toBe(true)
  expect(a2.salesCallId).toBe(a1.salesCallId)
  const count = await t.run(async (ctx) => (await ctx.db.query("os_sales_calls").collect()).length)
  expect(count).toBe(1)
})

test("dédup contact : deux RDV avec le même email = un seul contact", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a", "b"])
  await t.mutation(api.booking.createBooking, { slug: "audit", firstName: "Zoe", email: "zoe@x.com", startIso: "2026-01-05T08:00:00.000Z", freeHosts: ["a", "b"], secret: SECRET })
  await t.mutation(api.booking.createBooking, { slug: "audit", firstName: "Zoe", email: "zoe@x.com", startIso: "2026-01-05T08:30:00.000Z", freeHosts: ["a", "b"], secret: SECRET })
  const contacts = await t.run(async (ctx) => (await ctx.db.query("crm_contacts").collect()).filter((c: any) => c.email === "zoe@x.com"))
  expect(contacts.length).toBe(1)
})

test("conflit : même créneau, email différent, closer unique → erreur (pas de faux 'already')", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a"])
  await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Bob", email: "bob@x.com", startIso: "2026-01-05T08:00:00.000Z", freeHosts: ["a"], secret: SECRET,
  })
  await expect(t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Eve", email: "eve@x.com", startIso: "2026-01-05T08:00:00.000Z", freeHosts: ["a"], secret: SECRET,
  })).rejects.toThrow(/créneau/)
})

test("conflit : même créneau, 2 hosts → les 2 prospects sont servis par des closers différents", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a", "b"])
  const r1 = await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Bob", email: "bob@x.com", startIso: "2026-01-05T08:00:00.000Z", freeHosts: ["a", "b"], secret: SECRET,
  })
  const r2 = await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Eve", email: "eve@x.com", startIso: "2026-01-05T08:00:00.000Z", freeHosts: ["a", "b"], secret: SECRET,
  })
  expect(r1.already).toBe(false)
  expect(r2.already).toBe(false)
  expect(r2.closerUserId).not.toBe(r1.closerUserId)
})

test("plannedBusy : le RDV natif bloque [start, start+durée] (pas un intervalle vide)", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a"])
  await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Bob", email: "bob@x.com", startIso: "2026-01-05T08:00:00.000Z", freeHosts: ["a"], secret: SECRET,
  })
  const busy = await t.query(api.booking.plannedBusy, {
    hosts: ["a"], fromIso: "2026-01-05T00:00:00.000Z", toIso: "2026-01-06T00:00:00.000Z", secret: SECRET,
  })
  expect(busy).toEqual([{ closerUserId: "a", start: "2026-01-05T08:00:00.000Z", end: "2026-01-05T08:30:00.000Z" }])
})

test("annulation par token : status cancelled + infos exposées par getByManageToken", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a"])
  const token = "tok-".padEnd(32, "x")
  await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Bob", email: "bob@x.com", startIso: "2026-01-05T08:00:00.000Z",
    freeHosts: ["a"], manageToken: token, secret: SECRET,
  })
  const info = await t.query(api.booking.getByManageToken, { token })
  expect(info?.status).toBe("planned")
  expect(info?.durationMin).toBe(30)
  expect(info?.slug).toBe("audit")

  const res = await t.mutation(api.booking.cancelByToken, { token })
  expect(res.ok).toBe(true)
  expect((await t.query(api.booking.getByManageToken, { token }))?.status).toBe("cancelled")
  // Le créneau se libère : plus d'occupation planifiée.
  const busy = await t.query(api.booking.plannedBusy, {
    hosts: ["a"], fromIso: "2026-01-05T00:00:00.000Z", toIso: "2026-01-06T00:00:00.000Z", secret: SECRET,
  })
  expect(busy).toEqual([])
  // Une deuxième annulation est refusée proprement.
  expect((await t.mutation(api.booking.cancelByToken, { token })).ok).toBe(false)
})

test("round-robin PONDÉRÉ : poids 2/1 → J,J,T,J,J,T", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (const h of ["a", "b"]) {
      await ctx.db.insert("users", { name: `Closer ${h}`, email: `${h}@vf.co`, role: "closer", clerkUserId: h, createdAt: Date.now() } as never)
      await ctx.db.insert("google_accounts", { clerkUserId: h, refreshToken: `tok-${h}`, connectedAt: Date.now() })
    }
    await ctx.db.insert("booking_links", {
      slug: "pond", title: "Pondéré", durationMin: 30, timezone: "Europe/Zurich",
      stage: "R1", hosts: ["a", "b"], weights: { a: 2, b: 1 },
      availability: [{ day: 1, start: 540, end: 1020 }],
      active: true, rrCursor: 0, createdBy: "admin", createdAt: new Date().toISOString(),
    })
  })
  const picks: string[] = []
  for (let i = 0; i < 6; i++) {
    const r = await t.mutation(api.booking.createBooking, {
      slug: "pond", firstName: `P${i}`, email: `p${i}@x.com`,
      startIso: `2026-01-05T${String(8 + i).padStart(2, "0")}:00:00.000Z`,
      freeHosts: ["a", "b"], secret: SECRET,
    })
    picks.push(r.closerUserId as string)
  }
  expect(picks).toEqual(["a", "a", "b", "a", "a", "b"])
})

test("capture : fiche AVANT calendrier → contact+lead+trace ; booking la passe en booked", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a"])
  const cap = await t.mutation(api.booking.capture, {
    slug: "audit", firstName: "Lea", email: "lea@x.com", phone: "+41790000000",
    answers: [{ q: "CA ?", a: "20k" }],
    funnel: "quiz-croissance", utmSource: "meta", utmMedium: "retargeting",
    secret: SECRET,
  })
  await t.run(async (ctx) => {
    const c = await ctx.db.get(cap.captureId) as any
    expect(c.status).toBe("captured")
    expect(c.funnel).toBe("quiz-croissance")
    expect(c.timeline.length).toBe(2) // fiche + réponses
    const contact = await ctx.db.get(cap.contactId as never) as any
    expect(contact.source).toBe("inbound")
    const lead = await ctx.db.query("crm_leads").withIndex("by_contact", q => q.eq("contactId", cap.contactId as never)).first()
    expect(lead).not.toBeNull()
  })
  // événement de parcours
  await t.mutation(api.booking.captureEvent, { captureId: cap.captureId, event: "calendar_viewed", secret: SECRET })
  // réservation → capture booked + closer + salesCall reliés
  const bk = await t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "Lea", email: "lea@x.com", startIso: "2026-01-05T08:00:00.000Z",
    freeHosts: ["a"], captureId: cap.captureId, secret: SECRET,
  })
  await t.run(async (ctx) => {
    const c = await ctx.db.get(cap.captureId) as any
    expect(c.status).toBe("booked")
    expect(c.closerUserId).toBe("a")
    expect(String(c.salesCallId)).toBe(String(bk.salesCallId))
    expect(c.timeline[c.timeline.length - 1].e).toContain("confirmé")
  })
})

test("capture : abandon = la trace reste en 'captured' (à rappeler)", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a"])
  await t.mutation(api.booking.capture, {
    slug: "audit", firstName: "Ghost", email: "ghost@x.com", secret: SECRET,
  })
  const count = await t.run(async (ctx) =>
    (await ctx.db.query("booking_captures").collect()).filter((c: any) => c.status === "captured").length)
  expect(count).toBe(1)
})

test("secret invalide = refus", async () => {
  const t = convexTest(schema, modules)
  await seedLink(t, ["a"])
  await expect(t.mutation(api.booking.createBooking, {
    slug: "audit", firstName: "X", email: "x@x.com", startIso: "2026-01-05T08:00:00.000Z", freeHosts: ["a"], secret: "WRONG",
  })).rejects.toThrow()
})
