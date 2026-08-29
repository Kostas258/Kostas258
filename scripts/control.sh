#!/bin/bash
# One command that puts the project back in a known-good state.
#
# Written because every check-in was the same manual sequence — look at what is
# running, restart what is not, audit, regenerate, commit, push — and doing it by
# hand is how the pkill that killed its own shell happened three times.
#
# It is deliberately NOT a daemon. Detached processes do not survive in this
# environment (measured 22 August: supervisor, runners and even an orphaned lock
# holder all vanished together), so this runs once, reports, and exits. Call it
# from a scheduled check-in or by hand.
#
# Usage: bash scripts/control.sh [--no-push]

cd /home/user/Kostas258 || exit 1
# Pas de date en dur : celle qui traînait ici était périmée depuis cinq jours.
# Une échéance dépassée fait sortir immédiatement tout runner qui la lit, sans
# rien dire d'utile. Vide = pas d'échéance ; l'appelant la fixe s'il en veut une.
DEADLINE="${DEADLINE:-}"
PUSH=1
[ "$1" = "--no-push" ] && PUSH=0

now() { TZ=Europe/Paris date '+%H:%M:%S'; }
say() { echo "$(now) $*"; }

# Exact argv. `pgrep -f` matches the shell wrappers that launched a runner and
# outlive it, which made the old supervisor report dead runners as alive.
alive() { ps -eo args --no-headers | grep -q "^node scripts/$1\$"; }

say "── contrôleur ──"

if alive crosscheck.js; then
  say "socialcal : actif"
else
  # Same guard vervox already had: asking for a restart when the queue is empty
  # would spawn a runner that exits at once, and on a bad day loop doing it.
  # « tries >= 3 » ne veut pas dire « réglé ». Un essai contre un amont en panne,
  # ou une réponse servie depuis le cache amont, épuise le compteur sans jamais
  # avoir posé la question à une source vivante. C'est ce qui a fait passer
  # socialcal pour terminé du 23 au 28/08, puis de nouveau le 28 au soir où 25
  # des 33 restants n'avaient eu qu'un seul essai, tous en cache.
  #
  # Le compte porte donc sur l'absence de verdict, sans regarder les essais. Ce
  # qui décide du moment de la relance est ailleurs : l'âge du dernier appel.
  # Redemander avant expiration du cache amont rend les mêmes octets.
  read -r scleft schours <<<"$(node -e '
    const a=require("./progress.json"),b=require("./progress_1000.json");
    const fs=require("fs");
    const sc=fs.existsSync("./socialcal.json")?require("./socialcal.json").results:{};
    const V=r=>r&&r.verdict&&r.verdict!=="unknown";
    let n=0, last=null;
    for (const names of [a.usernames,b.names])
      for (const u of names) {
        if (!V(sc[u])) n++;
        const t=sc[u]&&sc[u].checkedAt;
        if (t && (!last || t>last)) last=t;
      }
    const h = last ? (Date.now()-Date.parse(last))/3600000 : 999;
    console.log(n+" "+h.toFixed(1));' 2>/dev/null || echo "0 999")"

  # 3 h était une hypothèse. Mesure du 28/08 à 22:21, exactement 3 h après la
  # passe précédente : 45 requêtes, 27 réponses encore servies par le cache
  # amont, UN seul verdict gagné. Le cache tient donc bien au-delà de 3 h, et
  # reprendre à ce rythme dépense trois quarts d'heure de quota pour rien.
  #
  # 24 h est un pas prudent, pas une durée mesurée — la vraie TTL reste inconnue.
  # Ce qui fait avancer ces pseudos entre-temps est vervox : ce sont ses
  # orphelins, et il leur donne un premier verdict sans dépendre de ce cache.
  CACHE_H="${SC_CACHE_HOURS:-24}"
  if [ "${scleft:-0}" -eq 0 ]; then
    say "socialcal : arrêté, plus rien à vérifier — travail terminé"
  elif awk "BEGIN{exit !(${schours:-999} >= $CACHE_H)}"; then
    say "socialcal : arrêté, $scleft sans verdict, dernier appel il y a ${schours} h — à relancer par l'appelant"
    say "   RETRY_UNKNOWN=1 RUN_MINUTES=240 DELAY_MS=60000 node scripts/crosscheck.js"
    echo "RESTART_SOCIALCAL=1"
  else
    say "socialcal : arrêté, $scleft sans verdict, mais dernier appel il y a ${schours} h"
    say "   relance différée : sous $CACHE_H h, l'amont resservirait ses réponses en cache"
  fi
