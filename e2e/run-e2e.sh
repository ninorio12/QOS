#!/usr/bin/env bash
# Orchestre les tests E2E Playwright du SaaS Data OS.
# - applique un harnais d'auth LOCAL (pass-through) pour tester les pages connectées sans OTP ;
# - démarre next dev sur :3100 ;
# - lance Playwright ;
# - REVERTE toujours le code (trap) et arrête le serveur.
# Le code committé reste en mode Clerk : ce script ne touche src/ que le temps du run.
set -uo pipefail
cd "$(dirname "$0")/.."

MW=src/middleware.ts
UCU=src/hooks/useCurrentUser.ts
DEV_PID=""

cleanup() {
  echo "▸ Revert du harnais + arrêt serveur…"
  git checkout -- "$MW" "$UCU" 2>/dev/null
  if [ -n "$DEV_PID" ]; then kill -9 "$DEV_PID" 2>/dev/null; fi
  for p in $(ss -ltnp 2>/dev/null | grep ':3100' | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u); do kill -9 "$p" 2>/dev/null; done
}
trap cleanup EXIT INT TERM

# garde-fou : ne pas écraser des modifs non commitées de ces fichiers
if ! git diff --quiet -- "$MW" "$UCU"; then
  echo "✗ $MW ou $UCU a des modifs non commitées — abort (le revert les perdrait)."; exit 2
fi

echo "▸ Application du harnais d'auth local (pass-through)…"
cat > "$MW" <<'EOF'
// ⚠️ Écrit temporairement par e2e/run-e2e.sh — reverté en fin de run. NE PAS COMMITER.
import { clerkMiddleware } from '@clerk/nextjs/server'
export default clerkMiddleware(async () => {})
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|txt|xml|js)$).*)'],
}
EOF
cat > "$UCU" <<'EOF'
'use client'
// ⚠️ Écrit temporairement par e2e/run-e2e.sh — reverté en fin de run. NE PAS COMMITER.
export function useCurrentUser() {
  return { me: { role: 'admin', allowedModules: [], name: 'E2E', firstName: 'E2E', lastName: 'Test' },
           clerkUser: { id: 'e2e' }, isLoaded: true, isAdmin: true }
}
EOF

echo "▸ Démarrage next dev :3100…"
NODE_OPTIONS="--max-old-space-size=3072" npx next dev -p 3100 > /tmp/e2e-dev.log 2>&1 &
DEV_PID=$!

echo "▸ Attente du serveur…"
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3100/dashboard 2>/dev/null || echo 000)
  [ "$code" = "200" ] && { echo "  serveur prêt."; break; }
  sleep 2
done

echo "▸ Lancement Playwright…"
npx playwright test "$@"
RESULT=$?

exit $RESULT
