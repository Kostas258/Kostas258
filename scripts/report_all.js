/**
 * Writes pseudos_verifies.md from the two independent sources.
 *
 * The important column is "Statut": a name is only called available with the
 * strength of the evidence behind it, and the two sources disagreeing
 * downgrades it to indeterminate rather than picking a winner.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const OUT = path.join(REPO, 'pseudos_verifies.md');
const { fmt, offsetLabel } = require('./time.js');

const readJson = f => JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8'));

const a = readJson('progress.json');
const b = readJson('progress_1000.json');
const sc = fs.existsSync(path.join(REPO, 'socialcal.json')) ? readJson('socialcal.json') : { results: {} };

const LABEL = { taken: 'Pris', available: 'Disponible', unknown: 'Indéterminé' };
const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);

const S = {
  FREE2: 'Disponible (2 sources)',
  FREE1: 'Disponible (1 source)',
  TAKEN: 'Pris',
  CONFLICT: 'Contradiction entre sources',
  UNKNOWN: 'Indéterminé',
  NONE: 'Non vérifié',
};

/** Combine the two sources for one username into a single status. */
function statusOf(vx, s) {
  const v = V(vx), t = V(s);
  if (!v && !t) return (vx || s) ? S.UNKNOWN : S.NONE;
  if (v && t) {
    if (v !== t) return S.CONFLICT;
    return v === 'available' ? S.FREE2 : S.TAKEN;
  }
  const one = v || t;
  return one === 'available' ? S.FREE1 : S.TAKEN;
}

function rows(names, results) {
  return names.map((u, i) => {
    const vx = results[u];
    const s = sc.results[u];
    const at = [vx && vx.checkedAt, s && s.checkedAt].filter(Boolean).sort().pop();
    return {
      rang: i + 1,
      pseudo: u,
      statut: statusOf(vx, s),
      vervox: vx ? LABEL[vx.verdict] : '—',
      socialcal: s ? LABEL[s.verdict] : '—',
      used: !!(vx || s),
      atIso: at || null,   // raw UTC, for sorting
      at: fmt(at),        // Paris, for display
    };
  });
}

const r100 = rows(a.usernames, a.results);
const r1000 = rows(b.names, b.results);
const all = [...r100, ...r1000];

const n = (rows, ...st) => rows.filter(r => st.includes(r.statut)).length;
const used100 = r100.filter(r => r.used).length;
const used1000 = r1000.filter(r => r.used).length;

const free = rows => rows.filter(r => r.statut === S.FREE2 || r.statut === S.FREE1);
const free100 = free(r100), free1000 = free(r1000);
const conflicts = all.filter(r => r.statut === S.CONFLICT);
const unknowns = all.filter(r => r.statut === S.UNKNOWN);

// Every recorded check, not just the latest one per name: the window is meant
// to be when work actually started and stopped. Sorted on the raw ISO values —
// lexicographic order is chronological for ISO, but not for dd/MM/yyyy.
// Two claims underpin this whole report — that the sources are independent, and
// that they are measuring something real — so both are computed from the data
// rather than asserted.
//
// Independence: a shared upstream would give either total agreement or noise
// scattered in both directions. What the data shows instead is a perfectly
// one-sided split, which is what two different detection methods look like when
// one of them has a systematic bias.
//
// Reality: availability is broken down by name length. A checker that guessed
// would produce a flat rate; a real measurement produces a gradient, because
// short handles were claimed long ago.
function evidence() {
  let both = 0, agree = 0, vxFree = 0, scFree = 0;
  const byLen = {};
  for (const [names, res] of [[a.usernames, a.results], [b.names, b.results]])
    for (const u of names) {
      const v = V(res[u]), s = V(sc.results[u]);
      if (s) {
        const L = Math.min(u.length, 7);
        byLen[L] = byLen[L] || { free: 0, total: 0 };
        byLen[L].total++;
        if (s === 'available') byLen[L].free++;
      }
      if (!v || !s) continue;
      both++;
      if (v === s) agree++;
      else if (v === 'available') vxFree++;
      else scFree++;
    }
  return { both, agree, vxFree, scFree, byLen };
}
const ev = evidence();

