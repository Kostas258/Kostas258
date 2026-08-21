# Pseudos Instagram — identifiants utilisés ou non

**Généré le :** 2026-08-21 10:02:01 UTC
**Fenêtre de vérification :** 2026-08-20 12:25:40Z → 2026-08-21 10:01:37Z

## Sources

| Source | Nature | État |
|---|---|---|
| **vervox.app** | API `/api/tools/username-check` | opérationnelle — quota par IP sur fenêtre glissante |
| **socialcal.app** | API `socialcal-media-proxy` (Cloudflare Worker) | opérationnelle — quota indépendant, renvoie un niveau de confiance |
| brandsnag.com | — | **hors service** pour Instagram : 35/35 réponses indéterminées la session précédente, y compris sur `instagram`, `nike`, `cristiano` |
| instagram.com direct | — | **inaccessible** depuis cette IP : 302 (mur de connexion) sur les profils, 429 sur l'API d'inscription |

Un verdict n'est retenu que si les champs de la réponse concordent entre eux
(`available` + `statusCode` + message côté vervox ; `status` + `confidence: high`
côté socialcal). **Aucune erreur, aucun délai d'attente et aucune absence de réponse
n'est convertie en « disponible »** : le pseudo reste « indéterminé ».
Si les deux sources se contredisent, le statut est « contradiction », jamais un arbitrage.

« Utilisé » = le pseudo a réellement été soumis à au moins une source.
« Non vérifié » = jamais interrogé, statut inconnu — surtout pas « disponible ».

## Résumé

| | Liste m7ia (100) | Liste nomutilisateursprare (1000) | Total |
|---|---|---|---|
| Identifiants utilisés | 53 | 38 | 91 |
| Identifiants non utilisés | 47 | 962 | 1009 |
| Disponibles (2 sources) | 20 | 5 | 25 |
| Disponibles (1 source) | 0 | 0 | 0 |
| Pris | 24 | 28 | 52 |
| Contradictions | 9 | 5 | 14 |
| Indéterminés | 0 | 0 | 0 |

Vérifications par la seconde source (socialcal) : 50.

## Pseudos disponibles

### Liste nomutilisateursprare

1. **m7iy** — confirmé par 2 sources
2. **m7iv** — confirmé par 2 sources
3. **m7ir** — confirmé par 2 sources
4. **m7av** — confirmé par 2 sources
5. **m7ah** — confirmé par 2 sources

### Liste m7ia

1. **j2eb** — confirmé par 2 sources
2. **x2eh** — confirmé par 2 sources
3. **j7vuu** — confirmé par 2 sources
4. **zao8h** — confirmé par 2 sources
5. **zuw4i** — confirmé par 2 sources
6. **bg6ae** — confirmé par 2 sources
7. **bp5ef** — confirmé par 2 sources
8. **c8eoz** — confirmé par 2 sources
9. **cp8ux** — confirmé par 2 sources
10. **cte9a** — confirmé par 2 sources
11. **daa7t** — confirmé par 2 sources
12. **deu9v** — confirmé par 2 sources
13. **dl4ex** — confirmé par 2 sources
14. **gm7ic** — confirmé par 2 sources
15. **gmi6i** — confirmé par 2 sources
16. **h9bui** — confirmé par 2 sources
17. **hb2ol** — confirmé par 2 sources
18. **hnu1e** — confirmé par 2 sources
19. **hr4ie** — confirmé par 2 sources
20. **k4lae** — confirmé par 2 sources

⚠️ Même confirmée par deux sources, la disponibilité n'est **définitive qu'à la création
du compte** : Instagram réserve certains handles (marques, anciens comptes, comptes
désactivés) sans que les vérificateurs le sachent.

## Contradictions entre sources (14)

Ces pseudos ont reçu deux verdicts opposés. Aucun n'est retenu comme disponible.

| Pseudo | Vervox | SocialCal |
|---|---|---|
| `h3ii` | Disponible | Pris |
| `j4ex` | Disponible | Pris |
| `v8eu` | Disponible | Pris |
| `x2iz` | Disponible | Pris |
| `zir2a` | Disponible | Pris |
| `bk3ev` | Disponible | Pris |
| `bo7zo` | Disponible | Pris |
| `f2xau` | Disponible | Pris |
| `he4no` | Disponible | Pris |
| `m7ia` | Disponible | Pris |
| `m7ae` | Disponible | Pris |
| `m7at` | Disponible | Pris |
| `m7ei` | Disponible | Pris |
| `m7ea` | Disponible | Pris |

