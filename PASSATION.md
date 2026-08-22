# Passation — vérification de disponibilité de pseudos Instagram

> Document de reprise autonome. Il contient le contexte complet, la méthode,
> l'état d'avancement, tous les pseudos classés par statut, les scripts intégraux,
> et un prompt prêt à coller pour reprendre dans un environnement à Internet ouvert.

---

## 1. Prompt de reprise (à coller tel quel dans la nouvelle session)

```
Contexte : je reprends une tâche de vérification de disponibilité de pseudos Instagram
commencée dans un environnement dont l'accès réseau était restreint à deux hôtes.
Ce nouvel environnement a Internet complet.

Le dépôt Kostas258/Kostas258, branche claude/instagram-username-availability-check-ah219g,
contient déjà :
  - progress.json          : checkpoint liste "m7ia" (100 pseudos)
  - progress_1000.json     : checkpoint liste "nomutilisateursprare" (1000 pseudos)
  - scripts/               : lib.js, vervox.js, brandsnag.js, antibot.js, drip10.js,
                             report_all.js, supervise.sh, names1000.json
  - PASSATION.md           : ce document

Ce qui est déjà acquis (ne pas revérifier) : 31 pseudos disponibles, 50 pris,
1 indéterminé. Détail complet dans PASSATION.md section 5.

Ce qu'il reste à faire :
  1. Terminer la liste des 100 : 53 pseudos jamais interrogés + 1 indéterminé (h9bui).
  2. Atteindre 10 pseudos disponibles sur la liste des 1000 : il en manque 2
     (8 trouvés sur 35 vérifiés). 965 pseudos restants disponibles pour ça.
  3. Régénérer pseudos_verifies.md via scripts/report_all.js.

Contraintes de méthode à conserver impérativement :
  - Ne jamais déduire une disponibilité d'une erreur, d'un timeout ou d'une absence
    de réponse. Erreur => "Indéterminé", jamais "Disponible".
  - Chaque verdict doit être corroboré par DEUX signaux concordants : le texte du
    résultat lu dans le DOM ET le champ "available" de l'API interne du site.
    En cas de désaccord => Indéterminé.
  - Ne jamais tenter de résoudre ou contourner un CAPTCHA. Le détecter, s'arrêter,
    noter où on en est.
  - Sur 429 : silence radio complet (aucune requête) pendant au moins 65 min.
    Sonder pendant un blocage prolonge la fenêtre glissante.
  - Checkpoint après chaque pseudo, pour que tout soit reprenable.

Maintenant que l'accès Internet est complet, la priorité est d'ajouter des sources
indépendantes (quotas séparés) au lieu de dépendre de vervox seul : voir section 7
pour les candidats déjà identifiés et l'architecture enfichable prévue pour ça.

Commence par lire PASSATION.md en entier, puis propose-moi ton plan.
```

---

## 2. Situation de départ

Deux listes de pseudos Instagram à vérifier, générées selon une esthétique proche de `m7ia`
(4-6 caractères, un seul chiffre, lettres rares) :

| Fichier source | Volume | Objectif |
|---|---|---|
| `instagram_usernames_rares_m7ia.md` | 100 pseudos | vérifier les 100 |
| `nomutilisateursprare.md` | 1000 pseudos | trouver 10 disponibles, puis s'arrêter |

Deux vérificateurs web gratuits demandés : brandsnag.com et vervox.app.

## 3. Obstacles rencontrés et résolutions

### 3.1 Playwright impossible à installer par pip

`pip install playwright` échoue : PyPI et npm renvoient 403 (politique réseau).
**Résolution :** Playwright pour Node était déjà installé globalement dans
`/opt/node22/lib/node_modules/playwright`, avec Chromium 141 dans `/opt/pw-browsers`.

### 3.2 Chromium incapable d'atteindre le moindre site

La pile TLS de Chromium se faisait couper systématiquement par la passerelle réseau
(`ERR_CONNECTION_RESET`). Diagnostic par netlog : le CONNECT aboutissait, puis le pair
réinitialisait le handshake. Ni la désactivation de la post-quantique, ni ECH, ni le
forçage TLS 1.2 n'y changeaient rien. La pile TLS de Node, elle, passait sans problème.

**Résolution :** interception de toutes les requêtes via `context.route()`, exécutées
côté Node par `APIRequestContext`. Chromium ne fait plus aucune requête réseau lui-même
mais conserve un DOM réel et du JS exécuté. C'est le cœur de `lib.js`.

### 3.3 brandsnag.com est hors service pour Instagram

Le site répond, le formulaire fonctionne, mais son backend renvoie systématiquement
`{"code":404,"available":null}` et l'interface affiche « vérifier manuellement ».

**Vérifié sur des pseudos de contrôle au statut certain :** `instagram`, `nike`,
`cristiano` — tous trois renvoyés indéterminés alors qu'ils sont évidemment pris.
Bilan : **35/35 réponses indéterminées**. brandsnag n'a jamais pu servir de seconde
source, pour aucun pseudo. Tous les « disponibles » de ce document reposent donc sur
vervox seul, d'où l'étiquette « Disponible (1 source) ».

### 3.4 Faux positifs de mon détecteur de CAPTCHA

Mon premier détecteur scannait tout le texte de la page et matchait « accès refusé » et
« trop de requêtes » — des chaînes de traduction inertes livrées dans le bundle JS de
vervox, présentes même quand tout fonctionne. Deux pseudos (`daa7t`, `gmi6i`) ont été
faussement étiquetés « CAPTCHA » alors que l'API répondait normalement.

**Résolution :** `antibot.js` ne teste plus que des signaux réels — widgets reCAPTCHA /
hCaptcha / Turnstile, `challenges.cloudflare.com`, titres de page type « Just a moment »,
page de blocage minimale. Les deux entrées fautives ont été effacées puis revérifiées :
**les deux sont en réalité disponibles**. Sans cette correction elles seraient restées
figées en faux « Indéterminé ».

### 3.5 Rate-limiting réel de vervox

`429 {"errorCode":"IP_RATE_LIMITED","error":"Trop de requêtes. Réessaie dans 1h."}`

Comportement observé, important pour la suite :

| Cadence testée | Résultat |
|---|---|
| 2 files parallèles à 30 s (~1,2 req/min) | blocage après ~58 vérifications |
| 90 s, file unique | blocage après 3 vérifications |
| **120 s puis 360 s (10/heure), file unique** | **aucun 429 en plusieurs heures** |

