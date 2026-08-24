# Autopilote, contrôleur, avancement & prompts d'images

> Fichier de synthèse. Trois parties :
> 1. **Avancement** (barre en %)
> 2. **L'autopilote** (relève bornée + planification) et **le contrôleur** (`control.sh`)
> 3. **30 prompts d'images** prêts à coller dans ChatGPT (outil image / DAL·E)

---

## 1. Avancement

```
[███████████████████████████████████░░░░░░░░░░░░░░░]  70 %
773 réglés · 327 restants · 186 confirmés 2 sources · vervox actif
```

| Indicateur | Valeur |
|---|---|
| Pseudos réglés (verdict ou 3 essais) | 773 / 1100 |
| Restants | 327 |
| Disponibles confirmés par 2 sources | 186 |
| Débit vervox mesuré | ~7 verdicts/h |
| Fin des candidats (cœur du livrable) | ~30 h → 26/08 ≈ 02h Paris |

---

## 2. L'autopilote et le contrôleur

### 2.1 Principe de l'autopilote

Le problème : dans cet environnement, les processus meurent **sans notification**
(perte de conteneur, tâche perdue par le harness). Trois mécanismes de relance
ont échoué avant celui-ci : `setsid nohup` (tué avec le reste), `CronCreate` seul
(session-only, disparaît), tâche d'arrière-plan simple (perdue en silence).

La solution qui tient : **la relève bornée**. Au lieu d'espérer qu'un run survive,
chaque run **s'arrête lui-même** au bout de `RUN_MINUTES`. Une sortie propre
produit une **notification de fin**, et cette notification réveille la session
pour lancer le run suivant. La mort silencieuse devient une passation programmée ;
comme l'état est écrit sur disque après chaque pseudo, une passation ne coûte rien.

```
run 40 min ──► sortie propre ──► notification ──► session réveillée ──► run suivant
     ▲                                                                      │
     └──────────────────────── état sur disque ────────────────────────────┘
```

### 2.2 Cœur de la relève (extrait de `confirm.js` / `crosscheck.js`)

```js
// Runs bornés, volontairement. Une sortie propre déclenche une notification
// qui réveille la session pour enchaîner. Checkpoint après chaque pseudo.
const RUN_MS = +(process.env.RUN_MINUTES || 0) * 60000;
const STARTED_AT = Date.now();

for (;;) {
  if (DEADLINE && Date.now() >= DEADLINE) { console.log('échéance atteinte'); break; }
  if (RUN_MS && Date.now() - STARTED_AT >= RUN_MS) {
    console.log('relève : fenêtre écoulée, sortie propre pour déclencher la reprise');
    break;
  }
  const list = pending();
  if (!list.length) break;

  const u = list[0];
  const res = await check(u);

  // Ne jamais relancer un service qui vient de bloquer (journal sur disque).
  if (res.rateLimited) {
    // Si le backoff dépasse la fenêtre de relève, sortir tout de suite :
    // dormir occuperait le créneau pour rien, le blocage est déjà journalisé.
    if (RUN_MS && Date.now() + BACKOFF_MS >= STARTED_AT + RUN_MS) break;
    await sleep(BACKOFF_MS);
    continue;
  }

  record(u, res);          // écriture atomique
  await sleep(throttle.delay);  // cadence adaptative, plancher = valeur mesurée
}
```

### 2.3 Commandes de relance (à enchaîner à chaque notification de fin)

```bash
cd /home/user/Kostas258

# socialcal (source principale, quota large)
RUN_MINUTES=240 DEADLINE=2026-08-27T22:00:00Z \
  SC_DELAY_MS=60000 SC_MAX_DELAY_MS=300000 node scripts/crosscheck.js

# vervox (corroboration, quota serré — 480 s entre requêtes)
RUN_MINUTES=240 DEADLINE=2026-08-27T22:00:00Z \
  DELAY_MS=480000 MAX_DELAY_MS=1800000 node scripts/confirm.js
```

### 2.4 Planification (réveil de la session tant qu'elle vit)

```
# cron 5 champs, heure locale — toutes les 20 min
*/20 * * * *   →   bash scripts/control.sh + relancer ce que le contrôleur signale
```

> Limite honnête : la planification ne réveille la session que **pendant qu'elle
> est active**. Aucun montage local ne survit à l'arrêt complet du conteneur.
> C'est la contrainte de fond de cet environnement, pas un défaut du code.

### 2.5 Le contrôleur — `scripts/control.sh`

Un seul appel : état, progression, audit, régénération des livrables, commit, push.
Il **signale** ce qui doit repartir, mais ne relance rien lui-même (les processus
détachés ne survivent pas — c'est l'appelant, harness ou humain, qui relance).