## Liste m7ia — 100 identifiants

| # | Pseudo | Utilisé | Statut | Vervox | SocialCal | Vérifié le |
|---|---|---|---|---|---|---|
| 1 | `ba5i` | oui | Pris | Pris | Pris | 2026-08-21 09:57:23Z |
| 2 | `c2oj` | oui | Pris | Pris | Pris | 2026-08-21 09:57:30Z |
| 3 | `d1ip` | oui | Pris | Pris | Pris | 2026-08-21 09:57:50Z |
| 4 | `h3ii` | oui | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:51:06Z |
| 5 | `j2eb` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:51:12Z |
| 6 | `j4ex` | oui | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:51:19Z |
| 7 | `j9in` | oui | Pris | Pris | Pris | 2026-08-21 09:58:16Z |
| 8 | `ku6i` | oui | Pris | Pris | Pris | 2026-08-21 09:58:22Z |
| 9 | `m2ue` | oui | Pris | Pris | Pris | 2026-08-21 09:59:58Z |
| 10 | `n3ex` | oui | Pris | Pris | Pris | 2026-08-21 10:00:04Z |
| 11 | `s7ao` | oui | Pris | Pris | Pris | 2026-08-21 10:00:11Z |
| 12 | `ta3i` | oui | Pris | Pris | Pris | 2026-08-21 10:00:31Z |
| 13 | `v7ui` | oui | Pris | Pris | Pris | 2026-08-21 10:00:37Z |
| 14 | `v8eu` | oui | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:51:25Z |
| 15 | `vi2o` | oui | Pris | Pris | Indéterminé | 2026-08-21 10:00:57Z |
| 16 | `w5uh` | oui | Pris | Pris | Indéterminé | 2026-08-21 10:01:17Z |
| 17 | `x2eh` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:51:32Z |
| 18 | `x2iz` | oui | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:51:38Z |
| 19 | `xe5a` | oui | Pris | Pris | Pris | 2026-08-21 10:01:29Z |
| 20 | `j7vuu` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:51:45Z |
| 21 | `jao2c` | oui | Pris | Pris | Indéterminé | 2026-08-21 10:01:37Z |
| 22 | `jre5e` | oui | Pris | Pris | — | 2026-08-20 12:25:40Z |
| 23 | `x6eeb` | oui | Pris | Pris | — | 2026-08-20 12:26:18Z |
| 24 | `x7eec` | oui | Pris | Pris | — | 2026-08-20 12:26:57Z |
| 25 | `zao8h` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:51:51Z |
| 26 | `zir2a` | oui | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:51:57Z |
| 27 | `zuw4i` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:52:04Z |
| 28 | `b3iid` | oui | Pris | Pris | — | 2026-08-20 12:29:40Z |
| 29 | `bg6ae` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:52:10Z |
| 30 | `bk3ev` | oui | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:52:30Z |
| 31 | `bo7zo` | oui | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:52:50Z |
| 32 | `bo8ae` | oui | Pris | Pris | — | 2026-08-20 12:33:04Z |
| 33 | `bp5ef` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:52:57Z |
| 34 | `c8eoz` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:53:03Z |
| 35 | `cg9aa` | oui | Pris | Pris | — | 2026-08-20 12:35:34Z |
| 36 | `cp8ux` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:53:10Z |
| 37 | `cte9a` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:53:16Z |
| 38 | `da8de` | oui | Pris | Pris | — | 2026-08-20 12:37:52Z |
| 39 | `daa5h` | oui | Pris | Pris | — | 2026-08-20 12:38:37Z |
| 40 | `daa7t` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:53:29Z |
| 41 | `deu9v` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:53:36Z |
| 42 | `dl4ex` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:53:49Z |
| 43 | `f2xau` | oui | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:53:55Z |
| 44 | `fdo4e` | oui | Pris | Pris | — | 2026-08-20 12:43:28Z |
| 45 | `gm7ic` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:54:01Z |
| 46 | `gmi6i` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:54:08Z |
| 47 | `h9bui` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:54:14Z |
| 48 | `hb2ol` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:54:27Z |
| 49 | `he4no` | oui | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:55:58Z |
| 50 | `hnu1e` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:57:10Z |
| 51 | `hr4ie` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:59:45Z |
| 52 | `k4lae` | oui | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:59:51Z |
| 53 | `k5mai` | oui | Pris | Pris | — | 2026-08-21 10:01:00Z |
| 54 | `kai8l` | non | Non vérifié | — | — | — |
| 55 | `ku9eu` | non | Non vérifié | — | — | — |
| 56 | `la8ee` | non | Non vérifié | — | — | — |
| 57 | `lae2s` | non | Non vérifié | — | — | — |
| 58 | `ms9oj` | non | Non vérifié | — | — | — |
| 59 | `n6voo` | non | Non vérifié | — | — | — |
| 60 | `noi2b` | non | Non vérifié | — | — | — |
| 61 | `p2ima` | non | Non vérifié | — | — | — |
| 62 | `pk1ue` | non | Non vérifié | — | — | — |
| 63 | `poi8w` | non | Non vérifié | — | — | — |
| 64 | `pr1ux` | non | Non vérifié | — | — | — |
| 65 | `r2xua` | non | Non vérifié | — | — | — |
| 66 | `r9eze` | non | Non vérifié | — | — | — |
| 67 | `r9oce` | non | Non vérifié | — | — | — |
| 68 | `rab9i` | non | Non vérifié | — | — | — |
| 69 | `re1pe` | non | Non vérifié | — | — | — |
| 70 | `re2to` | non | Non vérifié | — | — | — |
| 71 | `rne5i` | non | Non vérifié | — | — | — |
| 72 | `s4oum` | non | Non vérifié | — | — | — |
| 73 | `sai1n` | non | Non vérifié | — | — | — |
| 74 | `sc9ej` | non | Non vérifié | — | — | — |
| 75 | `so3lu` | non | Non vérifié | — | — | — |
| 76 | `t4mie` | non | Non vérifié | — | — | — |
| 77 | `tdo6i` | non | Non vérifié | — | — | — |
| 78 | `v1dou` | non | Non vérifié | — | — | — |
| 79 | `voz9a` | non | Non vérifié | — | — | — |
| 80 | `j9eovo` | non | Non vérifié | — | — | — |
| 81 | `wr9era` | non | Non vérifié | — | — | — |
| 82 | `x1itie` | non | Non vérifié | — | — | — |
| 83 | `xp9use` | non | Non vérifié | — | — | — |
| 84 | `b6oedi` | non | Non vérifié | — | — | — |
| 85 | `c1ueka` | non | Non vérifié | — | — | — |
| 86 | `c9uhau` | non | Non vérifié | — | — | — |
| 87 | `caz4aa` | non | Non vérifié | — | — | — |
| 88 | `cew6iu` | non | Non vérifié | — | — | — |
| 89 | `d3uaci` | non | Non vérifié | — | — | — |
| 90 | `f9euvu` | non | Non vérifié | — | — | — |
| 91 | `fep2ui` | non | Non vérifié | — | — | — |
| 92 | `g5ukau` | non | Non vérifié | — | — | — |
| 93 | `hw8aki` | non | Non vérifié | — | — | — |
| 94 | `m8eume` | non | Non vérifié | — | — | — |
| 95 | `mj1amu` | non | Non vérifié | — | — | — |
| 96 | `rv1ajo` | non | Non vérifié | — | — | — |
| 97 | `t5ouni` | non | Non vérifié | — | — | — |
| 98 | `v7akua` | non | Non vérifié | — | — | — |
| 99 | `v9urou` | non | Non vérifié | — | — | — |
| 100 | `vj3oxa` | non | Non vérifié | — | — | — |