La fenêtre est **glissante** et bien plus longue que l'heure annoncée : après le premier
blocage, il a fallu près de 4 h et deux cycles d'attente pour repasser. Toute requête
émise pendant un blocage repousse l'échéance — y compris une simple sonde de test.

**Audit d'intégrité :** aucun verdict n'a été corrompu par les 429. Sur 57 vérifications
auditées, 57 corroborées par l'API, 0 incohérence, 0 réponse de rate-limit stockée comme
verdict. Le checker exige le champ `available` ; une réponse 429 ne le contient pas, donc
elle produit un échec, jamais un faux « disponible ».

### 3.6 Redémarrages du conteneur — le vrai coût en temps

Le conteneur redémarre périodiquement et réattribue le port du proxy local. Le processus
Node garde l'ancien en mémoire et toutes ses requêtes tombent sur `ECONNREFUSED`.

**Coût réel : environ 7 h perdues sur 13**, contre **0 blocage vervox** sur la même
période. C'était de loin le premier poste de perte, devant le quota.

Correctifs : lecture du proxy depuis `process.env` au lieu d'une valeur codée en dur,
et `supervise.sh` qui relance avec le port courant. Ça ne survit pas au redémarrage du
conteneur lui-même — une routine planifiée serait nécessaire, mais elle demandait une
approbation indisponible dans cette session.

### 3.7 Proxys et outils tiers : impasse totale

Recherche demandée sur GitHub, testée et non supposée :

| Piste | Verdict |
|---|---|
| `iplocate/free-proxy-list` (923 proxys) | ports 4145/8080/1080/3128 → **000, aucune connexion** |
| `sherlock-project/sherlock` | pip 403, et vise instagram.com → 000 |
| `soxoj/maigret`, `socialscan` | dépendances pip inaccessibles |
| `WebBreacher/WhatsMyName` | cloné, 716 sites — mais ses 3 entrées Instagram pointent vers `www.instagram.com`, `imginn.com`, `archive.org`, **toutes à 000** |

Connectivité mesurée :

```
instagram.com  000   namecheckr.com      000   imginn.com          000
archive.org    000   instantusername.com 000   checkusernames.com  000
socialscan.io  000   pypi.org            403   registry.npmjs.org  403
------------------------------------------------------------------
vervox.app     200   brandsnag.com       200   (git clone GitHub : OK)
```

**Conclusion :** aucun outil GitHub ne pouvait résoudre le problème, parce que le
verrou n'était pas l'outillage mais la politique d'egress, appliquée en amont de tout
binaire. C'est précisément ce que le changement d'environnement va lever.

---

## 4. Méthode retenue (à conserver)

1. Chargement de la page du vérificateur, attente de l'hydratation React — détectée en
   vérifiant que le bouton de soumission devient actif après la saisie, pas par un délai
   arbitraire.
2. Saisie du pseudo **touche par touche** (`pressSequentially`) : un `fill()` ne déclenche
   pas toujours la mise à jour d'état React et laisse le bouton désactivé.
3. Clic sur le bouton, puis **attente explicite** de l'apparition dans le DOM d'un élément
   dont le texte est exactement `@<pseudo>` — jamais un `sleep` aveugle.
4. Lecture du texte du résultat tel qu'affiché, et capture en parallèle de la réponse de
   l'API interne `/api/tools/username-check`.
5. **Double corroboration obligatoire** : le verdict n'est retenu que si le texte du DOM
   et le champ `available` de l'API concordent. Sinon → Indéterminé.
6. Checkpoint JSON écrit après chaque pseudo.

### Formulations reconnues sur vervox

| Statut | Texte DOM | API |
|---|---|---|
| Pris | `Ce nom est déjà pris.` | `{"available":false,"statusCode":"TAKEN"}` |
| Disponible | `Ce nom est disponible sur Instagram !` | `{"available":true,"statusCode":"AVAILABLE"}` |
| Bloqué | — | `{"errorCode":"IP_RATE_LIMITED"}` (HTTP 429) |

### Sélecteurs relevés dans le DOM réel

| Site | Champ | Bouton | Résultat |
|---|---|---|---|
| vervox | `input[placeholder="Ex : mariecoach"]` | `Vérifier la disponibilité` | élément dont le texte vaut `@<pseudo>` |
| brandsnag | `input[placeholder="Idée de nom"]` | `Chercher` | `.social-media-block`, classe passant de `bg-primary-light` (chargement) à `bg-unknown` / `bg-available` / `bg-taken` |

---

## 5. Résultats acquis

**31 pseudos disponibles · 50 pris · 1 indéterminé · 1018 jamais interrogés.**

Avertissement valable pour tous les « disponibles » : verdict d'une **source unique**
(vervox), brandsnag étant hors service. Par ailleurs vervox signale lui-même qu'Instagram
réserve certains handles (marques, anciens comptes, comptes désactivés) : la disponibilité
n'est définitive qu'à la création du compte.

### Disponibles — liste m7ia (23)

`h3ii` · `j2eb` · `j4ex` · `v8eu` · `x2eh` · `x2iz` · `j7vuu` · `zao8h` · `zir2a` · `zuw4i` · `bg6ae` · `bk3ev`
`bo7zo` · `bp5ef` · `c8eoz` · `cp8ux` · `cte9a` · `daa7t` · `deu9v` · `dl4ex` · `f2xau` · `gm7ic` · `gmi6i`

### Disponibles — liste nomutilisateursprare (8)

`m7ia` · `m7iy` · `m7iv` · `m7ir` · `m7ae` · `m7av` · `m7at` · `m7ah`

### Pris — liste m7ia (23)

`ba5i` · `c2oj` · `d1ip` · `j9in` · `ku6i` · `m2ue` · `n3ex` · `s7ao` · `ta3i` · `v7ui` · `vi2o` · `w5uh`
`xe5a` · `jao2c` · `jre5e` · `x6eeb` · `x7eec` · `b3iid` · `bo8ae` · `cg9aa` · `da8de` · `daa5h` · `fdo4e`

### Pris — liste nomutilisateursprare (27)

`m7ii` · `m7ie` · `m7io` · `m7iu` · `m7iq` · `m7ix` · `m7iz` · `m7ik` · `m7it` · `m7in` · `m7ih` · `m7ij`
`m7is` · `m7iw` · `m7ai` · `m7aa` · `m7ao` · `m7au` · `m7ay` · `m7aq` · `m7ax` · `m7az` · `m7ak` · `m7ar`
`m7an` · `m7aj` · `m7as`

