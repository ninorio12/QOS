#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────────
// Émet un token Data OS par agent (machine-to-machine).
//   1. seed des permissions (agentPermissions:seedAgentPermissions)
//   2. pour chaque agent : génère un token opaque, stocke SON HASH (sha256),
//      les scopes = permission rows de l'agent.
// Le token brut n'est affiché qu'UNE fois ici (jamais stocké en clair).
//
// Prérequis : CONVEX_DEPLOY_KEY dans l'env (cf. mémoire qos-convex-deploy).
//   env -u VERCEL -u VERCEL_ENV -u VERCEL_URL -u CI \
//     CONVEX_DEPLOY_KEY='dev:standing-malamute-439|…' \
//     node scripts/issue-agent-tokens.mjs
//
// Rotation : relancer ce script après `agentPermissions:revokeAgentCredentials`.
// ───────────────────────────────────────────────────────────────────────────
import { createHash, randomBytes } from "node:crypto"
import { execFileSync } from "node:child_process"

const SLUGS = ["coo", "agent-kb", "agent-support-client", "agent-operations", "agent-analyse"]
// Décision produit (2026-06-13) : tokens PERMANENTS, aucune expiration.

if (!process.env.CONVEX_DEPLOY_KEY) {
  console.error("✖ CONVEX_DEPLOY_KEY manquant dans l'env. Voir l'entête du script.")
  process.exit(1)
}

const convexRun = (fn, args) =>
  execFileSync("npx", ["convex", "run", fn, JSON.stringify(args)], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })

console.error("→ seed des permissions des 5 agents…")
console.error(convexRun("agentPermissions:seedAgentPermissions", {}).trim())

const issued = []
for (const slug of SLUGS) {
  const token = `dos_${slug.replace(/-/g, "_")}_${randomBytes(24).toString("hex")}`
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const res = convexRun("agentPermissions:issueCredential", { slug, tokenHash, label: `hermes:${slug}` }) // sans expiresAt → permanent
  const scopeCount = (res.match(/scopeCount[":\s]+(\d+)/) ?? [])[1] ?? "?"
  issued.push({ slug, token, scopeCount })
  console.error(`  ✓ ${slug} — ${scopeCount} scopes, permanent`)
}

// Tokens en clair — à copier dans le coffre / l'env Hermes par profil. Affichés une seule fois.
console.log("\n──────── TOKENS (copier maintenant, non récupérables) ────────")
for (const { slug, token } of issued) console.log(`${slug.padEnd(24)} ${token}`)
console.log("──────────────────────────────────────────────────────────────")
console.error("\nInjecter chaque token dans le profil Hermes correspondant (EnvironmentFile / header Authorization).")