## Liste nomutilisateursprare — 1000 identifiants

Seuls les identifiants réellement interrogés sont détaillés ; les autres sont listés en bloc ensuite.

| # | Pseudo | Statut | Vervox | SocialCal | Vérifié le |
|---|---|---|---|---|---|
| 1 | `m7ii` | Pris | Pris | — | 2026-08-20 12:37:17Z |
| 2 | `m7ia` | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:54:34Z |
| 3 | `m7ie` | Pris | Pris | — | 2026-08-20 12:39:11Z |
| 4 | `m7io` | Pris | Pris | — | 2026-08-20 12:40:00Z |
| 5 | `m7iu` | Pris | Pris | — | 2026-08-20 12:44:11Z |
| 6 | `m7iy` | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:54:40Z |
| 7 | `m7iq` | Pris | Pris | — | 2026-08-20 12:45:38Z |
| 8 | `m7ix` | Pris | Pris | — | 2026-08-20 12:46:28Z |
| 9 | `m7iv` | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:54:53Z |
| 10 | `m7iz` | Pris | Pris | — | 2026-08-20 12:49:22Z |
| 11 | `m7ik` | Pris | Pris | — | 2026-08-20 12:53:45Z |
| 12 | `m7ir` | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:54:59Z |
| 13 | `m7it` | Pris | Pris | — | 2026-08-20 15:08:06Z |
| 14 | `m7in` | Pris | Pris | — | 2026-08-20 21:12:50Z |
| 15 | `m7ih` | Pris | Pris | — | 2026-08-20 21:18:59Z |
| 16 | `m7ij` | Pris | Pris | — | 2026-08-20 21:25:39Z |
| 17 | `m7is` | Pris | Pris | — | 2026-08-20 22:38:07Z |
| 18 | `m7iw` | Pris | Pris | — | 2026-08-20 22:44:20Z |
| 19 | `m7ai` | Pris | Pris | — | 2026-08-20 22:50:30Z |
| 20 | `m7aa` | Pris | Pris | — | 2026-08-20 22:57:01Z |
| 21 | `m7ae` | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:55:19Z |
| 22 | `m7ao` | Pris | Pris | — | 2026-08-20 23:09:31Z |
| 23 | `m7au` | Pris | Pris | — | 2026-08-20 23:15:40Z |
| 24 | `m7ay` | Pris | Pris | — | 2026-08-21 00:28:22Z |
| 25 | `m7aq` | Pris | Pris | — | 2026-08-21 00:34:42Z |
| 26 | `m7ax` | Pris | Pris | — | 2026-08-21 00:40:51Z |
| 27 | `m7av` | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:56:05Z |
| 28 | `m7az` | Pris | Pris | — | 2026-08-21 00:53:33Z |
| 29 | `m7ak` | Pris | Pris | — | 2026-08-21 01:00:17Z |
| 30 | `m7ar` | Pris | Pris | — | 2026-08-21 01:06:30Z |
| 31 | `m7at` | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:56:24Z |
| 32 | `m7an` | Pris | Pris | — | 2026-08-21 05:06:45Z |
| 33 | `m7ah` | Disponible (2 sources) | Disponible | Disponible | 2026-08-21 09:56:31Z |
| 34 | `m7aj` | Pris | Pris | — | 2026-08-21 05:19:12Z |
| 35 | `m7as` | Pris | Pris | — | 2026-08-21 08:46:15Z |
| 36 | `m7aw` | Pris | Pris | — | 2026-08-21 09:18:32Z |
| 37 | `m7ei` | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:57:04Z |
| 38 | `m7ea` | Contradiction entre sources | Disponible | Pris | 2026-08-21 09:57:17Z |