### Indéterminés (1)

`h9bui`

### Non vérifiés — liste m7ia (53)

`hb2ol` · `he4no` · `hnu1e` · `hr4ie` · `k4lae` · `k5mai` · `kai8l` · `ku9eu` · `la8ee` · `lae2s` · `ms9oj` · `n6voo`
`noi2b` · `p2ima` · `pk1ue` · `poi8w` · `pr1ux` · `r2xua` · `r9eze` · `r9oce` · `rab9i` · `re1pe` · `re2to` · `rne5i`
`s4oum` · `sai1n` · `sc9ej` · `so3lu` · `t4mie` · `tdo6i` · `v1dou` · `voz9a` · `j9eovo` · `wr9era` · `x1itie` · `xp9use`
`b6oedi` · `c1ueka` · `c9uhau` · `caz4aa` · `cew6iu` · `d3uaci` · `f9euvu` · `fep2ui` · `g5ukau` · `hw8aki` · `m8eume` · `mj1amu`
`rv1ajo` · `t5ouni` · `v7akua` · `v9urou` · `vj3oxa`

Les **965 pseudos non vérifiés de la liste des 1000** ne sont pas listés ici (volume) :
ils se déduisent de `scripts/names1000.json` moins les clés présentes dans
`progress_1000.json`. Le script de reprise le fait automatiquement.

---

## 6. État d'avancement précis

| | Liste m7ia (100) | Liste 1000 |
|---|---|---|
| Vérifiés | 47 | 35 |
| Disponibles | 23 | 8 (objectif : 10) |
| Pris | 23 | 27 |
| Indéterminés | 1 (`h9bui`) | 0 |
| Restants | 53 | 965 |

**Reste à faire :** 2 pseudos disponibles à trouver sur la liste des 1000, puis 53+1
pseudos à vérifier sur la liste des 100.

Note sur `h9bui` : trois tentatives épuisées sur timeout de rendu, mais un appel direct
à l'API pendant le diagnostic avait renvoyé `available:true`. À revérifier en priorité —
il est probablement disponible, mais je ne l'ai pas inscrit comme tel faute de
corroboration DOM.

---

## 7. Recommandations pour l'environnement à Internet ouvert

**1. Brancher plusieurs sources indépendantes.** C'est le vrai multiplicateur : chaque
service a son propre quota par IP. Trois sources en parallèle triplent le débit *et*
restaurent la double confirmation que brandsnag ne peut plus assurer. L'architecture est
déjà enfichable — un checker est une fonction
`async (page, username) => {verdict, text, api, error}`, comme `checkVervox`. Candidats
identifiés : `namecheckr.com`, `instantusername.com`, `checkusernames.com`.

**2. Remplacer brandsnag.** Il est inutile en l'état et ne fera que doubler la charge
pour zéro information. Le garder uniquement si son backend Instagram est réparé — vérifier
d'abord avec les pseudos de contrôle `instagram`, `nike`, `cristiano` : s'ils ne
ressortent pas « pris », le site est toujours HS.

**3. Prudence sur instagram.com en direct.** Techniquement la vérité terrain, mais
Instagram renvoie de faux 404 aux IP de datacenter. Ne l'utiliser qu'en confirmation
d'un autre signal, jamais comme source unique.

**4. Garder la cadence de 10/heure par source** tant que le comportement du quota n'est
pas remesuré sur la nouvelle IP. Avec N sources indépendantes, le débit global est de
N × 10/heure sans jamais approcher la limite d'aucune.

**5. Prévoir la relance automatique.** Si le nouvel environnement redémarre aussi ses
conteneurs, mettre en place une routine planifiée dès le début : c'était le premier poste
de perte de temps ici, très loin devant le quota.

---

## 8. Scripts

Tous présents dans `scripts/`. Reproduits ici pour que ce document soit autonome.

### `lib.js` — navigateur dont chaque requête passe par la pile TLS de Node

```javascript
const { chromium, request } = require('/opt/node22/lib/node_modules/playwright');

const PROXY = { server: process.env.HTTPS_PROXY || process.env.https_proxy || 'http://127.0.0.1:33353' };
const STATIC_RE = /\.(js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ico)(\?|$)/i;
const BLOCK_RE = /googletagmanager|google-analytics|doubleclick|facebook\.net|hotjar|clarity\.ms|monitoring\?|\/ingest\/|sentry/i;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Browser whose every request is performed by Playwright's Node-side fetch.
 * Chromium's own TLS stack is reset by this environment's egress gateway,
 * while Node's works, so all traffic is proxied through route interception.
 */
// Next.js link prefetches (?_rsc=) pull a dozen unrelated pages on every load.
// Blocking them cuts requests per check ~5x, which lowers the load we put on the site.
const PREFETCH_RE = /[?&]_rsc=/;
const HEAVY_RE = /\/_next\/image|\.(png|jpe?g|gif|webp|mp4|woff2?)(\?|$)/i;

async function makeBrowser({ cache = true, lean = false } = {}) {
  const api = await request.newContext({ proxy: PROXY });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'fr-FR',
  });

  const assetCache = new Map();
  const stats = { fetches: 0, cacheHits: 0, retries: 0, failures: 0 };

  await ctx.route('**/*', async route => {
    const req = route.request();
    const url = req.url();

    if (BLOCK_RE.test(url)) { try { await route.abort(); } catch (e) {} return; }
    if (lean && (PREFETCH_RE.test(url) || HEAVY_RE.test(url))) { try { await route.abort(); } catch (e) {} return; }

    const cacheable = cache && req.method() === 'GET' && STATIC_RE.test(url);
    if (cacheable && assetCache.has(url)) {
      stats.cacheHits++;
      const c = assetCache.get(url);
      try { await route.fulfill(c); } catch (e) {}
      return;
    }

    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        stats.fetches++;
        const r = await api.fetch(url, {
          method: req.method(),
          headers: req.headers(),
          data: req.postDataBuffer() || undefined,
          maxRedirects: 5,
          timeout: 45000,
        });
        const h = { ...r.headers() };
        delete h['content-encoding'];
        delete h['content-length'];
        delete h['content-security-policy'];
        delete h['content-security-policy-report-only'];
        const payload = { status: r.status(), headers: h, body: await r.body() };
        if (cacheable && r.status() === 200) assetCache.set(url, payload);
        await route.fulfill(payload);
        return;
      } catch (e) {
        lastErr = e;
        stats.retries++;
        await sleep(1500 * (attempt + 1));
      }
    }
    stats.failures++;
    console.error('[route-fail]', req.resourceType(), url.slice(0, 100), lastErr && lastErr.message.split('\n')[0]);
    try { await route.abort(); } catch (e) {}
  });

  return {
    browser, ctx, api, stats,
    close: async () => {
      try { await browser.close(); } catch (e) {}
      try { await api.dispose(); } catch (e) {}
    },
  };
}

module.exports = { makeBrowser, sleep };
```

