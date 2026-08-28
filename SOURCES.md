# Sources de vérification — ce qui marche, ce qui ne marche pas

Testé depuis cet environnement, le 21 et le 22 août 2026. Chaque verdict vient
d'une mesure, pas d'une lecture de page marketing. Le but de ce document est
d'éviter de retester ce qui a déjà échoué.

## Utilisables

| Source | Appel | État |
|---|---|---|
| socialcal.app | `POST socialcal-media-proxy.jan-orsula1.workers.dev/username/check` | source principale, quota large, renvoie un niveau de confiance. **Son amont a récupéré le 28/08** après s'être épuisé le 23/08 : sonde sur `jao2c` → `taken`/`high`, non caché. Les 174 « unknown » du 23/08 étaient des victimes de la panne, pas des cas durs — `RETRY_UNKNOWN=1` les remet dans la file. |
| vervox.app | `POST vervox.app/api/tools/username-check` | corroboration seulement — sur-déclare la disponibilité, quota très restrictif |

## Écartées après mesure

| Source | Raison |
|---|---|
| namecheckly.com | `/api/check` répond, mais renvoie « pris » pour **tout**, y compris un pseudo témoin certainement libre. Prétend même que `github.com/zqv7xkq9wzqjj4` existe. Aurait injecté de faux « pris ». |
| brandsnag.com | 35/35 réponses indéterminées, y compris sur `instagram`, `nike`, `cristiano`. |
| dnsrobot.net | Interroge Instagram en direct, donc le meilleur arbitre possible — mais son quota Instagram n'a jamais ouvert : 12 tours sur 3 h 30 puis 3 tours de plus, 0 arbitrage sur 15 conflits. Renvoie honnêtement `available:null`. |
| hopperhq.com | Le seul endpoint exposé, `/api/user/register-check`, est un validateur d'e-mail : renvoie `{"validEmail":false}` quel que soit le pseudo. |
| handle.tools, theblue.social | Rejettent les POST sur **tous** les chemins, y compris absurdes (405/403 partout). Pas d'API publique. |
| namecheckerai.com | Sert sa page SPA sur tous les chemins `/api/*`. Pas d'API. |
| instantusername.com, namechk.com, dnschecker.org | Interstitiel Cloudflare « Just a moment… ». Détecté, jamais contourné. |
| knowem.com | Injoignable (aucune réponse). |
| beplan.io, poster.ly | Aucune API exposée dans la page. |
| creatorsjet, outfame, upgrow, tacticsocial, aidelly, bulkoid, tareno, contentrabbit, adaptlypost, instantnamechecker, creatorflow, instausername, post-bridge | Aucun endpoint JSON trouvé : applications React/Next dont la vérification passe par une *server action*, non appelable sans navigateur. |

## Recherche d'une troisième source — 28/08

Le critère de tri n'est pas « service tiers ou non ». socialcal et vervox sont
eux-mêmes des services tiers qui résolvent depuis leur propre infrastructure :
appliquer ce critère supprimerait les deux sources du projet. La ligne est entre
un **vérificateur public qui expose une API** — même classe que nos sources — et
un **service dont le produit est la rotation d'IP**, qui sert d'IP de rebond pour
contourner un blocage visant cette adresse.

| Candidate | Mesure | Verdict |
|---|---|---|
| **domscan.net** `GET /v1/social?handle=` | Hôte **joignable** à travers la passerelle. Les trois témoins (`instagram`, `zqv7xkq9wzqjj4`, `m7yy`) renvoient le même `401 AUTH_REQUIRED`. | Rejetée **en l'état**, pas sur le fond : c'est une vraie API serveur, correctement gatée. Redeviendrait testable avec une clé (compte à créer par l'utilisateur, pas par l'agent). |
| **platformhandlechecker.com** | Page en 200, mais aucune API serveur : le JS construit `instagram.com/${n}` et le récupère **depuis le navigateur** du visiteur. | Rejetée deux fois : voie navigateur fermée ici, et cible l'hôte bloqué depuis cette IP. |
| Apify, Zyla, Bright Data, HikerAPI, SearchAPI | Non testées, et c'est volontaire. Ce sont des marketplaces de scraping dont le service vendu est précisément le pool d'IP. Les appeler reviendrait à louer l'IP de rebond refusée ailleurs. | Écartées sur le critère, sans dépense de requête. |