```bash
#!/bin/bash
# Remet le projet dans un état connu : état, progression, audit, publication.
# Pas un démon : tourne une fois, rapporte, sort.
set -uo pipefail
cd /home/user/Kostas258 || exit 1
DEADLINE="${DEADLINE:-2026-08-25T10:00:00Z}"

now() { TZ=Europe/Paris date '+%H:%M:%S'; }
say() { echo "$(now) $*"; }

# argv EXACT — `pgrep -f` attrape les wrappers shell et croit un runner mort vivant.
alive() { ps -eo args --no-headers | grep -q "^node scripts/$1\$"; }

say "── contrôleur ──"

# socialcal : relance seulement s'il reste du travail
if alive crosscheck.js; then say "socialcal : actif"
else
  scleft=$(node -e '
    const a=require("./progress.json"),b=require("./progress_1000.json");
    const fs=require("fs");
    const sc=fs.existsSync("./socialcal.json")?require("./socialcal.json").results:{};
    const V=r=>r&&r.verdict&&r.verdict!=="unknown";
    let n=0;
    for (const names of [a.usernames,b.names])
      for (const u of names) if (!(sc[u] && (V(sc[u]) || (sc[u].tries||0)>=3))) n++;
    console.log(n);' 2>/dev/null || echo 0)
  if [ "${scleft:-0}" -gt 0 ]; then
    say "socialcal : arrêté, $scleft en attente"; echo "RESTART_SOCIALCAL=1"
  else say "socialcal : terminé"; fi
fi

# vervox : relance seulement s'il reste des candidats
if alive confirm.js; then say "vervox : actif"
else
  left=$(node -e '
    const a=require("./progress.json"),b=require("./progress_1000.json"),sc=require("./socialcal.json").results;
    const V=r=>r&&r.verdict&&r.verdict!=="unknown"?r.verdict:null;
    let n=0;
    for (const [names,res] of [[a.usernames,a.results],[b.names,b.results]])
      for (const u of names)
        if (V(sc[u])==="available" && !V(res[u]) && ((res[u]&&res[u].tries)||0) < 3) n++;
    console.log(n);' 2>/dev/null || echo 0)
  if [ "${left:-0}" -gt 0 ]; then
    say "vervox : arrêté, $left candidats en attente"; echo "RESTART_VERVOX=1"
  else say "vervox : arrêté, plus aucun candidat"; fi
fi

# Cooldowns : signalés, jamais contournés
node -e '
const c=require("./scripts/cooldown.js");
for (const s of ["socialcal","vervox"]) {
  const l=c.remainingMs(s);
  if (l) console.log("   "+s+" : silence encore "+Math.ceil(l/60000)+" min");
}' 2>/dev/null

say "── progression ──"
node -e '
const a=require("./progress.json"),b=require("./progress_1000.json"),sc=require("./socialcal.json").results;
const V=r=>r&&r.verdict&&r.verdict!=="unknown"?r.verdict:null;
const settled=b.names.filter(u=>V(sc[u])).length;
let conf=0,cand=0;
for (const [names,res] of [[a.usernames,a.results],[b.names,b.results]])
  for (const u of names){
    const s=V(sc[u]),v=V(res[u]);
    if(s==="available"&&v==="available") conf++;
    else if(s==="available"&&!v) cand++;
  }
console.log("   liste 1000 : "+settled+"/1000 tranchés");
console.log("   confirmés 2 sources : "+conf+" | candidats en attente : "+cand);
'

say "── intégrité ──"
if node scripts/audit.js >/tmp/audit.out 2>&1; then
  tail -1 /tmp/audit.out | sed 's/^/   /'
  node scripts/report_all.js  | sed 's/^/   /'
  node scripts/liste_1000.js  | sed 's/^/   /'
  git add -A
  if git diff --cached --quiet; then say "rien de nouveau"
  else
    git commit -q -m "Progression automatique de la vérification de pseudos

Commit produit par scripts/control.sh."
    for i in 1 2 3 4; do
      git push -u origin claude/github-proxy-repos-pa7qo5 >/dev/null 2>&1 && { say "poussé"; break; }
      sleep $((2**i))
    done
  fi
else
  say "AUDIT EN ÉCHEC — rien n'est publié"; tail -5 /tmp/audit.out | sed 's/^/   /'; exit 1
fi
```

### 2.6 Les garde-fous qui rendent l'autopilote sûr

| Fichier | Rôle |
|---|---|
| `safe.js` | écritures atomiques (temp+fsync+rename), validation des pseudos, **verrou d'instance** (jamais deux files sur une source) |
| `throttle.js` | cadence adaptative ; le **plancher est la valeur mesurée sûre**, jamais en dessous |
| `cooldown.js` | journal des blocages sur disque ; cooldown **exponentiel** ; ne jamais relancer un service qui vient de bloquer |
| `audit.js` | aucun verdict issu d'une erreur ; chaque verdict adossé à sa réponse brute |
| `time.js` | affichage heure de Paris, stockage en UTC |

---

## 3. 30 prompts d'images pour ChatGPT (outil image)

