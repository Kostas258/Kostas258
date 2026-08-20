const fs = require('fs');
const path = require('path');

const REPO = '/home/user/Kostas258';
const MD = path.join(REPO, 'instagram_usernames_rares_m7ia.md');
const PROGRESS = path.join(REPO, 'progress.json');

const state = JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
const md = fs.readFileSync(MD, 'utf8');

// ---- parse the original table rows to keep rank / length / score / comment ----
const rows = [];
for (const line of md.split('\n')) {
  const m = line.match(/^\|\s*(\d+)\s*\|\s*([A-Za-z0-9._]+)\s*\|\s*(\d+)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|/);
  if (m) rows.push({ rang: m[1], pseudo: m[2], len: m[3], score: m[5].trim(), comment: m[6].trim() });
}
if (rows.length !== 100) throw new Error('expected 100 rows, got ' + rows.length);

const LABEL = { taken: 'Pris', available: 'Disponible', unknown: 'Indéterminé' };

function siteCell(r) {
  if (!r) return 'Non vérifié';
  if (r.verdict === 'unknown') return 'Indéterminé';
  return LABEL[r.verdict];
}

function finalStatus(vx, bs) {
  if (!vx && !bs) return 'Non vérifié';
  if (!vx || (vx.verdict === 'unknown' && !bs)) return vx ? 'Indéterminé' : 'Non vérifié';
  const v = vx && vx.verdict;
  const b = bs && bs.verdict;
  const det = [v, b].filter(x => x === 'taken' || x === 'available');
  if (v === 'taken' || b === 'taken') return 'Pris';
  if (v === 'available' && b === 'available') return 'Disponible';
  if (det.length === 1 && det[0] === 'available') return 'Disponible (1 source)';
  return 'Indéterminé';
}

const out = [];
let nPris = 0, nDispo1 = 0, nDispo2 = 0, nInd = 0, nNon = 0;
const dispoList = [];

for (const row of rows) {
  const res = state.results[row.pseudo] || {};
  const status = finalStatus(res.vervox, res.brandsnag);
  if (status === 'Pris') nPris++;
  else if (status === 'Disponible') { nDispo2++; dispoList.push(row); }
  else if (status === 'Disponible (1 source)') { nDispo1++; dispoList.push(row); }
  else if (status === 'Non vérifié') nNon++;
  else nInd++;
  out.push({ ...row, status, vx: siteCell(res.vervox), bs: siteCell(res.brandsnag), res });
}

const vxDet = out.filter(o => o.res.vervox && o.res.vervox.verdict !== 'unknown').length;
const bsDet = out.filter(o => o.res.brandsnag && o.res.brandsnag.verdict !== 'unknown').length;
const vxErr = out.filter(o => o.res.vervox && o.res.vervox.verdict === 'unknown').length;
const verifiedOk = nPris + nDispo1 + nDispo2;

const fmt = iso => {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'short' }) + ' UTC';
};
const stamps = [];
for (const o of out) {
  for (const s of ['vervox', 'brandsnag']) if (o.res[s] && o.res[s].checkedAt) stamps.push(o.res[s].checkedAt);
}
stamps.sort();
const first = stamps[0], last = stamps[stamps.length - 1];

const bsBlocked = state.sites.brandsnag.blocked;
const vxBlocked = state.sites.vervox.blocked;

let doc = `# instagram_usernames_rares_m7ia.md

**Date de génération de la liste :** 20 août 2026
**Vérification de disponibilité réellement effectuée :** du ${fmt(first)} au ${fmt(last)}
**Méthode :** navigation automatisée (Playwright + Chromium), saisie de chaque pseudo dans le formulaire des deux sites, attente explicite de l'élément de résultat dans le DOM, lecture du texte affiché. 30 s d'attente entre chaque pseudo sur chaque site.

**Sources interrogées :**
- [vervox.app — Vérificateur de nom Instagram](${state.sites.vervox.url}) → **opérationnel**, ${vxDet}/100 pseudos avec un résultat exploitable.
- [brandsnag.com — Nom d'utilisateur Instagram](${state.sites.brandsnag.url}) → **hors service pour Instagram**, ${bsDet}/100 résultats exploitables (voir la section « Fiabilité des sources » en bas).

## Tableau complet (classé par note de rareté esthétique)

| Rang | Pseudo | Longueur | Statut Instagram | Vervox | BrandSnag | Note de rareté /10 | Commentaire |
|---|---|---|---|---|---|---|---|
`;