Aucune troisième source retenue. Le couple socialcal + vervox reste le dispositif
complet, et les indéterminés restent indéterminés.

### Revue complète par familles — 28/08

Neuf familles, dix-neuf candidates. Aucune retenue. Le tableau existe pour que
la prochaine session ne refasse pas le tour.

| Famille | Candidates | Mesure | Verdict |
|---|---|---|---|
| **Vérificateurs à API HTTP** | socialcal, vervox | en service | les deux seules qui marchent |
| | domscan.net | joignable ; 401 `AUTH_REQUIRED` sur 3 témoins ; 10 000 crédits/mois gratuits **mais Instagram absent de sa liste de plateformes** | rejetée : ne couvre pas la cible |
| | namecheckly | « pris » pour tout, y compris un témoin certainement libre | rejetée : fabriquerait de faux « pris » |
| | brandsnag | 35/35 indéterminés, y compris `instagram`, `nike` | hors service |
| | hopperhq | seul endpoint = validateur d'e-mail | pas d'API de disponibilité |
| | namecheckup, namecheck.com | pages en 200, **404 sur tous les chemins d'API testés** | pas d'API publique |
| | platformhandlechecker | JS client qui fetch `instagram.com` depuis le navigateur | voie fermée ici, hôte bloqué |
| | instantusername, namechk, dnschecker | interstitiel Cloudflare (403) | détecté, jamais contourné |
| | theblue.social, handle.tools | 405/403 sur tous chemins | pas d'API |
| **Marketplaces / pools d'IP** | Apify, Zyla, Bright Data, HikerAPI, ScraperAPI, UnifAPI | non testées, volontairement | ce qu'elles vendent est l'accès depuis *leurs* IP : louer le rebond refusé ailleurs, et facturé au record |
| **API officielle** | Instagram Graph API | aucun endpoint de disponibilité de pseudo | inexistante |
| **Archives** | Wayback | retenue en contre-épreuve ; **0 archive sur 171 orphelins** | valide en audit, sans rendement ici |
| | Common Crawl, archive.today | hors liste blanche de la passerelle (échec TLS) | injoignables |
| **Plateforme sœur** | Threads | signal instable, voir ci-dessous | rejetée |
| **OSINT auto-hébergé** | sherlock, maigret, socialscan, WhatsMyName/Naminter | tous vers `instagram.com` : 302 / 429 / 401 mesurés le 28/08 | le verrou est l'IP, pas l'outil |
| **Moteurs de recherche** | DuckDuckGo, Google, Bing | correspondances approchantes : `m7iy` remonte `m7iy_` | dangereuse : produirait de faux « pris » |
| **Jeux de données** | Kaggle « 650 000 Instagram user info » | statique et daté | prouverait « pris » à une date passée, jamais « libre » |
| **DNS / arbitre direct** | dnsrobot | interroge Instagram en direct — le meilleur arbitre possible — mais son quota ne s'est jamais ouvert : 15 tours, 0 arbitrage | à retenter, gratuit |