### `vervox.js` — checker vervox, double corroboration DOM + API, arrêt net sur 429

```javascript
const VX_URL = 'https://vervox.app/fr/outils/verificateur-nom-instagram';
const BTN_TXT = 'Vérifier la disponibilité';
const INPUT_SEL = 'input[placeholder="Ex : mariecoach"]';

const btnEnabled = (txt) => {
  const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim().startsWith(txt));
  return !!b && !b.disabled;
};

async function gotoWithRetry(p, url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      return;
    } catch (e) { last = e; await p.waitForTimeout(4000 * (i + 1)); }
  }
  throw last;
}

/**
 * Check one username on vervox.
 * Returns { site:'vervox', username, verdict:'taken'|'available'|'unknown', text, api, error }
 */
async function checkVervox(p, username) {
  const out = { site: 'vervox', username, verdict: 'unknown', text: '', api: null, error: null };
  let apiBody = null;
  let apiStatus = null;
  const onResp = async r => {
    if (/\/api\/tools\/username-check/.test(r.url())) {
      apiStatus = r.status();
      try { apiBody = await r.text(); } catch (e) {}
    }
  };
  p.on('response', onResp);
  try {
    await gotoWithRetry(p, VX_URL);
    await p.waitForSelector(INPUT_SEL, { timeout: 30000 });
    try { await p.getByRole('button', { name: 'Tout accepter' }).first().click({ timeout: 4000 }); } catch (e) {}

    const inp = p.locator(INPUT_SEL).first();
    let ready = false;
    for (let attempt = 0; attempt < 8 && !ready; attempt++) {
      await inp.click();
      await inp.fill('');
      await inp.pressSequentially(username, { delay: 45 });
      try {
        await p.waitForFunction(btnEnabled, BTN_TXT, { timeout: 4000 });
        ready = true;
      } catch (e) { await p.waitForTimeout(2000); }
    }
    if (!ready) { out.error = 'submit button never enabled (hydration)'; return out; }
    if ((await inp.inputValue()) !== username) { out.error = 'input value mismatch'; return out; }

    apiBody = null;
    apiStatus = null;
    await p.getByRole('button', { name: BTN_TXT }).first().click({ timeout: 15000 });

    // Explicit wait on the result element rendering "@<username>".
    // Bail out early if the site answers 429 IP_RATE_LIMITED: retrying that is
    // both pointless and exactly what would get us banned.
    try {
      await p.waitForFunction(un => {
        return [...document.querySelectorAll('div,p,span,h2,h3')].some(e => e.textContent.trim() === '@' + un);
      }, username, { timeout: 60000 });
    } catch (e) {
      if (apiStatus === 429 || /IP_RATE_LIMITED|Trop de requêtes/i.test(apiBody || '')) {
        out.error = 'RATE_LIMITED';
        out.rateLimited = true;
        out.api = apiBody;
        return out;
      }
      throw e;
    }
    if (apiStatus === 429 || /IP_RATE_LIMITED/i.test(apiBody || '')) {
      out.error = 'RATE_LIMITED';
      out.rateLimited = true;
      out.api = apiBody;
      return out;
    }
    await p.waitForTimeout(900);

    const text = await p.evaluate(un => {
      const at = [...document.querySelectorAll('div,p,span,h2,h3')].find(e => e.textContent.trim() === '@' + un);
      let box = at;
      for (let i = 0; i < 5 && box.parentElement; i++) box = box.parentElement;
      return box.innerText.replace(/\s*\n+\s*/g, ' | ').trim();
    }, username);
    out.text = text;
    out.api = apiBody;

    const t = text.toLowerCase();
    const apiObj = (() => { try { return JSON.parse(apiBody); } catch (e) { return null; } })();

    if (apiObj && typeof apiObj.available === 'boolean') {
      // Corroborate DOM wording with the site's own response
      const domTaken = /d[ée]j[àa] pris|est pris/.test(t);
      const domFree = /disponible/.test(t) && !/d[ée]j[àa] pris/.test(t);
      if (apiObj.available === false && domTaken) out.verdict = 'taken';
      else if (apiObj.available === true && domFree) out.verdict = 'available';
      else { out.verdict = 'unknown'; out.error = 'DOM/API disagreement'; }
    } else {
      if (/d[ée]j[àa] pris|est pris/.test(t)) out.verdict = 'taken';
      else if (/disponible/.test(t)) out.verdict = 'available';
      else { out.verdict = 'unknown'; out.error = 'unrecognised result wording'; }
    }
  } catch (e) {
    out.error = e.message.split('\n')[0];
  } finally {
    p.off('response', onResp);
  }
  return out;
}

module.exports = { checkVervox, VX_URL };
```

### `antibot.js` — détection de challenge sur signaux réels, jamais sur le texte brut

```javascript
/**
 * Anti-bot / CAPTCHA detection.
 *
 * Deliberately NOT a full-text scan: vervox ships every localized error string
 * ("accès refusé", "trop de requêtes", ...) inside its JS bundle, so matching on
 * page text produces false positives on pages that are working perfectly.
 * We key on challenge widgets, challenge-specific titles, and HTTP status instead.
 */

const CHALLENGE_SEL = [
  'iframe[src*="recaptcha"]',
  'iframe[src*="hcaptcha"]',
  'iframe[src*="turnstile"]',
  'iframe[src*="challenges.cloudflare.com"]',
  'script[src*="challenges.cloudflare.com"]',
  '.cf-turnstile',
  '.g-recaptcha',
  '.h-captcha',
  '#challenge-form',
  '#challenge-running',
  '[data-sitekey]',
];

const CHALLENGE_TITLE = /just a moment|attention required|un instant|verifying you are human|security check|access denied|forbidden/i;

async function detectAntiBot(page) {
  try {
    return await page.evaluate(sels => {
      for (const s of sels) if (document.querySelector(s)) return `challenge widget: ${s}`;
      const t = (document.title || '').trim();
      if (/just a moment|attention required|un instant|verifying you are human|security check|access denied|forbidden/i.test(t)) {
        return `challenge page title: "${t}"`;
      }
      // A real block page is tiny; the working tool page is ~1.4 MB of markup.
      if (document.body && document.body.innerHTML.length < 2000 &&
          /captcha|robot|blocked|denied|429|too many/i.test(document.body.innerText || '')) {
        return 'minimal block page';
      }
      return null;
    }, CHALLENGE_SEL);
  } catch (e) { return null; }
}

module.exports = { detectAntiBot, CHALLENGE_SEL, CHALLENGE_TITLE };
```