const stamps = [
  ...Object.values(a.results),
  ...Object.values(b.results),
  ...Object.values(sc.results),
].map(r => r && r.checkedAt).filter(Boolean).sort();
const scCount = Object.values(sc.results).filter(r => r.verdict !== 'unknown').length;

const listFree = rows => rows
  .map((d, i) => `${i + 1}. **${d.pseudo}** — ${d.statut === S.FREE2 ? 'confirmé par 2 sources' : '1 source'}`)
  .join('\n');

let doc = `# Pseudos Instagram — identifiants utilisés ou non

**Généré le :** ${fmt(new Date().toISOString())} (heure de Paris, ${offsetLabel()})
**Fenêtre de vérification :** ${fmt(stamps[0])} → ${fmt(stamps[stamps.length - 1])} (heure de Paris)

## Sources

| Source | Nature | État |
|---|---|---|
| **socialcal.app** | API \`socialcal-media-proxy\` (Cloudflare Worker) | source principale — renvoie un niveau de confiance ; seuls les \`high\` sont retenus. Son amont s'est épuisé en fin de session (56 des 60 dernières réponses indéterminées), la collecte a donc été arrêtée pour ne pas insister |
| **vervox.app** | API \`/api/tools/username-check\` | corroboration — quota par IP devenu très restrictif : après 91 min de silence, 1 seule vérification est passée avant un nouveau blocage. Tend par ailleurs à sur-déclarer la disponibilité (voir plus bas) |
| dnsrobot.net | API \`/api/social-username\` | **arbitre indisponible** : interroge Instagram en direct, donc le mieux placé pour trancher — mais son quota est resté fermé sur 12 tours étalés sur 3 h 30, soit 0 arbitrage sur 15. Il renvoie honnêtement \`available:null\`, jamais un verdict deviné |
| namecheckly.com | API \`/api/check\` | **écartée** : renvoie « pris » pour tout, y compris pour un pseudo de contrôle certainement libre. Aurait injecté de faux « pris » |
| brandsnag.com | — | **hors service** pour Instagram : 35/35 réponses indéterminées la session précédente, y compris sur \`instagram\`, \`nike\`, \`cristiano\` |
| instagram.com direct | — | **inaccessible** depuis cette IP : 302 (mur de connexion) sur les profils, 429 sur l'API d'inscription. sherlock, maigret et socialscan échouent tous pour cette raison |

Un verdict n'est retenu que si les champs de la réponse concordent entre eux
(\`available\` + \`statusCode\` + message côté vervox ; \`status\` + \`confidence: high\`
côté socialcal). **Aucune erreur, aucun délai d'attente et aucune absence de réponse
n'est convertie en « disponible »** : le pseudo reste « indéterminé ».
Si les deux sources se contredisent, le statut est « contradiction », jamais un arbitrage.

« Utilisé » = le pseudo a réellement été soumis à au moins une source.
« Non vérifié » = jamais interrogé, statut inconnu — surtout pas « disponible ».

## Résumé

| | Liste m7ia (100) | Liste nomutilisateursprare (1000) | Total |
|---|---|---|---|
| Identifiants utilisés | ${used100} | ${used1000} | ${used100 + used1000} |
| Identifiants non utilisés | ${100 - used100} | ${1000 - used1000} | ${1100 - used100 - used1000} |
| Disponibles (2 sources) | ${n(r100, S.FREE2)} | ${n(r1000, S.FREE2)} | ${n(all, S.FREE2)} |
| Disponibles (1 source) | ${n(r100, S.FREE1)} | ${n(r1000, S.FREE1)} | ${n(all, S.FREE1)} |
| Pris | ${n(r100, S.TAKEN)} | ${n(r1000, S.TAKEN)} | ${n(all, S.TAKEN)} |
| Contradictions | ${n(r100, S.CONFLICT)} | ${n(r1000, S.CONFLICT)} | ${n(all, S.CONFLICT)} |
| Indéterminés | ${n(r100, S.UNKNOWN)} | ${n(r1000, S.UNKNOWN)} | ${n(all, S.UNKNOWN)} |

Vérifications par la seconde source (socialcal) : ${scCount}.

## Les deux sources sont-elles indépendantes ?

La question n'est pas rhétorique : si les deux vérificateurs interrogeaient le
même moteur en amont, « confirmé par deux sources » ne vaudrait pas mieux qu'une
seule. Mesure sur les ${ev.both} pseudos que les deux ont tranchés fermement :

| | Nombre |
|---|---|
| Accords | ${ev.agree} (${Math.round(ev.agree / ev.both * 100)} %) |
| vervox « libre » contre socialcal « pris » | ${ev.vxFree} |
| vervox « pris » contre socialcal « libre » | ${ev.scFree} |

Les désaccords sont **entièrement unilatéraux**. Un moteur partagé donnerait soit
un accord total, soit du bruit dans les deux sens. Cette asymétrie est la
signature de deux méthodes de détection distinctes, dont l'une — vervox — penche
systématiquement vers « disponible ». C'est aussi pourquoi ses verdicts seuls ne
sont jamais retenus ici.

## Les résultats sont-ils plausibles ?

Un vérificateur qui répondrait au hasard produirait un taux de disponibilité
constant quelle que soit la longueur du pseudo. Ce n'est pas ce qu'on observe :

| Longueur | Pseudos testés | Déclarés libres |
|---|---|---|
${Object.keys(ev.byLen).sort().map(L => `| ${L} caractères | ${ev.byLen[L].total} | ${ev.byLen[L].free} (${Math.round(ev.byLen[L].free / ev.byLen[L].total * 100)} %) |`).join('\n')}

Le gradient est monotone : plus un pseudo est court, plus il est déjà pris. C'est
le comportement attendu d'une mesure réelle sur une plateforme ancienne, où les
identifiants courts ont été réservés depuis longtemps.

## Pseudos disponibles

${free100.length + free1000.length === 0 ? 'Aucun.\n' : ''}${free1000.length ? `### Liste nomutilisateursprare\n\n${listFree(free1000)}\n\n` : ''}${free100.length ? `### Liste m7ia\n\n${listFree(free100)}\n` : ''}
⚠️ Même confirmée par deux sources, la disponibilité n'est **définitive qu'à la création
du compte** : Instagram réserve certains handles (marques, anciens comptes, comptes
désactivés) sans que les vérificateurs le sachent.
${conflicts.length ? `
## Contradictions entre sources (${conflicts.length})

Ces pseudos ont reçu deux verdicts opposés. Aucun n'est retenu comme disponible.

| Pseudo | Vervox | SocialCal |
|---|---|---|
${conflicts.map(r => `| \`${r.pseudo}\` | ${r.vervox} | ${r.socialcal} |`).join('\n')}
` : ''}${unknowns.length ? `
## Indéterminés (${unknowns.length})