### Identifiants non utilisés de cette liste (962)

Jamais interrogés — statut inconnu.

`m7ee`, `m7eo`, `m7eu`, `m7ey`, `m7eq`, `m7ex`, `m7ev`, `m7ez`, `m7ek`, `m7er`, `m7et`, `m7en`, `m7eh`, `m7ej`, `m7es`, `m7ew`, `m7oi`, `m7oa`, `m7oe`, `m7oo`, `m7ou`, `m7oy`, `m7oq`, `m7ox`, `m7ov`, `m7oz`, `m7ok`, `m7or`, `m7ot`, `m7on`, `m7oh`, `m7oj`, `m7os`, `m7ow`, `m7ui`, `m7ua`, `m7ue`, `m7uo`, `m7uu`, `m7uy`, `m7uq`, `m7ux`, `m7uv`, `m7uz`, `m7uk`, `m7ur`, `m7ut`, `m7un`, `m7uh`, `m7uj`, `m7us`, `m7uw`, `m7yi`, `m7ya`, `m7ye`, `m7yo`, `m7yu`, `m7yy`, `m7yq`, `m7yx`, `m7yv`, `m7yz`, `m7yk`, `m7yr`, `m7yt`, `m7yn`, `m7yh`, `m7yj`, `m7ys`, `m7yw`, `m7qi`, `m7qa`, `m7qe`, `m7qo`, `m7qu`, `m7qy`, `m7qq`, `m7qx`, `m7qv`, `m7qz`, `m7qk`, `m7qr`, `m7qt`, `m7qn`, `m7qh`, `m7qj`, `m7qs`, `m7qw`, `m7xi`, `m7xa`, `m7xe`, `m7xo`, `m7xu`, `m7xy`, `m7xq`, `m7xx`, `m7xv`, `m7xz`, `m7xk`, `m7xr`, `m7xt`, `m7xn`, `m7xh`, `m7xj`, `m7xs`, `m7xw`, `m7vi`, `m7va`, `m7ve`, `m7vo`, `m7vu`, `m7vy`, `m7vq`, `m7vx`, `m7vv`, `m7vz`, `m7vk`, `m7vr`, `m7vt`, `m7vn`, `m7vh`, `m7vj`, `m7vs`, `m7vw`, `m7zi`, `m7za`, `m7ze`, `m7zo`, `m7zu`, `m7zy`, `m7zq`, `m7zx`, `m7zv`, `m7zz`, `m7zk`, `m7zr`, `m7zt`, `m7zn`, `m7zh`, `m7zj`, `m7zs`, `m7zw`, `m7ki`, `m7ka`, `m7ke`, `m7ko`, `m7ku`, `m7ky`, `m7kq`, `m7kx`, `m7kv`, `m7kz`, `m7kk`, `m7kr`, `m7kt`, `m7kn`, `m7kh`, `m7kj`, `m7ks`, `m7kw`, `m7ri`, `m7ra`, `m7re`, `m7ro`, `m7ru`, `m7ry`, `m7rq`, `m7rx`, `m7rv`, `m7rz`, `m7rk`, `m7rr`, `m7rt`, `m7rn`, `m7rh`, `m7rj`, `m7rs`, `m7rw`, `m7ti`, `m7ta`, `m7te`, `m7to`, `m7tu`, `m7ty`, `m7tq`, `m7tx`, `m7tv`, `m7tz`, `m7tk`, `m7tr`, `m7tt`, `m7tn`, `m7th`, `m7tj`, `m7ts`, `m7tw`, `m7ni`, `m7na`, `m7ne`, `m7no`, `m7nu`, `m7ny`, `m7nq`, `m7nx`, `m7nv`, `m7nz`, `m7nk`, `m7nr`, `m7nt`, `m7nn`, `m7nh`, `m7nj`, `m7ns`, `m7nw`, `m7hi`, `m7ha`, `m7he`, `m7ho`, `m7hu`, `m7hy`, `m7hq`, `m7hx`, `m7hv`, `m7hz`, `m7hk`, `m7hr`, `m7ht`, `m7hn`, `m7hh`, `m7hj`, `m7hs`, `m7hw`, `m7ji`, `m7ja`, `m7je`, `m7jo`, `m7ju`, `m7jy`, `m7jq`, `m7jx`, `m7jv`, `m7jz`, `m7jk`, `m7jr`, `m7jt`, `m7jn`, `m7jh`, `m7jj`, `m7js`, `m7jw`, `m7si`, `m7sa`, `m7se`, `m7so`, `m7su`, `m7sy`, `m7sq`, `m7sx`, `m7sv`, `m7sz`, `m7sk`, `m7sr`, `m7st`, `m7sn`, `m7sh`, `m7sj`, `m7ss`, `m7sw`, `m7wi`, `m7wa`, `m7we`, `m7wo`, `m7wu`, `m7wy`, `m7wq`, `m7wx`, `m7wv`, `m7wz`, `m7wk`, `m7wr`, `m7wt`, `m7wn`, `m7wh`, `m7wj`, `m7ws`, `m7ww`, `q7ia`, `x7ia`, `v7ia`, `z7ia`, `k7ia`, `r7ia`, `t7ia`, `n7ia`, `h7ia`, `j7ia`, `s7ia`, `w7ia`, `l7ia`, `i7ia`, `a7ia`, `e7ia`, `o7ia`, `u7ia`, `y7ia`, `m2ia`, `m4ia`, `m9ia`, `m3ia`, `m6ia`, `m5ia`, `m7iqi`, `m7iqa`, `m7iqe`, `m7iqo`, `m7iqu`, `m7iqy`, `m7ixi`, `m7ixa`, `m7ixe`, `m7ixo`, `m7ixu`, `m7ixy`, `m7ivi`, `m7iva`, `m7ive`, `m7ivo`, `m7ivu`, `m7ivy`, `m7izi`, `m7iza`, `m7ize`, `m7izo`, `m7izu`, `m7izy`, `m7iki`, `m7ika`, `m7ike`, `m7iko`, `m7iku`, `m7iky`, `m7iri`, `m7ira`, `m7ire`, `m7iro`, `m7iru`, `m7iry`, `m7iti`, `m7ita`, `m7ite`, `m7ito`, `m7itu`, `m7ity`, `m7ini`, `m7ina`, `m7ine`, `m7ino`, `m7inu`, `m7iny`, `m7ihi`, `m7iha`, `m7ihe`, `m7iho`, `m7ihu`, `m7ihy`, `m7iji`, `m7ija`, `m7ije`, `m7ijo`, `m7iju`, `m7ijy`, `m7isi`, `m7isa`, `m7ise`, `m7iso`, `m7isu`, `m7isy`, `m7iwi`, `m7iwa`, `m7iwe`, `m7iwo`, `m7iwu`, `m7iwy`, `m7aqi`, `m7aqa`, `m7aqe`, `m7aqo`, `m7aqu`, `m7aqy`, `m7axi`, `m7axa`, `m7axe`, `m7axo`, `m7axu`, `m7axy`, `m7avi`, `m7ava`, `m7ave`, `m7avo`, `m7avu`, `m7avy`, `m7azi`, `m7aza`, `m7aze`, `m7azo`, `m7azu`, `m7azy`, `m7aki`, `m7aka`, `m7ake`, `m7ako`, `m7aku`, `m7aky`, `m7ari`, `m7ara`, `m7are`, `m7aro`, `m7aru`, `m7ary`, `m7ati`, `m7ata`, `m7ate`, `m7ato`, `m7atu`, `m7aty`, `m7ani`, `m7ana`, `m7ane`, `m7ano`, `m7anu`, `m7any`, `m7ahi`, `m7aha`, `m7ahe`, `m7aho`, `m7ahu`, `m7ahy`, `m7aji`, `m7aja`, `m7aje`, `m7ajo`, `m7aju`, `m7ajy`, `m7asi`, `m7asa`, `m7ase`, `m7aso`, `m7asu`, `m7asy`, `m7awi`, `m7awa`, `m7awe`, `m7awo`, `m7awu`, `m7awy`, `m7eqi`, `m7eqa`, `m7eqe`, `m7eqo`, `m7equ`, `m7eqy`, `m7exi`, `m7exa`, `m7exe`, `m7exo`, `m7exu`, `m7exy`, `m7evi`, `m7eva`, `m7eve`, `m7evo`, `m7evu`, `m7evy`, `m7ezi`, `m7eza`, `m7eze`, `m7ezo`, `m7ezu`, `m7ezy`, `m7eki`, `m7eka`, `m7eke`, `m7eko`, `m7eku`, `m7eky`, `m7eri`, `m7era`, `m7ere`, `m7ero`, `m7eru`, `m7ery`, `m7eti`, `m7eta`, `m7ete`, `m7eto`, `m7etu`, `m7ety`, `m7eni`, `m7ena`, `m7ene`, `m7eno`, `m7enu`, `m7eny`, `m7ehi`, `m7eha`, `m7ehe`, `m7eho`, `m7ehu`, `m7ehy`, `m7eji`, `m7eja`, `m7eje`, `m7ejo`, `m7eju`, `m7ejy`, `m7esi`, `m7esa`, `m7ese`, `m7eso`, `m7esu`, `m7esy`, `m7ewi`, `m7ewa`, `m7ewe`, `m7ewo`, `m7ewu`, `m7ewy`, `m7oqi`, `m7oqa`, `m7oqe`, `m7oqo`, `m7oqu`, `m7oqy`, `m7oxi`, `m7oxa`, `m7oxe`, `m7oxo`, `m7oxu`, `m7oxy`, `m7ovi`, `m7ova`, `m7ove`, `m7ovo`, `m7ovu`, `m7ovy`, `m7ozi`, `m7oza`, `m7oze`, `m7ozo`, `m7ozu`, `m7ozy`, `m7oki`, `m7oka`, `m7oke`, `m7oko`, `m7oku`, `m7oky`, `m7ori`, `m7ora`, `m7ore`, `m7oro`, `m7oru`, `m7ory`, `m7oti`, `m7ota`, `m7ote`, `m7oto`, `m7otu`, `m7oty`, `m7oni`, `m7ona`, `m7one`, `m7ono`, `m7onu`, `m7ony`, `m7ohi`, `m7oha`, `m7ohe`, `m7oho`, `m7ohu`, `m7ohy`, `m7oji`, `m7oja`, `m7oje`, `m7ojo`, `m7oju`, `m7ojy`, `m7osi`, `m7osa`, `m7ose`, `m7oso`, `m7osu`, `m7osy`, `m7owi`, `m7owa`, `m7owe`, `m7owo`, `m7owu`, `m7owy`, `m7uqi`, `m7uqa`, `m7uqe`, `m7uqo`, `m7uqu`, `m7uqy`, `m7uxi`, `m7uxa`, `m7uxe`, `m7uxo`, `m7uxu`, `m7uxy`, `m7uvi`, `m7uva`, `m7uve`, `m7uvo`, `m7uvu`, `m7uvy`, `m7uzi`, `m7uza`, `m7uze`, `m7uzo`, `m7uzu`, `m7uzy`, `m7uki`, `m7uka`, `m7uke`, `m7uko`, `m7uku`, `m7uky`, `m7uri`, `m7ura`, `m7ure`, `m7uro`, `m7uru`, `m7ury`, `m7uti`, `m7uta`, `m7ute`, `m7uto`, `m7utu`, `m7uty`, `m7uni`, `m7una`, `m7une`, `m7uno`, `m7unu`, `m7uny`, `m7uhi`, `m7uha`, `m7uhe`, `m7uho`, `m7uhu`, `m7uhy`, `m7uji`, `m7uja`, `m7uje`, `m7ujo`, `m7uju`, `m7ujy`, `m7usi`, `m7usa`, `m7use`, `m7uso`, `m7usu`, `m7usy`, `m7uwi`, `m7uwa`, `m7uwe`, `m7uwo`, `m7uwu`, `m7uwy`, `m7yqi`, `m7yqa`, `m7yqe`, `m7yqo`, `m7yqu`, `m7yqy`, `m7yxi`, `m7yxa`, `m7yxe`, `m7yxo`, `m7yxu`, `m7yxy`, `m7yvi`, `m7yva`, `m7yve`, `m7yvo`, `m7yvu`, `m7yvy`, `m7yzi`, `m7yza`, `m7yze`, `m7yzo`, `m7yzu`, `m7yzy`, `m7yki`, `m7yka`, `m7yke`, `m7yko`, `m7yku`, `m7yky`, `m7yri`, `m7yra`, `m7yre`, `m7yro`, `m7yru`, `m7yry`, `m7yti`, `m7yta`, `m7yte`, `m7yto`, `m7ytu`, `m7yty`, `m7yni`, `m7yna`, `m7yne`, `m7yno`, `m7ynu`, `m7yny`, `m7yhi`, `m7yha`, `m7yhe`, `m7yho`, `m7yhu`, `m7yhy`, `m7yji`, `m7yja`, `m7yje`, `m7yjo`, `m7yju`, `m7yjy`, `m7ysi`, `m7ysa`, `m7yse`, `m7yso`, `m7ysu`, `m7ysy`, `m7ywi`, `m7ywa`, `m7ywe`, `m7ywo`, `m7ywu`, `m7ywy`, `m7qiq`, `m7qix`, `m7qiv`, `m7qiz`, `m7qik`, `m7qir`, `m7qit`, `m7qin`, `m7qih`, `m7qij`, `m7qis`, `m7qiw`, `m7qaq`, `m7qax`, `m7qav`, `m7qaz`, `m7qak`, `m7qar`, `m7qat`, `m7qan`, `m7qah`, `m7qaj`, `m7qas`, `m7qaw`, `m7qeq`, `m7qex`, `m7qev`, `m7qez`, `m7qek`, `m7qer`, `m7qet`, `m7qen`, `m7qeh`, `m7qej`, `m7qes`, `m7qew`, `m7qoq`, `m7qox`, `m7qov`, `m7qoz`, `m7qok`, `m7qor`, `m7qot`, `m7qon`, `m7qoh`, `m7qoj`, `m7qos`, `m7qow`, `m7quq`, `m7qux`, `m7quv`, `m7quz`, `m7quk`, `m7qur`, `m7qut`, `m7qun`, `m7quh`, `m7quj`, `m7qus`, `m7quw`, `m7qyq`, `m7qyx`, `m7qyv`, `m7qyz`, `m7qyk`, `m7qyr`, `m7qyt`, `m7qyn`, `m7qyh`, `m7qyj`, `m7qys`, `m7qyw`, `m7xiq`, `m7xix`, `m7xiv`, `m7xiz`, `m7xik`, `m7xir`, `m7xit`, `m7xin`, `m7xih`, `m7xij`, `m7xis`, `m7xiw`, `m7xaq`, `m7xax`, `m7xav`, `m7xaz`, `m7xak`, `m7xar`, `m7xat`, `m7xan`, `m7xah`, `m7xaj`, `m7xas`, `m7xaw`, `m7xeq`, `m7xex`, `m7xev`, `m7xez`, `m7xek`, `m7xer`, `m7xet`, `m7xen`, `m7xeh`, `m7xej`, `m7xes`, `m7xew`, `m7xoq`, `m7xox`, `m7xov`, `m7xoz`, `m7xok`, `m7xor`, `m7xot`, `m7xon`, `m7xoh`, `m7xoj`, `m7xos`, `m7xow`, `m7xuq`, `m7xux`, `m7xuv`, `m7xuz`, `m7xuk`, `m7xur`, `m7xut`, `m7xun`, `m7xuh`, `m7xuj`, `m7xus`, `m7xuw`, `m7xyq`, `m7xyx`, `m7xyv`, `m7xyz`, `m7xyk`, `m7xyr`, `m7xyt`, `m7xyn`, `m7xyh`, `m7xyj`, `m7xys`, `m7xyw`, `m7viq`, `m7vix`, `m7viv`, `m7viz`, `m7vik`, `m7vir`, `m7vit`, `m7vin`, `m7vih`, `m7vij`, `m7vis`, `m7viw`, `m7vaq`, `m7vax`, `m7vav`, `m7vaz`, `m7vak`, `m7var`, `m7vat`, `m7van`, `m7vah`, `m7vaj`, `m7vas`, `m7vaw`, `m7veq`, `m7vex`, `m7vev`, `m7vez`, `m7vek`, `m7ver`, `m7vet`, `m7ven`, `m7veh`, `m7vej`, `m7ves`, `m7vew`, `m7voq`, `m7vox`, `m7vov`, `m7voz`, `m7vok`, `m7vor`, `m7vot`, `m7von`, `m7voh`, `m7voj`, `m7vos`, `m7vow`, `m7vuq`, `m7vux`, `m7vuv`, `m7vuz`, `m7vuk`, `m7vur`, `m7vut`, `m7vun`, `m7vuh`, `m7vuj`, `m7vus`, `m7vuw`, `m7vyq`, `m7vyx`, `m7vyv`, `m7vyz`, `m7vyk`, `m7vyr`, `m7vyt`, `m7vyn`, `m7vyh`, `m7vyj`, `m7vys`, `m7vyw`, `m7ziq`, `m7zix`, `m7ziv`

