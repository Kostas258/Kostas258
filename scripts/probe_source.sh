#!/usr/bin/env bash
#
# Triage d'une source candidate, en une commande.
#
#   scripts/probe_source.sh <url> [param]
#
# `param` est le nom du paramètre de requête à essayer (défaut : username).
# Le pseudo est injecté en fin d'URL si elle finit par « = », sinon ?param=.
#
# ── Ce que le test décide ──────────────────────────────────────────────────
#
# Une source utilisable ici doit rendre un verdict DIFFÉRENT pour un pseudo
# certainement pris et un pseudo certainement libre, sans navigateur — Chromium
# ne sort pas de cet environnement. Trois témoins :
#
#   cristiano        pris, sans doute possible
#   zqv7xkq9wzqjj4   libre, sans doute possible
#   m7oqa            du corpus, ce qu'on veut réellement savoir
#
# ── Deux pièges, tous deux rencontrés le 28/08 ─────────────────────────────
#
# 1. LE TÉMOIN NE DOIT PAS ÊTRE UN MOT DE LA PAGE.
#    La mesure retire le pseudo de la page avant de la peser. Avec `instagram`
#    comme témoin « pris », on ampute aussi les centaines d'occurrences du nom
#    de la plateforme : la page rétrécit, l'écart devient énorme, et cinq
#    sources rendant des pages RIGOUREUSEMENT identiques ont été classées
#    candidates. D'où `cristiano`, et le garde-fou qui refuse un témoin présent
#    dans l'URL.
#
# 2. UNE TAILLE DIFFÉRENTE NE PROUVE PAS UN VERDICT.
#    Horodatages, nonces, publicités, identifiants de session : deux appels à la
#    MÊME page ne rendent pas les mêmes octets. Comparer deux témoins sans
#    connaître ce bruit revient à lire du hasard. Le script mesure donc d'abord
#    le bruit propre de la page — chaque témoin est demandé deux fois — et ne
#    retient une candidate que si l'écart entre témoins dépasse nettement ce
#    bruit.
#
# ── Ce que le test ne décide pas ───────────────────────────────────────────
#
# Il écarte, il ne retient pas. Une candidate qui le passe doit encore affronter
# la stabilité dans le temps : le même témoin plusieurs fois à plusieurs
# minutes d'écart, puis les deux populations déjà tranchées par nos sources.
# Threads avait passé les trois témoins et ne mesurait que notre cadence de
# requêtes.
set -uo pipefail

URL="${1:?usage: probe_source.sh <url> [param]}"
PARAM="${2:-username}"
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
PRIS=cristiano
LIBRE=zqv7xkq9wzqjj4
CORPUS=m7oqa
# Marge exigée au-dessus du bruit. Un verdict ajoute une phrase, donc des
# dizaines d'octets au moins ; le bruit d'une page est de quelques octets.
# Exiger le triple du bruit, et au moins 40 octets, sépare les deux sans
# prétendre à une précision qu'on n'a pas.
FACTEUR=3
PLANCHER=40

url_for() {
  case "$URL" in
    *=)   printf '%s%s'      "$URL" "$1" ;;
    *\?*) printf '%s&%s=%s'  "$URL" "$PARAM" "$1" ;;
    *)    printf '%s?%s=%s'  "$URL" "$PARAM" "$1" ;;
  esac
}

# Taille de la page, le pseudo retiré, pour que deux réponses ne différant que
# par l'écho du pseudo se mesurent identiques.
taille_nette() {
  local n="$1" f
  f=$(mktemp)
  curl -sL -m 25 -A "$UA" "$(url_for "$n")" -o "$f" 2>/dev/null
  sed "s/$n//g" "$f" | wc -c
  rm -f "$f"
}

abs() { local v=$1; [ "$v" -lt 0 ] && v=$(( -v )); printf '%s' "$v"; }

host=$(printf '%s' "$URL" | sed -E 's#https?://([^/]+).*#\1#')
printf '── %s\n' "$host"

code=$(curl -sLo /dev/null -m 20 -A "$UA" -w '%{http_code}' "$URL" 2>/dev/null) || code=ERR
if [ "$code" != "200" ]; then
  printf '   HTTP %s -> ÉCARTÉE (injoignable ou refusée)\n' "$code"
  exit 1
fi

for n in "$PRIS" "$LIBRE" "$CORPUS"; do
  case "$URL" in
    *"$n"*)
      printf '   le témoin « %s » apparaît dans l URL : il fausserait la mesure.\n' "$n"
      printf '   en choisir un absent du vocabulaire de la page.\n'
      exit 2 ;;
  esac
done

# ── bruit propre de la page : le même témoin, deux fois ────────────────────
p1=$(taille_nette "$PRIS");  sleep 3
p2=$(taille_nette "$PRIS");  sleep 3
l1=$(taille_nette "$LIBRE"); sleep 3
c1=$(taille_nette "$CORPUS")

bruit=$(abs $(( p1 - p2 )))
ecart=$(abs $(( p1 - l1 )))
seuil=$(( bruit * FACTEUR ))
[ "$seuil" -lt "$PLANCHER" ] && seuil=$PLANCHER

printf '   %-16s %8s o   puis %8s o\n' "$PRIS"   "$p1" "$p2"
printf '   %-16s %8s o\n'              "$LIBRE"  "$l1"
printf '   %-16s %8s o\n'              "$CORPUS" "$c1"
printf '   bruit propre de la page : %s o   |   écart pris/libre : %s o   |   seuil : %s o\n' \
       "$bruit" "$ecart" "$seuil"

if [ "$ecart" -lt "$seuil" ]; then
  if [ "$ecart" -eq 0 ]; then
    printf '   pris et libre rendent la MÊME page -> aucun verdict serveur, ÉCARTÉE\n'
  else
    printf '   écart dans le bruit de la page -> aucun verdict serveur, ÉCARTÉE\n'
  fi
  exit 1
fi

printf '   écart supérieur au bruit -> CANDIDATE\n'
printf '   reste à vérifier : stabilité dans le temps, puis les deux populations\n'
printf '   déjà tranchées par socialcal et vervox.\n'
exit 0