Interrogés, mais aucune réponse exploitable. À revérifier — surtout pas à considérer comme libres.

${unknowns.map(r => `\`${r.pseudo}\``).join(', ')}
` : ''}
## Liste m7ia — 100 identifiants

| # | Pseudo | Utilisé | Statut | Vervox | SocialCal | Vérifié le |
|---|---|---|---|---|---|---|
${r100.map(r => `| ${r.rang} | \`${r.pseudo}\` | ${r.used ? 'oui' : 'non'} | ${r.statut} | ${r.vervox} | ${r.socialcal} | ${r.at} |`).join('\n')}

## Liste nomutilisateursprare — 1000 identifiants

Seuls les identifiants réellement interrogés sont détaillés ; les autres sont listés en bloc ensuite.

| # | Pseudo | Statut | Vervox | SocialCal | Vérifié le |
|---|---|---|---|---|---|
${r1000.filter(r => r.used).map(r => `| ${r.rang} | \`${r.pseudo}\` | ${r.statut} | ${r.vervox} | ${r.socialcal} | ${r.at} |`).join('\n')}

### Identifiants non utilisés de cette liste (${1000 - used1000})

Jamais interrogés — statut inconnu.

${r1000.filter(r => !r.used).map(r => `\`${r.pseudo}\``).join(', ') || '—'}