fi

if alive confirm.js; then
  say "vervox : actif"
else
  # Ce compte doit reproduire pending() de confirm.js, sans quoi le contrôleur
  # annonce « rien à faire » alors que le runner a du travail. C'est arrivé le
  # 28/08 au soir : ne comptant que les candidats, il déclarait vervox terminé
  # avec 30 orphelins en file. Un orphelin est un pseudo que socialcal n'a
  # jamais tranché ; vervox est alors la seule source qui puisse lui donner un
  # premier verdict, faute de quoi il reste sans verdict d'aucune source.
  read -r cand orph <<<"$(node -e '
    const a=require("./progress.json"),b=require("./progress_1000.json"),sc=require("./socialcal.json").results;
    const V=r=>r&&r.verdict&&r.verdict!=="unknown"?r.verdict:null;
    let c=0,o=0;
    for (const [names,res] of [[a.usernames,a.results],[b.names,b.results]])
      for (const u of names) {
        if (V(res[u])) continue;
        if (((res[u]&&res[u].tries)||0) >= 3) continue;
        const s=V(sc[u]);
        if (s==="available") c++; else if (!s) o++;
      }
    console.log(c+" "+o);' 2>/dev/null || echo "0 0")"
  left=$(( ${cand:-0} + ${orph:-0} ))
  if [ "$left" -gt 0 ]; then
    say "vervox : arrêté, $left en file (${cand:-0} candidats, ${orph:-0} orphelins) — à relancer par l'appelant"
    echo "RESTART_VERVOX=1"
  else
    # File vide ne veut pas dire travail fini. Les contradictions restent, et la
    # seule chose utile qu'on puisse encore leur faire est de redemander : leurs
    # verdicts vervox datent de ~8 jours, et une mesure vieille n'engage pas la
    # source d'aujourd'hui. socialcal a été redemandé le 28/08 — 11 maintiennent
    # « pris », 0 résolu — donc c'est le côté vervox qui reste à remesurer.
    nconf=$(node -e '
      const a=require("./progress.json"),b=require("./progress_1000.json"),sc=require("./socialcal.json").results;
      const V=r=>r&&r.verdict&&r.verdict!=="unknown"?r.verdict:null;
      const vx={...a.results,...b.results};
      let n=0;
      for (const u of [...a.usernames,...b.names]) {
        const v=V(vx[u]), s=V(sc[u]);
        if (v&&s&&v!==s) n++;
      }
      console.log(n);' 2>/dev/null || echo 0)
    # `alive` ne teste que les deux runners historiques. La remesure des
    # contradictions est un troisième consommateur du quota vervox : sans ce
    # test, une relève en lancerait une seconde pendant que la première tourne,
    # et deux files sur la même source sont exactement ce que le verrou
    # d'instance existe pour empêcher.
    if ps -eo args --no-headers | grep -q "^node scripts/recheck_conflicts.js"; then
      say "vervox : remesure des contradictions déjà en cours"
    elif [ "${nconf:-0}" -gt 0 ]; then
      # Une remesure qui vient de conclure ne se refait pas. Les 29/08, les deux
      # sources ont maintenu leurs positions sur vingt-quatre mesures fraîches :
      # ces contradictions sont réelles et stables. Les redemander chaque heure
      # coûterait quinze requêtes vervox pour réapprendre la même chose.
      rhours=$(node -e '
        const fs=require("fs");
        if (!fs.existsSync("./recheck_state.json")) { console.log(999); process.exit(0); }
        const e=JSON.parse(fs.readFileSync("./recheck_state.json","utf8")).vervox;
        console.log(e && e.at ? ((Date.now()-Date.parse(e.at))/3600000).toFixed(1) : 999);
        ' 2>/dev/null || echo 999)
      RECHECK_H="${RECHECK_HOURS:-24}"
      if awk "BEGIN{exit !(${rhours:-999} >= $RECHECK_H)}"; then
        say "vervox : file vide, mais $nconf contradictions à remesurer"
        say "   node scripts/recheck_conflicts.js vervox"
        echo "RECHECK_CONFLICTS=1"
      else
        say "vervox : $nconf contradictions, remesurées il y a ${rhours} h — les deux sources maintiennent"
        say "   prochaine remesure utile dans $(awk "BEGIN{printf \"%.0f\", $RECHECK_H-${rhours}}") h ; seul dnsrobot pourrait les trancher"
      fi
    else
      say "vervox : arrêté, file vide — rien à faire"
    fi
  fi
fi

# Cooldowns are reported, never bypassed.
node -e '
const c=require("./scripts/cooldown.js");
for (const s of ["socialcal","vervox"]) {
  const l=c.remainingMs(s);
  if (l) console.log("   "+s+" : silence encore "+Math.ceil(l/60000)+" min (blocage enregistré)");
}' 2>/dev/null

say "── progression ──"
node -e '
const a=require("./progress.json"),b=require("./progress_1000.json"),sc=require("./socialcal.json").results;
const V=r=>r&&r.verdict&&r.verdict!=="unknown"?r.verdict:null;
const settled=b.names.filter(u=>V(sc[u])).length;
const todo=b.names.filter(u=>!(sc[u]&&(V(sc[u])||(sc[u].tries||0)>=3))).length;
let conf=0,cand=0;
for (const [names,res] of [[a.usernames,a.results],[b.names,b.results]])
  for (const u of names){
    const s=V(sc[u]),v=V(res[u]);
    if(s==="available"&&v==="available") conf++;
    else if(s==="available"&&!v) cand++;
  }
console.log("   liste 1000 : "+settled+"/1000 tranchés, "+todo+" restants");
console.log("   confirmés 2 sources : "+conf+" | candidats en attente : "+cand);
'

# dnsrobot est le seul arbitre possible des contradictions : il interroge
# Instagram en direct, là où socialcal et vervox ne peuvent que se contredire.
# Son amont est saturé depuis le 24/08, mais il répond « try again in a few
# minutes » et rend unknown honnêtement plutôt que d'inventer. Une requête par
# relève suffit à savoir s'il s'ouvre, sans y consacrer la moindre attention.
say "── arbitre (dnsrobot) ──"
node scripts/dnsrobot_probe.js 2>&1 | sed 's/^/   /' || true

say "── intégrité ──"
if node scripts/audit.js >/tmp/audit.out 2>&1; then
  tail -1 /tmp/audit.out | sed 's/^/   /'
  node scripts/report_all.js | sed 's/^/   /'
  node scripts/liste_1000.js | sed 's/^/   /'
  node scripts/disponibles.js | sed 's/^/   /'
  git add -A
  if git diff --cached --quiet; then
    say "rien de nouveau à publier"
  else
    git commit -q -m "Progression automatique de la vérification de pseudos

$(node -e '
const b=require("./progress_1000.json"),sc=require("./socialcal.json").results;
const V=r=>r&&r.verdict&&r.verdict!=="unknown";
console.log("Liste des 1000 : "+b.names.filter(u=>V(sc[u])).length+"/1000 tranchés.");
')
Commit produit par scripts/control.sh."
    if [ "$PUSH" = 1 ]; then
      for i in 1 2 3 4; do
        git push -u origin claude/github-proxy-repos-pa7qo5 >/dev/null 2>&1 && { say "poussé"; break; }
        sleep $((2**i))
      done
    fi
  fi
else
  say "AUDIT EN ÉCHEC — rien n'est publié"
  cat /tmp/audit.out | tail -5 | sed 's/^/   /'
  exit 1
fi
