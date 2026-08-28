#!/usr/bin/env bash
# Deterministic checks, run before declaring anything finished.
# Fast on purpose: syntax, data integrity, and that the deliverables regenerate.
set -uo pipefail
cd /home/user/Kostas258 || exit 1
fail=0

echo "── syntaxe ──"
for f in scripts/*.js; do node --check "$f" || { echo "  ÉCHEC $f"; fail=1; }; done
for f in scripts/*.sh; do bash -n "$f" || { echo "  ÉCHEC $f"; fail=1; }; done
[ $fail -eq 0 ] && echo "  ok"

echo "── intégrité des verdicts ──"
node scripts/audit.js | tail -1 || fail=1

echo "── les livrables se régénèrent ──"
node scripts/report_all.js >/dev/null && node scripts/liste_1000.js >/dev/null \
  && echo "  ok" || { echo "  ÉCHEC"; fail=1; }

# audit.js prouve que les verdicts enregistrés sont honnêtes. Celui-ci prouve que
# le travail restant est visible : c'est la moitié qui manquait le 23/08, quand
# une source arrêtée est passée pour une source terminée pendant cinq jours.
echo "── travail restant visible (faux terminé) ──"
node scripts/session_issues.js | tail -1 || fail=1

echo "── pas de secret dans le diff ──"
if git diff --cached -U0 | grep -inE '(password|secret|api[_-]?key|token)\s*[:=]\s*\S' ; then
  echo "  ÉCHEC : secret potentiel"; fail=1
else echo "  ok"; fi

[ $fail -eq 0 ] && echo "VALIDÉ" || echo "À CORRIGER"
exit $fail