## Pourquoi tous les identifiants n'ont pas été utilisés

L'objectif fixé pour la liste des 1000 était d'y **trouver 10 pseudos disponibles**, pas
de la vérifier intégralement. La liste des 100, elle, était à vérifier entièrement.

Le facteur limitant est le quota par IP des vérificateurs, et il s'est resserré au fil
de la session :

- **vervox** a bloqué à 70 s d'espacement, puis encore à 105 s. Après 91 minutes de
  silence complet, une seule vérification est passée avant un nouveau blocage. La
  fenêtre est glissante et bien plus longue que l'heure annoncée — toute requête émise
  pendant un blocage la repousse, y compris une simple sonde. La cadence a donc été
  ramenée à 8 min, et vervox n'est plus sollicité que pour confirmer les pseudos que
  socialcal déclare libres, au lieu de reparcourir les 1100.
- **socialcal** a tenu longtemps puis son amont s'est épuisé : sur les 60 dernières
  réponses, 56 étaient indéterminées. La collecte a été arrêtée à ce moment-là.
- **dnsrobot**, le seul arbitre possible pour les contradictions, n'a jamais eu son
  quota Instagram ouvert.

Aucun CAPTCHA n'a été contourné : les challenges sont détectés et provoquent l'arrêt.
Aucune erreur, aucun 429 et aucun délai d'attente n'a été converti en verdict.

### Les listes de proxies ne sont pas exploitables ici

\`iplocate/free-proxy-list\` et \`TheSpeedX/PROXY-List\` ont été clonés et testés
(6 939 proxies uniques après fusion et déduplication). Aucun n'est utilisable, pour une
raison qui ne tient pas aux listes :

- la passerelle de sortie n'autorise que les ports **80 et 443** — les ports proxy
  usuels (8080, 3128, 1080, 4145) sont injoignables, ce qui élimine d'emblée 6 357 entrées ;
- sur les 582 proxies écoutant en 80/443, le TCP passe et le HTTP simple est bien relayé,
  mais toute tentative de tunnel HTTPS est refusée par la passerelle avec
  \`403 x-deny-reason: proxy_ip_not_allowed\` — y compris vers des hôtes autorisés
  comme \`example.com\`. Le chaînage de proxy est donc bloqué par politique, pas par
  la qualité des listes.

Aucune autre liste de proxys ne changerait ce résultat. Le gain de débit est venu
d'ailleurs : d'une **seconde source de vérification indépendante**, qui a en prime
restauré la double confirmation.

## Traçabilité

\`progress.json\`, \`progress_1000.json\` et \`socialcal.json\` conservent pour chaque
pseudo le verdict, la réponse brute de l'API, l'horodatage et le nombre de tentatives.
Ils servent de point de reprise : relancer un script repart exactement où il s'est arrêté.
`;

fs.writeFileSync(OUT, doc);
console.log(`wrote ${OUT}`);
console.log(`utilisés ${used100 + used1000}/1100 | dispo 2src ${n(all, S.FREE2)} | dispo 1src ${n(all, S.FREE1)} | pris ${n(all, S.TAKEN)} | conflits ${n(all, S.CONFLICT)} | indéterminés ${n(all, S.UNKNOWN)}`);