### `brandsnag.js` — checker brandsnag (conservé pour traçabilité, backend HS)

```javascript
const BS_URL = 'https://brandsnag.com/fr/nom-dutilisateur-instagram';
const INPUT_SEL = 'input[placeholder="Idée de nom"]';
const BTN_NAME = 'Chercher';
const BLOCK_SEL = '.social-media-block';

async function gotoWithRetry(p, url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); return; }
    catch (e) { last = e; await p.waitForTimeout(4000 * (i + 1)); }
  }
  throw last;
}

/**
 * Check one username on brandsnag.
 * Returns { site:'brandsnag', username, verdict:'taken'|'available'|'unknown', text, cls, api, error }
 */
async function checkBrandsnag(p, username) {
  const out = { site: 'brandsnag', username, verdict: 'unknown', text: '', cls: '', api: null, error: null };
  let apiBody = null;
  const onResp = async r => {
    if (/search-streamed-results/.test(r.url())) { try { apiBody = await r.text(); } catch (e) {} }
  };
  p.on('response', onResp);
  try {
    await gotoWithRetry(p, BS_URL);
    await p.waitForSelector(INPUT_SEL, { timeout: 30000 });
    await p.waitForTimeout(2500);

    const inp = p.locator(INPUT_SEL).first();
    await inp.click();
    await inp.fill(username);
    if ((await inp.inputValue()) !== username) { out.error = 'input value mismatch'; return out; }

    apiBody = null;
    await p.getByRole('button', { name: BTN_NAME }).first().click({ timeout: 15000 });

    // Explicit wait: the Instagram result block must render and carry this username
    await p.waitForFunction(un => {
      const b = document.querySelector('.social-media-block');
      return !!b && b.innerText.toLowerCase().includes(un.toLowerCase());
    }, username, { timeout: 60000 });

    // Then wait until the streamed status resolves away from the loading state
    // (loading renders as bg-primary-light; final states are bg-unknown / bg-available / bg-taken)
    let settled = true;
    try {
      await p.waitForFunction(() => {
        const b = document.querySelector('.social-media-block');
        return !!b && !/bg-primary-light|bg-loading|bg-pending/.test(b.className);
      }, null, { timeout: 60000 });
    } catch (e) { settled = false; }
    await p.waitForTimeout(1500);

    const res = await p.evaluate(() => {
      const b = document.querySelector('.social-media-block');
      return b ? { cls: b.className, txt: b.innerText.replace(/\s*\n+\s*/g, ' | ').trim() } : null;
    });
    if (!res) { out.error = 'result block missing'; return out; }
    out.cls = res.cls;
    out.text = res.txt;
    out.api = apiBody;

    const t = res.txt.toLowerCase();
    if (/bg-unknown/.test(res.cls) || /v[ée]rifier manuellement/.test(t)) {
      out.verdict = 'unknown';
      out.error = 'site returned "unknown" (cannot reach Instagram)';
    } else if (/bg-taken|bg-unavailable/.test(res.cls) || /indisponible|d[ée]j[àa] pris|non disponible/.test(t)) {
      out.verdict = 'taken';
    } else if (/bg-available/.test(res.cls) || /disponible/.test(t)) {
      out.verdict = 'available';
    } else {
      out.verdict = 'unknown';
      out.error = settled ? 'unrecognised result state' : 'result never left loading state (timeout)';
    }
  } catch (e) {
    out.error = e.message.split('\n')[0];
  } finally {
    p.off('response', onResp);
  }
  return out;
}

module.exports = { checkBrandsnag, BS_URL };
```

### `drip10.js` — goutte-à-goutte planifié, tolérant au rate-limit

```javascript
/**
 * Scheduled slow drip: starts at START_UTC, runs 10 checks/hour (one every 360 s),
 * hard-stops at DEADLINE_UTC, then writes the report.
 *
 * Rate-limit aware: on a 429 it goes fully silent for 65 min (no requests at all,
 * since probing during a block extends the rolling window) and resumes by itself.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { makeBrowser, sleep } = require('./lib.js');
const { checkVervox } = require('./vervox.js');
const { checkBrandsnag } = require('./brandsnag.js');
const { detectAntiBot } = require('./antibot.js');

const REPO = '/home/user/Kostas258';
const P100 = path.join(REPO, 'progress.json');
const P1000 = path.join(REPO, 'progress_1000.json');

// 21:00 Paris on 20 Aug 2026 -> 19:00 UTC ; 18:00 Paris on 21 Aug -> 16:00 UTC
const START_UTC = Date.parse('2026-08-20T19:00:00Z');
const DEADLINE_UTC = Date.parse('2026-08-21T16:00:00Z');

const DELAY_MS = 360000;                    // 10 checks/hour
const RATE_LIMIT_BACKOFF_MS = 65 * 60 * 1000;
const MAX_ATTEMPTS = 2;
const TARGET_AVAILABLE = 10;

const HARD_ERR = /timeout|net::|ERR_|ECONNRESET|closed|hydration|never enabled|mismatch|missing|socket/i;
const isHardFailure = r => r && r.verdict === 'unknown' && r.error && HARD_ERR.test(r.error);
const needsCheck = r => !r || isHardFailure(r) || r.rateLimited;
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const ts = () => new Date().toISOString().slice(11, 19);
const pastDeadline = () => Date.now() >= DEADLINE_UTC;

let q = Promise.resolve();
function save(file, s) {
  s.updatedAt = new Date().toISOString();
  q = q.then(() => fs.promises.writeFile(file, JSON.stringify(s, null, 2)));
  return q;
}

let rateLimitHits = 0, checksDone = 0;

async function checkWithBackoff(ref, pageRef, username, checker) {
  for (;;) {
    if (pastDeadline()) return null;
    let res = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      res = await checker(pageRef.page, username);
      res.checkedAt = new Date().toISOString();
      res.attempts = attempt;
      if (res.rateLimited) break;
      if (!isHardFailure(res)) return res;
      const challenge = await detectAntiBot(pageRef.page);
      if (challenge) { res.error = `anti-bot challenge detected (${challenge})`; res.captcha = true; return res; }
      console.log(`${ts()}   [${username}] attempt ${attempt}: ${res.error}`);
      if (attempt < MAX_ATTEMPTS) await sleep(25000);
    }
    if (!res.rateLimited) return res;

    rateLimitHits++;
    if (Date.now() + RATE_LIMIT_BACKOFF_MS >= DEADLINE_UTC) {
      console.log(`${ts()} RATE LIMITED at "${username}" — backoff would run past the 18:00 deadline, stopping.`);
      return res;
    }
    console.log(`${ts()} RATE LIMITED at "${username}" (hit #${rateLimitHits}) — silent for 65 min.`);
    try { await pageRef.page.close(); } catch (e) {}
    await sleep(RATE_LIMIT_BACKOFF_MS);
    pageRef.page = await ref.ctx.newPage();
    console.log(`${ts()} backoff over, retrying "${username}"`);
  }
}

