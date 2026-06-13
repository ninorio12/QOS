#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────────────
# Smoke test réel des tokens agents Data OS — SANS exposer les tokens.
# Lit chaque token depuis ~/.hermes/dataos/<profil>.env, le passe à curl via un
# fichier d'en-tête en tmpfs (0600) supprimé aussitôt → jamais dans argv/ps/logs.
# N'affiche que PASS/FAIL + le code JSON-RPC.
#
#   bash scripts/dataos-smoke.sh
# ───────────────────────────────────────────────────────────────────────────
set -u
URL="${DATAOS_URL:-https://data-os.vividflow.co/api/mcp}"
DIR="${DATAOS_DIR:-$HOME/.hermes/dataos}"
fails=0

# call <profileFileOrEmpty> <toolJSON> → echoes response body (token jamais affiché)
call() {
  local pf="$1" body="$2" hf rc
  hf="$(mktemp /dev/shm/dos_h.XXXXXX)"; chmod 600 "$hf"
  if [ -n "$pf" ] && [ -f "$DIR/$pf" ]; then
    printf 'Authorization: Bearer %s' "$(grep '^DATAOS_TOKEN=' "$DIR/$pf" | cut -d= -f2-)" > "$hf"
  fi
  curl -s -m 20 -X POST "$URL" -H 'Content-Type: application/json' -H @"$hf" \
    --data "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":$body}"
  rc=$?; rm -f "$hf"; return $rc
}

# check <label> <profileFile> <toolJSON> <expected-substring>
check() {
  local label="$1" pf="$2" tool="$3" want="$4" out
  out="$(call "$pf" "$tool")"
  if printf '%s' "$out" | grep -q -- "$want"; then
    echo "PASS  $label"
  else
    echo "FAIL  $label  (attendu '$want')  →  $(printf '%s' "$out" | head -c 140)"
    fails=$((fails+1))
  fi
}

echo "── Data OS smoke ($URL) ──"
check "coo → dataos_state = execute"               chief_of_staff.env       '{"name":"dataos_state","arguments":{}}'                 '"result"'
check "agent-analyse → contacts_create = -32003"   rd_executor.env          '{"name":"contacts_create","arguments":{"name":"X"}}'    '-32003'
check "agent-kb → prospection_list = -32003"       cmo_executor.env         '{"name":"prospection_list","arguments":{}}'             '-32003'
check "agent-support-client → clients_list = exec" csm_executor.env         '{"name":"clients_list","arguments":{}}'                 '"result"'
check "agent-support-client → clients_update(value) = pending" csm_executor.env '{"name":"clients_update","arguments":{"id":"x","value":1}}' 'pending'
check "anonyme → -32001"                           ""                       '{"name":"contacts_list","arguments":{}}'                '-32001'

echo "────────────────────────"
[ "$fails" -eq 0 ] && echo "✅ TOUS VERTS" || { echo "❌ $fails échec(s)"; exit 1; }