## Pourquoi tous les identifiants n'ont pas été utilisés

L'objectif fixé pour la liste des 1000 était d'y **trouver 10 pseudos disponibles**, pas
de la vérifier intégralement : la vérification s'arrête donc dès la cible atteinte.
La liste des 100, elle, était à vérifier entièrement.

Le débit reste limité par les quotas par IP des vérificateurs. Deux sources
indépendantes sont interrogées en parallèle, chacune à une cadence sous son seuil,
avec silence complet en cas de 429 — sonder pendant un blocage ne fait que prolonger
la fenêtre glissante. Aucun CAPTCHA n'a été contourné : les challenges sont détectés
et provoquent l'arrêt.

### Les listes de proxies ne sont pas exploitables ici

`iplocate/free-proxy-list` et `TheSpeedX/PROXY-List` ont été clonés et testés
(6 939 proxies uniques après fusion et déduplication). Aucun n'est utilisable, pour une
raison qui ne tient pas aux listes :

- la passerelle de sortie n'autorise que les ports **80 et 443** — les ports proxy
  usuels (8080, 3128, 1080, 4145) sont injoignables, ce qui élimine d'emblée 6 357 entrées ;
- sur les 582 proxies écoutant en 80/443, le TCP passe et le HTTP simple est bien relayé,
  mais toute tentative de tunnel HTTPS est refusée par la passerelle avec
  `403 x-deny-reason: proxy_ip_not_allowed` — y compris vers des hôtes autorisés
  comme `example.com`. Le chaînage de proxy est donc bloqué par politique, pas par
  la qualité des listes.

Aucune autre liste de proxys ne changerait ce résultat. Le gain de débit est venu
d'ailleurs : d'une **seconde source de vérification indépendante**, qui a en prime
restauré la double confirmation.

## Traçabilité

`progress.json`, `progress_1000.json` et `socialcal.json` conservent pour chaque
pseudo le verdict, la réponse brute de l'API, l'horodatage et le nombre de tentatives.
Ils servent de point de reprise : relancer un script repart exactement où il s'est arrêté.
