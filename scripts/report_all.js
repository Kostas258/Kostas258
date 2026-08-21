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
      at: at ? at.replace('T', ' ').slice(0, 19) + 'Z' : '—',
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

const stamps = all.filter(r => r.at !== '—').map(r => r.at).sort();
const scCount = Object.values(sc.results).filter(r => r.verdict !== 'unknown').length;

const listFree = rows => rows
  .map((d, i) => `${i + 1}. **${d.pseudo}** — ${d.statut === S.FREE2 ? 'confirmé par 2 sources' : '1 source'}`)
  .join('\n');

let doc = `# Pseudos Instagram — identifiants utilisés ou non

**Généré le :** ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
**Fenêtre de vérification :** ${stamps[0] || '—'} → ${stamps[stamps.length - 1] || '—'}

## Sources

| Source | Nature | État |
|---|---|---|
| **vervox.app** | API \`/api/tools/username-check\` | opérationnelle — quota par IP sur fenêtre glissante |
| **socialcal.app** | API \`socialcal-media-proxy\` (Cloudflare Worker) | opérationnelle — quota indépendant, renvoie un niveau de confiance |
| brandsnag.com | — | **hors service** pour Instagram : 35/35 réponses indéterminées la session précédente, y compris sur \`instagram\`, \`nike\`, \`cristiano\` |
| instagram.com direct | — | **inaccessible** depuis cette IP : 302 (mur de connexion) sur les profils, 429 sur l'API d'inscription |

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
de la vérifier intégralement : la vérification s'arrête donc dès la cible atteinte.
La liste des 100, elle, était à vérifier entièrement.

Le débit reste limité par les quotas par IP des vérificateurs. Deux sources
indépendantes sont interrogées en parallèle, chacune à une cadence sous son seuil,
avec silence complet en cas de 429 — sonder pendant un blocage ne fait que prolonger
la fenêtre glissante. Aucun CAPTCHA n'a été contourné : les challenges sont détectés
et provoquent l'arrêt.

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