> Colle chaque bloc tel quel dans ChatGPT (« génère une image : … »).
> Style commun conseillé à ajouter en fin de prompt : *« illustration technique
> épurée, fond sombre, palette bleu/vert/ambre, style schéma d'ingénierie, sans
> texte superflu, 16:9 »*. Thème : un pipeline d'autopilote de vérification.

1. Un tapis roulant d'usine où défilent des cartes marquées « @pseudo », triées par deux bras robotisés vers trois bacs : « PRIS », « LIBRE », « INCONNU ».
2. Deux tours de contrôle distinctes (« vervox » et « socialcal ») observant le même flux de noms ; un pont lumineux ne relie que les noms sur lesquels elles s'accordent.
3. Une horloge dont chaque tic éjecte proprement un wagon (« run de 40 min ») qui en réveille un suivant : métaphore de la relève programmée.
4. Un sablier posé sur un disque dur : le sable qui tombe est sauvegardé, rien n'est perdu — l'idée du checkpoint après chaque étape.
5. Un feu tricolore stylisé pour une API : vert « répond », orange « cadence », rouge « bloqué 3 h », avec un chronomètre de refroidissement.
6. Un vigile devant une porte tenant un registre « journal des blocages » ; il refuse de relancer un service dont le nom vient d'être inscrit.
7. Un thermostat intelligent qui ralentit un flux quand les réponses deviennent « brouillées » : illustration de l'auto-throttling.
8. Une balance de justice pesant deux verdicts opposés ; au lieu de trancher, elle affiche « CONTRADICTION » en lettres ambrées.
9. Un archéologue éclairant une strate « archive.org / Wayback » et y trouvant l'empreinte fossilisée d'un ancien profil : la contre-épreuve indépendante.
10. Une barre de chargement géante à 70 % faite de milliers de petites cartes-pseudos, sur un mur d'atelier.
11. Un tableau de bord d'ingénieur avec jauges : « débit 7/h », « confirmés 186 », « restants 327 », esthétique cockpit sobre.
12. Deux files d'attente devant un guichet unique « vervox » ; un panneau « une seule file à la fois — verrou d'instance ».
13. Un robot méticuleux qui recopie une fiche dans un dossier temporaire, la scelle, puis la range : l'écriture atomique.
14. Un mur de casiers ; certains portent une étiquette « confirmé ×2 » brillante, d'autres « 1 source » terne, d'autres « indéterminé » grisé.
15. Un pont suspendu entre deux falaises « socialcal » et « vervox », des cordes ne reliant que les points où les deux rives concordent.
16. Une lanterne de veilleur passant de main en main dans la nuit sans jamais s'éteindre : la continuité par passation.
17. Un panneau de sécurité « NE PAS CONTOURNER » barrant une route « proxies / rotation d'IP », avec un détour honnête bien éclairé à côté.
18. Un facteur qui repose une enveloppe en réalisant qu'elle irait à une vraie personne : refus d'utiliser l'endpoint de récupération de compte.
19. Une loupe d'inspecteur révélant qu'un résultat de recherche « m7iy_ » n'est pas « m7iy » : le piège des correspondances approchantes.
20. Un métronome d'orfèvre réglé sur « 480 s », symbole de la cadence mesurée qu'on ne descend jamais.
21. Un diagramme en flux : Demande → Planificateur → Implémenteur → Contrôles → Relecture → Vérificateur, en rails de train propres.
22. Un coffre-fort ouvert ne contenant aucune clé ni secret, juste la mention « rien de sensible ici » : sécurité par absence.
23. Une pile de fichiers étiquetés `.md` et `.csv` glissant proprement dans une boîte « livrables », rangés par statut.
24. Un gardien de phare notant l'heure de Paris sur un carnet, tandis qu'une horloge murale affiche UTC : stockage UTC, affichage local.
25. Un aiguilleur ferroviaire dirigeant d'abord les wagons « candidats » puis les wagons « orphelins » : l'ordre de la file en deux phases.
26. Une main reposant délicatement un outil « CAPTCHA » sans y toucher, avec une note « détecter, s'arrêter, signaler ».
27. Un graphe en escalier montant régulièrement de 84 à 186 confirmés sur plusieurs jours, style courbe d'ingénierie.
28. Un atelier vu de haut : trois établis « socialcal », « vervox », « audit » reliés par des tapis, un seul contremaître (« control.sh »).
29. Une clé USB gravée « CLAUDE.md · QUICK_REF.md » branchée sur un cerveau-machine : les instructions courtes qui font gagner du contexte.
30. Une ligne d'arrivée « 1000 / 1000 » encore lointaine, un coureur régulier et non essoufflé, sous une bannière « réaliste, honnête, jusqu'au bout ».

---

*Généré à 70 % d'avancement. La partie 2 est le code réellement en production dans
ce dépôt (`scripts/`). La partie 3 est un jeu de prompts à générer côté ChatGPT —
je ne produis pas d'images ici.*