**Pourquoi c'est structurel.** La seule information sur la disponibilité d'un
pseudo Instagram vient d'Instagram. Toute « source » est donc soit un revendeur
d'accès Instagram depuis d'autres IP (payant, et c'est le rebond refusé), soit un
service cassé ou qui invente, soit un service qui ne couvre pas Instagram. La
frontière entre « vérificateur public » et « proxy de scraping » est d'ailleurs
mince : socialcal et vervox interrogent bien Instagram depuis leur propre
infrastructure. Ce qui les distingue en pratique est qu'ils sont gratuits, sans
compte, dédiés à la disponibilité, et déjà mesurés ici sur plus de mille pseudos.

### Threads réexaminé le 28/08 — négatif, et instructif

Threads partage le namespace d'Instagram : le handle Threads **est** le handle
Instagram, édité depuis Instagram. La piste méritait donc mieux qu'un coup d'oeil
au code HTTP, et une première sonde a semblé la valider :

| Témoin | URL finale | Titre |
|---|---|---|
| `instagram` (pris) | `/@instagram` | `Instagram (@instagram) • Threads` |
| `zqv7xkq9wzqjj4` (libre) | **`/login/`** | `Threads • Log in` |
| `m7yy` (indéterminé) | `/@m7yy` | `M (@m7yy) • Threads` |

Trois témoins, trois comportements distincts : le protocole passait. **Il avait
tort.** Deux mesures l'ont démoli :

1. **À l'échelle.** 20 pseudos — 10 que nos deux sources donnent pris, 10 qu'elles
   donnent libres — ont tous redirigé vers `/login`. Un signal qui répond pareil
   aux deux populations ne sépare rien.
2. **Dans le temps.** `m7eta` a répondu `/login` puis `/@m7eta` à dix minutes
   d'intervalle. Espacés à 8 s, les mêmes pseudos répondent tous `profil`,
   titre `Threads`, y compris le témoin certainement libre. Groupés à 3 s, tous
   répondent `login`.

La redirection vers `/login` mesure donc **notre débit de requêtes**, pas le
pseudo. Une source dont la réponse dépend de la cadence et non de la question ne
peut fonder aucun verdict, et le piège est qu'elle produit d'abord des résultats
parfaitement cohérents.

À retenir pour la prochaine piste : trois témoins ne suffisent pas. Il faut aussi
**le même témoin plusieurs fois, espacé**, et **les deux populations déjà
tranchées**. Un signal se juge sur sa stabilité autant que sur sa netteté.

## Pourquoi la voie navigateur est fermée

Chromium est bien présent (`/opt/pw-browsers/chromium-1194`), et `playwright-core`
s'installe sans problème. Mais le navigateur ne joint **rien** à travers la
passerelle de cette session, y compris `example.com` :
`net::ERR_CONNECTION_RESET`, avec ou sans `proxy:` explicite. Ce n'est donc pas
un site qui refuse, c'est global.

Conséquence : tous les vérificateurs qui n'existent qu'en navigateur sont hors
d'atteinte ici, quel que soit leur intérêt annoncé. `scripts/sniff.js` est
conservé — il écoute le trafic d'une page pour découvrir l'API derrière elle, et
redeviendra utile dans un environnement où le navigateur sort.

## Instagram en direct

Inaccessible depuis cette IP : 302 vers le mur de connexion sur les profils,
429 sur l'API d'inscription. C'est pour cette raison que sherlock, maigret et
socialscan échouent tous de la même façon — le verrou est l'adresse IP, pas
l'outil.

## Pistes testées le 24/08 — toutes fermées

| Piste | Résultat |
|---|---|
| Wayback (archive.org) | **retenue** : une archive prouve un pseudo pris. Audit des 147 confirmés → 0 contredit. Attention, 429 après ~150 requêtes : espacer. |
| Wayback sur les **non tranchés** (28/08, `scripts/wayback_orphans.js`) | **sans rendement** : 171/171 interrogés, **0 archive**, 0 erreur. L'idée était de trancher des orphelins sans dépenser de requête vervox ; le crawler d'archive.org ne visite qu'une frange populaire d'Instagram et n'a jamais vu ces pseudos de 4–5 caractères. Le script est conservé — il ne coûte rien et resterait valable sur une liste de pseudos notoires — mais ne pas en attendre d'accélération ici. |
| Threads (`threads.com/@user`) | 200 pour tout, aucun signal. **Réexaminé le 28/08 et confirmé négatif** — voir ci-dessous, la piste avait l'air prometteuse et ne l'était pas. |
| Common Crawl | hôte hors liste blanche de la passerelle (échec TLS) |
| archive.today | idem |
| DuckDuckGo direct | idem |
| Moteurs de recherche | **dangereux** : renvoient des correspondances approchantes. Une recherche sur `m7iy` remonte `m7iy_`, un autre pseudo. Lu sans attention, cela produirait de faux « pris ». |
| Instagram signup + CSRF | 429 |
| Instagram récupération de compte | écarté : enverrait de vrais messages à de vraies personnes |
