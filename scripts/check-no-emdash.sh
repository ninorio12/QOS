#!/usr/bin/env bash
# Detecte le caractere U+2014 (tiret cadratin) dans src/, convex/, public/.
# Exit 1 si trouve, 0 sinon. Volontairement NON branche au build/CI (le sweep
# des occurrences existantes n'est pas encore fait). A lancer a la main : npm run check:wording
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 0

HITS="$(grep -rlP '\x{2014}' src convex public 2>/dev/null)"

if [ -n "$HITS" ]; then
  echo "U+2014 trouve dans :"
  echo "$HITS"
  exit 1
fi

echo "Aucun U+2014 trouve."
exit 0
