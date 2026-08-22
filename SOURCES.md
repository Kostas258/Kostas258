# Sources de vérification — ce qui marche, ce qui ne marche pas

Testé depuis cet environnement, le 21 et le 22 août 2026. Chaque verdict vient
d'une mesure, pas d'une lecture de page marketing. Le but de ce document est
d'éviter de retester ce qui a déjà échoué.

## Utilisables

| Source | Appel | État |
|---|---|---|
| socialcal.app | `POST socialcal-media-proxy.jan-orsula1.workers.dev/username/check` | source principale, quota large, renvoie un niveau de confiance |
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
