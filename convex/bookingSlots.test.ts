import { expect, test } from "vitest"
import { computeSlots, wallClockToUtcMs } from "../src/lib/booking"

// Lun-Ven 09:00→17:00, heure locale Europe/Zurich.
const weekday9to17 = [1, 2, 3, 4, 5].map(day => ({ day, start: 9 * 60, end: 17 * 60 }))

test("créneaux d'une journée : 09:00→17:00 en 30 min = 16 créneaux", () => {
  const from = Date.UTC(2026, 0, 5, 0, 0) // lundi 5 jan 2026 (hiver, CET = UTC+1)
  const to = Date.UTC(2026, 0, 5, 23, 59)
  const slots = computeSlots({
    availability: weekday9to17, durationMin: 30, timezone: "Europe/Zurich",
    fromMs: from, toMs: to, busyByHost: { alice: [] },
  })
  expect(slots.length).toBe(16)
  // 09:00 Zurich en hiver = 08:00 UTC
  expect(slots[0].start).toBe("2026-01-05T08:00:00.000Z")
  expect(slots[slots.length - 1].start).toBe("2026-01-05T15:30:00.000Z") // dernier départ (fin 16:00-16:30)
})

test("DST : en été (CEST = UTC+2), 09:00 Zurich = 07:00 UTC", () => {
  const from = Date.UTC(2026, 6, 6, 0, 0) // lundi 6 juillet 2026
  const to = Date.UTC(2026, 6, 6, 23, 59)
  const slots = computeSlots({
    availability: weekday9to17, durationMin: 30, timezone: "Europe/Zurich",
    fromMs: from, toMs: to, busyByHost: { alice: [] },
  })
  expect(slots[0].start).toBe("2026-07-06T07:00:00.000Z")
})

test("wallClockToUtcMs gère la bascule hiver/été", () => {
  expect(new Date(wallClockToUtcMs(2026, 0, 5, 9, 0, "Europe/Zurich")).toISOString()).toBe("2026-01-05T08:00:00.000Z")
  expect(new Date(wallClockToUtcMs(2026, 6, 6, 9, 0, "Europe/Zurich")).toISOString()).toBe("2026-07-06T07:00:00.000Z")
})

test("un créneau occupé (FreeBusy) est retiré", () => {
  const from = Date.UTC(2026, 0, 5, 0, 0)
  const to = Date.UTC(2026, 0, 5, 23, 59)
  const slots = computeSlots({
    availability: weekday9to17, durationMin: 30, timezone: "Europe/Zurich",
    fromMs: from, toMs: to,
    busyByHost: { alice: [{ start: "2026-01-05T08:00:00.000Z", end: "2026-01-05T08:30:00.000Z" }] },
  })
  // Le créneau 08:00Z (09:00 Zurich) doit disparaître pour alice → aucun host libre → non offert.
  expect(slots.find(s => s.start === "2026-01-05T08:00:00.000Z")).toBeUndefined()
  expect(slots.length).toBe(15)
})

test("union multi-hosts : un créneau est offert si ≥1 host libre + freeHosts correct", () => {
  const from = Date.UTC(2026, 0, 5, 0, 0)
  const to = Date.UTC(2026, 0, 5, 23, 59)
  const slots = computeSlots({
    availability: weekday9to17, durationMin: 30, timezone: "Europe/Zurich",
    fromMs: from, toMs: to,
    busyByHost: {
      alice: [{ start: "2026-01-05T08:00:00.000Z", end: "2026-01-05T08:30:00.000Z" }],
      bob: [],
    },
  })
  const first = slots.find(s => s.start === "2026-01-05T08:00:00.000Z")
  expect(first).toBeDefined()                       // offert car bob est libre
  expect(first!.freeHosts).toEqual(["bob"])         // alice occupée → seul bob
  expect(slots.length).toBe(16)
})

test("le buffer élargit l'occupation", () => {
  const from = Date.UTC(2026, 0, 5, 0, 0)
  const to = Date.UTC(2026, 0, 5, 23, 59)
  const slots = computeSlots({
    availability: weekday9to17, durationMin: 30, bufferMin: 15, timezone: "Europe/Zurich",
    fromMs: from, toMs: to,
    busyByHost: { alice: [{ start: "2026-01-05T09:00:00.000Z", end: "2026-01-05T09:30:00.000Z" }] },
  })
  // Occupé 09:00-09:30Z + buffer 15 → bloque aussi 08:30 (fin 09:00, chevauche 08:45-09:45) et 09:30.
  expect(slots.find(s => s.start === "2026-01-05T08:30:00.000Z")).toBeUndefined()
  expect(slots.find(s => s.start === "2026-01-05T09:00:00.000Z")).toBeUndefined()
  expect(slots.find(s => s.start === "2026-01-05T09:30:00.000Z")).toBeUndefined()
})
