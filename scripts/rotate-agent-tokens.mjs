#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────────
// Rotation PROPRE des tokens Data OS (un par agent) — sans jamais afficher les
// tokens. Pour chaque agent : révoque les credentials actives, (re)seed les
// permissions, émet un token frais, et l'écrit dans un EnvironmentFile 0600
// par profil Hermes :  ~/.hermes/dataos/<profil>.env  →  DATAOS_TOKEN=dos_…
//
// Prérequis : CONVEX_DEPLOY_KEY dans l'env (cf. mémoire qos-convex-deploy).
//   env -u VERCEL -u VERCEL_ENV -u VERCEL_URL -u CI \
//     CONVEX_DEPLOY_KEY='dev:standing-malamute-439|…' \
//     node scripts/rotate-agent-tokens.mjs
//
// Stdout = slug/profil/scopes/chemin uniquement. Les tokens ne sortent JAMAIS
// du process : ni stdout, ni argv (passés à Convex sous forme de hash sha256).
// ───────────────────────────────────────────────────────────────────────────
import { createHash, randomBytes } from "node:crypto"
import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync, chmodSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// slug Data OS → profil Hermes (runtimeService = hermes-gateway-<profil>.service)
const AGENTS = [
  { slug: "coo", profile: "chief_of_staff", days: 30 },
  { slug: "agent-kb", profile: "cmo_executor", days: 90 },
  { slug: "agent-support-client", profile: "csm_executor", days: 90 },
  { slug: "agent-operations", profile: "operations_executor", days: 90 },
  { slug: "agent-analyse", profile: "rd_executor", days: 90 },
]

if (!process.env.CONVEX_DEPLOY_KEY) { console.error("✖ CONVEX_DEPLOY_KEY manquant. Voir l'entête du script."); process.exit(1) }

const run = (fn, args) => execFileSync("npx", ["convex", "run", fn, JSON.stringify(args)], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })
const isoIn = (d) => new Date(Date.now() + d * 86400000).toISOString()
const outDir = join(homedir(), ".hermes", "dataos")
mkdirSync(outDir, { recursive: true }); chmodSync(outDir, 0o700)

console.error("→ (re)seed des permissions…")
run("agentPermissions:seedAgentPermissions", {})

for (const { slug, profile, days } of AGENTS) {
  run("agentPermissions:revokeAgentCredentials", { slug })          // révoque l'ancien (compromis)
  const token = `dos_${slug.replace(/-/g, "_")}_${randomBytes(24).toString("hex")}`
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const expiresAt = isoIn(days)
  const res = run("agentPermissions:issueCredential", { slug, tokenHash, label: `hermes:${profile}`, expiresAt })
  const scopeCount = (res.match(/scopeCount[":\s]+(\d+)/) ?? [])[1] ?? "?"
  const file = join(outDir, `${profile}.env`)
  writeFileSync(file, `# Data OS token — agent ${slug} (profil ${profile}). Rotation: relancer rotate-agent-tokens.mjs.\nDATAOS_TOKEN=${token}\n`, { mode: 0o600 })
  chmodSync(file, 0o600)
  console.error(`  ✓ ${slug.padEnd(22)} profil=${profile.padEnd(20)} scopes=${scopeCount}  → ${file}`)
}

console.error(`\nTokens écrits dans ${outDir}/<profil>.env (0600). Aucun token affiché.`)
console.error("Câbler chaque service :  systemd  EnvironmentFile=~/.hermes/dataos/<profil>.env  (puis reload du gateway).")
