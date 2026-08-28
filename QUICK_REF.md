# Carte du projet

## État au 29/08 00:00 UTC

| | |
|---|---|
| **Disponibles, confirmés 2 sources** | **396** — dans `pseudos_disponibles.md` |
| Pris | 665 |
| Contradictions | 15 |
| Indéterminés | 24 |

Ce qui reste, et ce qu'il faut en faire :

- **24 orphelins** — pseudos que socialcal n'a jamais tranchés. vervox est la
  seule source qui puisse leur donner un premier verdict. Sa file les contient ;
  la relève horaire le relance dès que son cooldown tombe à zéro. Sur les six
  déjà traités, cinq sont revenus « pris ».
- **15 contradictions** — vervox « disponible », socialcal « pris », les quinze
  dans le même sens. socialcal a été redemandé le 28/08 : 11 maintiennent,
  0 résolu. Reste à redemander à vervox : `node scripts/recheck_conflicts.js vervox`,
  que `control.sh` propose de lui-même une fois la file vervox vide.
- **socialcal** est en pause jusqu'au 29/08 ~19:20 UTC. Ses 32 sans verdict
  reviennent de son cache amont ; mesuré le 28/08, redemander à 3 h d'écart a
  coûté 45 requêtes pour un verdict. Seuil porté à 24 h.
- **dnsrobot** reste le seul arbitre possible des contradictions. Sondé à chaque
  relève par `control.sh`, amont fermé depuis le 24/08.

`bash scripts/control.sh` dit toujours quoi faire : il émet `RESTART_VERVOX`,
`RESTART_SOCIALCAL` ou `RECHECK_CONFLICTS` avec la commande exacte.

## Livrables
- `pseudos_verifies.md` — rapport complet : méthode, sources, preuves, limites
- `liste_1000.md` / `liste_1000.csv` — les 1000 pseudos, groupés par statut
- `wayback_audit.json` — contre-épreuve indépendante des confirmés

## État (données)
- `progress.json` / `progress_1000.json` — verdicts vervox + listes source
- `socialcal.json` — verdicts socialcal
- `blocks.json` — journal des blocages par source (cooldowns)

## Scripts
| Fichier | Rôle |
|---|---|
| `control.sh` | point d'entrée : état, audit, rapport, commit, push |
| `verify.sh` | validation déterministe avant de conclure |
| `crosscheck.js` | socialcal sur les deux listes |
| `confirm.js` | vervox, candidats puis orphelins |
| `report_all.js` | génère `pseudos_verifies.md` |
| `liste_1000.js` | génère `liste_1000.md` et `.csv` |
| `audit.js` | intégrité : aucun verdict issu d'une erreur |
| `wayback_audit.js` | contre-épreuve archive.org |
| `safe.js` | écritures atomiques, validation, verrou d'instance |
| `throttle.js` | cadence adaptative (plancher = valeur mesurée) |
| `cooldown.js` | journal des blocages, cooldowns exponentiels |
| `time.js` | affichage heure de Paris (stockage en UTC) |
| `sniff.js` | découverte d'API via navigateur (inutilisable ici) |
| `session_issues.js` | détecteur de « faux terminé » : source arrêtée prise pour finie, cadence sous le plancher, verrou périmé |
| `disponibles.js` | écrit `pseudos_disponibles.md` — le livrable : les pseudos libres, seuls |
| `dnsrobot_probe.js` | une sonde par relève sur le seul arbitre possible des contradictions ; `--arbitrer` s'il s'ouvre |
| `probe_source.sh` | triage d'une source candidate en une commande, avec mesure du bruit de page |
| `wayback_orphans.js` | Wayback sur les non tranchés — conservé, rendement mesuré nul (0/171) |
| `purge_profile_urls.js` | retire les liens vers des comptes de tiers des réponses stockées |

## Sources
- **socialcal** — worker Cloudflare, quota large, source principale
- **vervox** — quota très serré, sur-déclare la disponibilité, corroboration seulement
- Écartées : dnsrobot, namecheckly, brandsnag, ~20 autres (voir `SOURCES.md`)

## Contraintes d'environnement
- Instagram direct : 302 sur tout, 401 sur l'API. Aucun signal.
- Navigateur : Chromium présent mais ne joint rien (ERR_CONNECTION_RESET).
- Processus détachés : ne survivent pas. Utiliser les tâches d'arrière-plan
  du harness, bornées par `RUN_MINUTES` pour provoquer une relève.