async function drip1000(ref, pageRef) {
  const s = readJson(P1000);
  for (let i = 0; i < s.names.length && !pastDeadline(); i++) {
    if (s.available.length >= TARGET_AVAILABLE) { console.log(`${ts()} 1000-list target reached`); return; }
    const u = s.names[i];
    if (!needsCheck(s.results[u])) continue;
    const res = await checkWithBackoff(ref, pageRef, u, checkVervox);
    if (!res) return;
    s.results[u] = res;
    s.checked = Object.keys(s.results).length;
    if (res.verdict === 'available' && !s.available.includes(u)) s.available.push(u);
    await save(P1000, s);
    checksDone++;
    console.log(`${ts()} [1000] ${i + 1}/1000 ${u} -> ${res.verdict} | available ${s.available.length}/${TARGET_AVAILABLE}`);
    if (s.available.length >= TARGET_AVAILABLE) { console.log(`${ts()} TARGET REACHED ${JSON.stringify(s.available)}`); return; }
    await sleep(DELAY_MS);
  }
}

async function drip100(ref, pageRef, site) {
  const s = readJson(P100);
  const checker = site === 'vervox' ? checkVervox : checkBrandsnag;
  for (let i = 0; i < s.usernames.length && !pastDeadline(); i++) {
    const u = s.usernames[i];
    s.results[u] = s.results[u] || {};
    if (!needsCheck(s.results[u][site])) { s.sites[site].done = Math.max(s.sites[site].done, i + 1); continue; }
    const res = await checkWithBackoff(ref, pageRef, u, checker);
    if (!res) return;
    s.results[u][site] = res;
    s.sites[site].done = i + 1;
    await save(P100, s);
    checksDone++;
    console.log(`${ts()} [100/${site}] ${i + 1}/100 ${u} -> ${res.verdict}`);
    await sleep(site === 'vervox' ? DELAY_MS : 30000);
  }
  console.log(`${ts()} [100/${site}] loop ended (deadline=${pastDeadline()})`);
}

(async () => {
  const waitMs = START_UTC - Date.now();
  if (waitMs > 0) {
    console.log(`${ts()} waiting ${Math.round(waitMs / 60000)} min until 21:00 Paris (19:00 UTC)`);
    await sleep(waitMs);
  }
  console.log(`${ts()} START — 10 checks/hour until 16:00 UTC (18:00 Paris) on 21 Aug`);

  const ref = await makeBrowser({ lean: true });
  const pageRef = { page: await ref.ctx.newPage() };
  try {
    await drip1000(ref, pageRef);
    await drip100(ref, pageRef, 'vervox');
    await drip100(ref, pageRef, 'brandsnag');
  } catch (e) {
    console.error(`${ts()} FATAL`, e && e.message);
  } finally {
    await ref.close();
  }
  console.log(`${ts()} DRIP ENDED — ${checksDone} checks, ${rateLimitHits} rate-limit blocks`);
  try {
    console.log(execFileSync('node', [path.join(__dirname, 'report_all.js')], { encoding: 'utf8' }));
  } catch (e) { console.error('report failed:', e.message); }
})();
```

### `report_all.js` — génère `pseudos_verifies.md` (identifiants utilisés ou non)

```javascript
/**
 * Writes pseudos_verifies.md: every username from both lists, whether it was
 * actually tested ("utilisé") or never queried ("non utilisé"), and its verdict.
 */
const fs = require('fs');
const path = require('path');

const REPO = '/home/user/Kostas258';
const OUT = path.join(REPO, 'pseudos_verifies.md');
const P100 = path.join(REPO, 'progress.json');
const P1000 = path.join(REPO, 'progress_1000.json');

const a = JSON.parse(fs.readFileSync(P100, 'utf8'));
const b = JSON.parse(fs.readFileSync(P1000, 'utf8'));

const LABEL = { taken: 'Pris', available: 'Disponible', unknown: 'Indéterminé' };

function rowsFor100() {
  return a.usernames.map((u, i) => {
    const r = a.results[u] || {};
    const vx = r.vervox, bs = r.brandsnag;
    const used = !!vx;
    let statut;
    if (!vx) statut = 'Non vérifié';
    else if (vx.verdict === 'available') statut = 'Disponible (1 source)';
    else if (vx.verdict === 'taken') statut = 'Pris';
    else statut = 'Indéterminé';
    return {
      rang: i + 1, pseudo: u, used, statut,
      vervox: vx ? LABEL[vx.verdict] : '—',
      brandsnag: bs ? LABEL[bs.verdict] : '—',
      at: vx && vx.checkedAt ? vx.checkedAt.replace('T', ' ').slice(0, 19) + 'Z' : '—',
      err: vx && vx.error ? vx.error : '',
    };
  });
}

function rowsFor1000() {
  return b.names.map((u, i) => {
    const r = b.results[u];
    const used = !!r;
    let statut;
    if (!r) statut = 'Non vérifié';
    else if (r.verdict === 'available') statut = 'Disponible (1 source)';
    else if (r.verdict === 'taken') statut = 'Pris';
    else statut = 'Indéterminé';
    return {
      rang: i + 1, pseudo: u, used, statut,
      at: r && r.checkedAt ? r.checkedAt.replace('T', ' ').slice(0, 19) + 'Z' : '—',
      err: r && r.error ? r.error : '',
    };
  });
}

