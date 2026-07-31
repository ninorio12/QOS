import { cronJobs } from "convex/server"
import { api, internal } from "./_generated/api"

const crons = cronJobs()

// Synchronisation horaire des insights Meta Ads (no-op si aucun compte connecté).
crons.interval("meta insights sync", { hours: 1 }, api.zernioAds.syncDaily, { days: 30 })

// Synchronisation horaire des créas Meta (visuels + KPI) → alimente le board live
// de décision (media_buyer_board) et la galerie de créas. No-op si non connecté.
crons.interval("meta creatives sync", { hours: 1 }, api.metaAds.syncCreatives, { datePreset: "last_14d" })

// Snapshot quotidien du Score Santé Business (cockpit Prospection) → Évolution 7j/30j.
crons.daily("prospection health snapshot", { hourUTC: 2, minuteUTC: 0 }, internal.prospectionCockpit.snapshotHealth, {})

// Sync iClosed (filet de sécurité, le webhook /iclosed/webhook fait le temps réel) :
// kickoffs → onboarding, R1 (event Audit) → os_sales_calls, annulations → RDV retiré.
crons.interval("iclosed sync", { minutes: 5 }, api.iclosed.syncRecent, {})

// Taux de change vers CHF (frankfurter.app, BCE) : rafraîchis chaque jour pour la conversion argent.
crons.daily("fx rates sync", { hourUTC: 5, minuteUTC: 0 }, api.fx.syncRates, {})

export default crons