for (const o of out) {
  doc += `| ${o.rang} | ${o.pseudo} | ${o.len} | ${o.status} | ${o.vx} | ${o.bs} | ${o.score} | ${o.comment} |\n`;
}

doc += `
## Pseudos disponibles d'après la vérification

`;
if (dispoList.length === 0) {
  doc += `Aucun pseudo de la liste n'est ressorti comme disponible.\n`;
} else {
  doc += `${dispoList.length} pseudos sur 100 sont annoncés disponibles par vervox.app (classés par note de rareté) :\n\n`;
  dispoList.forEach((d, i) => {
    doc += `${i + 1}. **${d.pseudo}** — ${d.len} caractères, note ${d.score}/10\n`;
  });
  doc += `
⚠️ « Disponible » signifie qu'aucun compte public ne porte ce pseudo au moment de la vérification. Instagram réserve malgré tout certains handles (marques, anciens comptes supprimés, comptes désactivés en attente) : la disponibilité n'est définitivement confirmée qu'au moment de la création du compte.
`;
}

const takenList = out.filter(o => o.status === 'Pris');
doc += `
## Récapitulatif

| Statut | Nombre |
|---|---|
| Pris | ${nPris} |
| Disponible (confirmé par les deux sites) | ${nDispo2} |
| Disponible (une seule source exploitable) | ${nDispo1} |
| Indéterminé (vérifié, sans réponse exploitable) | ${nInd} |
| Non vérifié (quota du site épuisé) | ${nNon} |
| **Total** | **100** |

- **${verifiedOk}/100 pseudos vérifiés avec succès** (statut déterminé par au moins une source fonctionnelle).
- **${nInd}/100 indéterminés** (interrogés, aucune source n'a pu répondre).
- **${nNon}/100 non vérifiés** : le run a été interrompu par le quota de vervox (429 IP_RATE_LIMITED). Ces pseudos n'ont jamais été interrogés — leur statut est inconnu, pas « disponible ».

## Fiabilité des sources

**vervox.app — fonctionnel.** ${vxDet}/100 pseudos ont reçu une réponse claire ("Ce nom est déjà pris." ou "Ce nom est disponible sur Instagram !"), corroborée à chaque fois par la réponse de son API interne (\`/api/tools/username-check\`, champ \`available\`). ${vxErr > 0 ? `${vxErr} pseudo(s) sont restés sans réponse exploitable.` : 'Aucun échec.'}${vxBlocked ? ` **Arrêt anticipé :** ${state.sites.vervox.note}` : ''}

**brandsnag.com — hors service pour Instagram.** Le site répond, le formulaire fonctionne, mais son backend renvoie systématiquement \`{"code":404,"available":null}\` et l'interface affiche « vérifier manuellement » avec l'infobulle « Parfois, nous ne pouvons pas obtenir de résultats précis d'Instagram ». Ce comportement a été vérifié sur des pseudos de contrôle dont le statut est certain — \`instagram\`, \`nike\`, \`cristiano\` — tous trois renvoyés comme indéterminés alors qu'ils sont évidemment pris. BrandSnag n'a donc **jamais** pu servir de seconde source de confirmation, pour aucun pseudo.${bsBlocked ? ` **Arrêt anticipé :** ${state.sites.brandsnag.note}` : ''}

**Conséquence sur la règle de décision.** La règle demandée était : « Pris » si au moins un site l'indique pris, « Disponible » seulement si les deux le confirment, « Indéterminé » sinon. BrandSnag étant inopérant, appliquer cette règle à la lettre aurait classé « Indéterminé » **tous** les pseudos libres, ce qui aurait supprimé le résultat utile. La consigne de repli prévue (« si un site bloque, continue sur l'autre site seul plutôt que d'inventer des résultats ») a donc été appliquée : les pseudos annoncés disponibles par la seule source fonctionnelle sont marqués **« Disponible (1 source) »**, jamais « Disponible » tout court. Aucune disponibilité n'a été déduite d'une erreur, d'un timeout ou d'une absence de réponse.

## Reprise et traçabilité

Le fichier \`progress.json\` contient, pour chaque pseudo et chaque site : le verdict, le texte de résultat lu dans le DOM, la réponse brute de l'API du site, l'horodatage et le nombre de tentatives. Il sert aussi de point de reprise : relancer le script reprend là où il s'est arrêté sans refaire les vérifications déjà réussies.
`;

fs.writeFileSync(MD, doc);
console.log(`Pris=${nPris} Dispo2=${nDispo2} Dispo1=${nDispo1} Ind=${nInd} | vervox det=${vxDet} brandsnag det=${bsDet}`);
console.log('window:', first, '->', last);