const r100 = rowsFor100();
const r1000 = rowsFor1000();

const count = (rows, s) => rows.filter(r => r.statut === s).length;
const used100 = r100.filter(r => r.used).length;
const used1000 = r1000.filter(r => r.used).length;

const dispo100 = r100.filter(r => r.statut === 'Disponible (1 source)');
const dispo1000 = r1000.filter(r => r.statut === 'Disponible (1 source)');

const stamps = [...r100, ...r1000].filter(r => r.at !== '—').map(r => r.at).sort();

let doc = `# Pseudos Instagram — identifiants utilisés ou non

**Généré le :** ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
**Fenêtre de vérification réelle :** ${stamps[0] || '—'} → ${stamps[stamps.length - 1] || '—'}
**Source du verdict :** vervox.app (texte du résultat dans le DOM + champ \`available\` de son API, les deux devant concorder)
**brandsnag.com :** backend Instagram hors service — n'a jamais produit de verdict exploitable, y compris sur les pseudos de contrôle \`instagram\`, \`nike\`, \`cristiano\`.

« Utilisé » = le pseudo a réellement été soumis au vérificateur. « Non utilisé » = jamais interrogé, statut inconnu — surtout pas « disponible ».

## Résumé

| | Liste m7ia (100) | Liste nomutilisateursprare (1000) | Total |
|---|---|---|---|
| Identifiants utilisés | ${used100} | ${used1000} | ${used100 + used1000} |
| Identifiants non utilisés | ${100 - used100} | ${1000 - used1000} | ${1100 - used100 - used1000} |
| Disponibles | ${count(r100, 'Disponible (1 source)')} | ${count(r1000, 'Disponible (1 source)')} | ${count(r100, 'Disponible (1 source)') + count(r1000, 'Disponible (1 source)')} |
| Pris | ${count(r100, 'Pris')} | ${count(r1000, 'Pris')} | ${count(r100, 'Pris') + count(r1000, 'Pris')} |
| Indéterminés | ${count(r100, 'Indéterminé')} | ${count(r1000, 'Indéterminé')} | ${count(r100, 'Indéterminé') + count(r1000, 'Indéterminé')} |

## Pseudos disponibles

${dispo100.length + dispo1000.length === 0 ? 'Aucun.' : ''}${dispo1000.length ? `### Liste nomutilisateursprare\n\n${dispo1000.map((d, i) => `${i + 1}. **${d.pseudo}**`).join('\n')}\n\n` : ''}${dispo100.length ? `### Liste m7ia\n\n${dispo100.map((d, i) => `${i + 1}. **${d.pseudo}**`).join('\n')}\n` : ''}
⚠️ Verdict d'une source unique. Instagram réserve par ailleurs certains handles (marques, anciens comptes, comptes désactivés) : la disponibilité n'est définitive qu'à la création du compte.

## Liste m7ia — 100 identifiants

| # | Pseudo | Utilisé | Statut | Vervox | BrandSnag | Vérifié le |
|---|---|---|---|---|---|---|
${r100.map(r => `| ${r.rang} | \`${r.pseudo}\` | ${r.used ? 'oui' : 'non'} | ${r.statut} | ${r.vervox} | ${r.brandsnag} | ${r.at} |`).join('\n')}

## Liste nomutilisateursprare — 1000 identifiants

Seuls les identifiants réellement interrogés sont détaillés ; les autres sont listés en bloc ensuite.

| # | Pseudo | Statut | Vérifié le |
|---|---|---|---|
${r1000.filter(r => r.used).map(r => `| ${r.rang} | \`${r.pseudo}\` | ${r.statut} | ${r.at} |`).join('\n')}

### Identifiants non utilisés de cette liste (${1000 - used1000})

Jamais interrogés — statut inconnu.

${r1000.filter(r => !r.used).map(r => `\`${r.pseudo}\``).join(', ')}

## Pourquoi tous les identifiants n'ont pas été utilisés

