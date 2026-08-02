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

// Filet leads Facebook : le webhook Zernio fait le temps réel, ce rattrapage
// relit son cache et ingère ce qui aurait été manqué (idempotent par leadgenId).
crons.interval("zernio leads catchup", { minutes: 15 }, api.leadIngest.syncFromZernio, {})

// Taux de change vers CHF (frankfurter.app, BCE) : rafraîchis chaque jour pour la conversion argent.
crons.daily("fx rates sync", { hourUTC: 5, minuteUTC: 0 }, api.fx.syncRates, {})

// Rapport quotidien d'acquisition, écrit dans la Synthèse du module Meta Ads
// (7 h 30 heure suisse = 5 h 30 UTC) : chiffres de la veille, créas, à traiter.
crons.daily("rapport quotidien acquisition", { hourUTC: 5, minuteUTC: 30 }, internal.dailyReport.daily, {})

// Profils sociaux du parcours Profil (photo, nom, abonnés IG, identité LinkedIn) :
// l'écran lit le cache os_social_profiles, ce cron le garde frais.
crons.interval("social profiles refresh", { minutes: 30 }, internal.socialProfile.refresh, {})

export default crons
