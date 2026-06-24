#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────────
// Rotation PROPRE des tokens Data OS (un par agent) — sans jamais afficher les
// tokens. Pour chaque agent : (re)seed les permissions, révoque les credentials
// actives, émet un token frais, et l'écrit en `export DATAOS_TOKEN=dos_…` dans le
// .env du PROFIL SLACK réellement lu par le gateway :
//   /root/.hermes/profiles/<profil>/.env   (HERMES_HOME, chargé par dotenv, export-aware)
// Les autres variables du .env sont préservées.
//
// ⚠️ Les 7 agents DOIVENT être couverts (cf. SLUG_TO_ROLE). En oublier un le laisse
// sans token frais → -32001 Unauthorized. Le mapping ci-dessous = source de vérité.
//
// Prérequis : CONVEX_DEPLOY_KEY dans l'env (cf. mémoire qos-convex-deploy).
//   env -u VERCEL -u VERCEL_ENV -u VERCEL_URL -u CI \
//     CONVEX_DEPLOY_KEY='dev:standing-malamute-439|…' \
//     node scripts/rotate-agent-tokens.mjs
//
// Stdout = slug/profil/scopes/chemin uniquement. Les tokens ne sortent JAMAIS du
// process (ni stdout, ni argv : passés à Convex sous forme de hash sha256).
// Après exécution : redémarrer chaque gateway (commande imprimée en fin de run).
// ───────────────────────────────────────────────────────────────────────────
import { createHash, randomBytes } from "node:crypto"
import { execFileSync } from "node:child_process"
import { writeFileSync, chmodSync, existsSync, readFileSync } from "node:fs"

// slug Data OS → profil Slack (service = hermes-gateway-<profil>.service).
// Décision produit (2026-06-13) : tokens PERMANENTS, aucune expiration.
const AGENTS = [
  { slug: "coo", profile: "vividflow-slack-extension" },
  { slug: "agent-kb", profile: "agent-kb-slack" },
  { slug: "agent-support-client", profile: "agent-csm-slack" },
  { slug: "agent-operations", profile: "agent-operations-slack" },
  { slug: "agent-analyse", profile: "data-analyst-slack" },
  { slug: "agent-media-buyer", profile: "media-buyer-slack" },
  { slug: "agent-debug", profile: "agent-debug-slack" },
]
const PROFILES_DIR = "/root/.hermes/profiles"

if (!process.env.CONVEX_DEPLOY_KEY) { console.error("✖ CONVEX_DEPLOY_KEY manquant. Voir l'entête du script."); process.exit(1) }

const run = (fn, args) => execFileSync("npx", ["convex", "run", fn, JSON.stringify(args)], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })

// Écrit/remplace la ligne `export DATAOS_TOKEN=…` en préservant le reste du .env.
function writeToken(file, token) {
  const kept = existsSync(file)
    ? readFileSync(file, "utf8").split("\n").filter((l) => !/^\s*#?\s*export\s+DATAOS_TOKEN=/.test(l) && l.length)
    : []
  kept.push(`export DATAOS_TOKEN=${token}`)
  writeFileSync(file, kept.join("\n") + "\n", { mode: 0o600 })
  chmodSync(file, 0o600)
}

console.error("→ (re)seed des permissions (7 agents → FULL_GRANTS)…")
run("agentPermissions:seedAgentPermissions", {})

for (const { slug, profile } of AGENTS) {
  run("agentPermissions:revokeAgentCredentials", { slug })          // révoque l'ancien
  const token = `dos_${slug.replace(/-/g, "_")}_${randomBytes(24).toString("hex")}`
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const res = run("agentPermissions:issueCredential", { slug, tokenHash, label: `hermes:${profile}` }) // permanent
  const scopeCount = (res.match(/scopeCount[":\s]+(\d+)/) ?? [])[1] ?? "?"
  const file = `${PROFILES_DIR}/${profile}/.env`
  writeToken(file, token)
  console.error(`  ✓ ${slug.padEnd(22)} profil=${profile.padEnd(26)} scopes=${scopeCount}  → ${file}`)
}

console.error(`\nTokens écrits (0600, export-aware) dans ${PROFILES_DIR}/<profil>/.env. Aucun token affiché.`)
console.error("Redémarrer chaque gateway pour charger les nouveaux tokens :")
console.error("  export XDG_RUNTIME_DIR=/run/user/0")
for (const { profile } of AGENTS) console.error(`  systemctl --user restart hermes-gateway-${profile}.service`)