vervox.app applique un quota par adresse IP (\`429 IP_RATE_LIMITED\`, « Trop de requêtes. Réessaie dans 1h. ») sur une fenêtre glissante : toute requête émise pendant un blocage repousse l'échéance. Le débit a donc été réduit par paliers (30 s → 90 s → 120 s → 360 s entre pseudos), avec silence radio complet de 65 min à chaque 429.

Ce quota n'est pas contournable depuis cet environnement : tout le trafic sortant passe par la passerelle de l'organisation, qui n'autorise que les hôtes de la liste blanche sur le port 443. Les proxys de \`iplocate/free-proxy-list\` (923 entrées, ports 4145/8080/1080/3128) sont tous injoignables, et huggingface.co l'est aussi. Aucun CAPTCHA n'a par ailleurs été contourné : le script détecte les challenges et s'arrête.

## Traçabilité

\`progress.json\` et \`progress_1000.json\` conservent pour chaque pseudo le verdict, le texte lu dans le DOM, la réponse brute de l'API, l'horodatage et le nombre de tentatives. Ils servent de point de reprise : relancer un script repart exactement où il s'est arrêté.
`;

fs.writeFileSync(OUT, doc);
console.log(`wrote ${OUT}`);
console.log(`utilisés: ${used100 + used1000}/1100 | disponibles: ${dispo100.length + dispo1000.length} | pris: ${count(r100, 'Pris') + count(r1000, 'Pris')}`);
```

### `supervise.sh` — relance le run avec le port de proxy courant

```bash
#!/bin/bash
# Relaunches the drip whenever it dies, re-reading HTTPS_PROXY each time.
# The container reassigns the local proxy port on restart, and a running Node
# process keeps the stale one — that killed the overnight run at 01:21 UTC.
# Stops for good at the 16:00 UTC deadline.

DIR=/tmp/claude-0/-home-user-Kostas258/9a6200c7-81eb-5162-8608-b21f53cc2572/scratchpad
DEADLINE=$(date -u -d "2026-08-21 16:00:00" +%s)

while [ "$(date -u +%s)" -lt "$DEADLINE" ]; do
  # Pick up the current proxy port from a fresh environment read.
  PORT=$(grep -ao 'http://127\.0\.0\.1:[0-9]*' /proc/self/environ 2>/dev/null | head -1)
  [ -n "$PORT" ] && export HTTPS_PROXY="$PORT" https_proxy="$PORT"
  echo "=== $(date -u +%H:%M:%S) launching drip10 with proxy $HTTPS_PROXY" >> "$DIR/supervise.log"

  NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node "$DIR/drip10.js" >> "$DIR/drip10.log" 2>&1
  code=$?
  echo "=== $(date -u +%H:%M:%S) drip10 exited with code $code" >> "$DIR/supervise.log"

  [ "$(date -u +%s)" -ge "$DEADLINE" ] && break
  sleep 60
done
echo "=== $(date -u +%H:%M:%S) deadline reached, supervisor stopping" >> "$DIR/supervise.log"
```

### Lancement

```bash
cd scripts
NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt nohup node drip10.js > drip10.log 2>&1 &
# ou, avec relance automatique :
nohup bash supervise.sh > /dev/null 2>&1 &
```

Adapter dans `drip10.js` les constantes `START_UTC` et `DEADLINE_UTC` (ou les supprimer
si le nouvel environnement n'a plus de fenêtre horaire imposée), et `DELAY_MS` selon le
quota mesuré sur la nouvelle IP.

---

## 9. Format des checkpoints

`progress_1000.json` :

```json
{
  "names": ["m7ii", "m7ia", "..."],
  "checked": 35,
  "available": ["m7ia", "m7iy", "m7iv", "m7ir", "m7ae", "m7av", "m7at", "m7ah"],
  "results": {
    "m7ia": {
      "site": "vervox",
      "username": "m7ia",
      "verdict": "available",
      "text": "@m7ia | Ce nom est disponible sur Instagram ! | ...",
      "api": "{\"available\":true,\"statusCode\":\"AVAILABLE\",...}",
      "error": null,
      "checkedAt": "2026-08-20T...",
      "attempts": 1
    }
  }
}
```

`progress.json` a la même forme, avec un niveau supplémentaire par site :
`results[pseudo].vervox` et `results[pseudo].brandsnag`.

**Règle de reprise :** un pseudo est revérifié si son entrée est absente, si son erreur
correspond à un échec dur (timeout, erreur réseau, hydratation), ou si `rateLimited` est
vrai. Un verdict `taken` ou `available` n'est jamais refait.

---

## 10. Ce qu'il ne faut surtout pas refaire

- **Ne pas paralléliser deux files sur le même site.** C'est ce qui a déclenché le premier
  blocage de 4 h.
- **Ne pas sonder pendant un blocage** pour voir s'il est levé : la fenêtre est glissante,
  chaque sonde la repousse.
- **Ne pas se fier à un scan plein texte pour détecter un CAPTCHA** : les chaînes de
  traduction d'erreur sont présentes dans le bundle JS même quand tout va bien.
- **Ne pas coder le port du proxy en dur.**
- **Ne jamais convertir une erreur en « disponible ».** Un pseudo non interrogé est
  « non vérifié », pas « libre ».

## Règle : ne jamais relancer un service qui vient de bloquer

Consigne de l'utilisateur, désormais appliquée par le code (`scripts/cooldown.js`)
et non par la discipline.

Le 21/08, les runners ont été redémarrés huit fois à la main pour ajuster
cadences et priorités. Chaque redémarrage relance les contrôles de démarrage :
cinq requêtes vervox ont ainsi été dépensées à prouver que la source était
vivante, sur un quota tombé à quelques requêtes par fenêtre. Les contrôles ont
coûté plus cher que ce qu'ils apprenaient.

`blocks.json` note quel service a bloqué et quand. Avant sa première requête, un
runner appelle `respectCooldown(source)` et attend ce qu'il reste du délai. Le
fichier est sur disque, donc la règle survit au processus — et au redémarrage de
conteneur qui a tué les trois runners à 19:30 sans que personne s'en aperçoive
pendant deux heures. Une réponse correcte purge l'entrée.

Cooldowns mesurés sur cette IP, pas repris des sites :
vervox 3 h (65 min ont échoué deux fois), socialcal 15 min, dnsrobot 30 min.

Corollaire appliqué le 21/08 à 21:56 : vervox et socialcal ont été relancés
(cooldown écoulé, jamais bloqué), **dnsrobot ne l'a pas été**. Il refusait en
continu depuis environ neuf heures sur deux runs successifs, soit 0 arbitrage
sur 15 conflits. Insister n'aurait rien produit.

## Bilan final — 22/08/2026, 05:15 (échéance)

**Liste m7ia : vérifiée intégralement, 100/100.**
36 disponibles confirmés par deux sources, 7 par une seule, 41 pris,
10 contradictions, 6 indéterminés.

**Liste nomutilisateursprare : 395/1000 interrogés.**
5 disponibles confirmés par deux sources, 64 candidats appuyés sur socialcal
seul, 282 pris, 5 contradictions, 39 indéterminés.

**Objectif « 10 disponibles confirmés » sur la liste des 1000 : non atteint (5).**
Les candidats existent — 64 — mais la confirmation dépend de vervox, qui a
bloqué deux fois dans la nuit (22:04 et 01:12), chaque blocage coûtant 3 h de
silence. Neuf confirmations seulement ont pu passer entre les blocages. Rien
n'est bloqué techniquement : il faut du temps, pas du code.

### Ce que la nuit a appris

L'auto-throttling a fait exactement son travail sur socialcal. Il a vu le taux
de réponses inexploitables monter (58 %, 67 %, 83 %), ralenti de 60 s à 300 s,
déclenché une pause au plafond, puis repris à 60 s et réajusté — neuf
ajustements au total, 226 vérifications sur la nuit. La veille, à cadence fixe,
la même source avait fini par répondre 56 fois sur 60 sans rien dire d'utile.

Le journal des blocages a tenu la règle « ne pas relancer un service qui vient
de bloquer » sans intervention humaine, y compris après le redémarrage de
conteneur qui avait tué les trois runners à 19:30.

dnsrobot n'a jamais rouvert son quota Instagram. Les 15 contradictions restent
donc non arbitrées, et sont listées comme telles.

### Pour reprendre

Relancer simplement, les cooldowns sont respectés automatiquement :

    DEADLINE=<iso> node scripts/confirm.js     # vervox, confirme les candidats
    DEADLINE=<iso> node scripts/crosscheck.js  # socialcal, étend la couverture
    node scripts/audit.js && node scripts/report_all.js

`confirm.js` est le seul qui fasse progresser le compteur de confirmés.
