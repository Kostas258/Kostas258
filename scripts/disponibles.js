/**
 * Écrit `pseudos_disponibles.md` : la liste des pseudos disponibles, seuls.
 *
 * `liste_1000.md` donne les 1000 groupés par statut, `pseudos_verifies.md` donne
 * la méthode et les preuves. Ce fichier-ci ne répond qu'à une question : lesquels
 * puis-je prendre.
 *
 * Deux niveaux, jamais fondus en un seul :
 *
 *   confirmés par 2 sources   socialcal ET vervox disent disponible.
 *   vus par 1 source          une seule a répondu, l'autre pas encore ou pas du
 *                             tout. Utilisable, mais moins établi — et vervox
 *                             sur-déclare la disponibilité, donc un « 1 source »
 *                             vervox seul est le plus fragile des deux cas.
 *
 * L'en-tête dit si la vérification est finie. Tant qu'il reste des candidats à
 * confirmer ou des indéterminés, le fichier se déclare provisoire : une liste
 * de pseudos libres qui tait qu'elle est incomplète invite à croire que le
 * reste est pris.
 */
const fs = require('fs');
const path = require('path');
const { ts } = require('./time.js');

const REPO = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8'));
const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);

const a = read('progress.json');
const b = read('progress_1000.json');
const sc = read('socialcal.json').results;
const vx = { ...a.results, ...b.results };

const listes = [
  { nom: 'liste de 100', noms: a.usernames },
  { nom: 'liste de 1000', noms: b.names },
];

const deux = [], une = [];
let candidats = 0, indetermines = 0, conflits = 0, pris = 0;

for (const { nom, noms } of listes) {
  for (const u of noms) {
    const v = V(vx[u]), s = V(sc[u]);
    if (v && s) {
      if (v !== s) { conflits++; continue; }
      if (v === 'available') deux.push({ u, liste: nom });
      else pris++;
      continue;
    }
    const seul = v || s;
    if (!seul) { indetermines++; continue; }
    if (seul === 'available') {
      une.push({ u, liste: nom, source: v ? 'vervox' : 'socialcal' });
      candidats++;
    } else pris++;
  }
}

const fini = candidats === 0 && indetermines === 0;
const L = [];

L.push('# Pseudos Instagram disponibles');
L.push('');
L.push(fini
  ? `Vérification **terminée**. Tous les pseudos des deux listes ont été tranchés, ` +
    `hors ${conflits} contradictions entre sources, qui ne figurent pas ici.`
  : `**Liste provisoire — la vérification n'est pas finie.** ${candidats} pseudo(s) ` +
    `attendent une confirmation par la seconde source et ${indetermines} restent ` +
    `indéterminés. Un pseudo absent de cette liste n'est donc pas nécessairement pris.`);
L.push('');
L.push(`Généré le ${ts()} (heure de Paris).`);
L.push('');
L.push('| | nombre |');
L.push('|---|---|');
L.push(`| Disponibles, confirmés par 2 sources | **${deux.length}** |`);
L.push(`| Disponibles, vus par 1 source seulement | ${une.length} |`);
L.push(`| Pris | ${pris} |`);
L.push(`| Contradictions entre sources | ${conflits} |`);
L.push(`| Indéterminés | ${indetermines} |`);
L.push('');

L.push(`## Confirmés par 2 sources — ${deux.length}`);
L.push('');
L.push('socialcal et vervox disent tous deux « disponible ». C\'est le niveau de');
L.push('preuve le plus élevé atteint ici.');
L.push('');
if (deux.length) {
  L.push('| # | pseudo | origine |');
  L.push('|---|---|---|');
  deux.forEach((d, i) => L.push(`| ${i + 1} | \`${d.u}\` | ${d.liste} |`));
} else {
  L.push('_Aucun._');
}
L.push('');

L.push(`## Vus par une seule source — ${une.length}`);
L.push('');
L.push('Une seule source a répondu. À traiter comme une piste, pas comme un acquis :');
L.push('vervox sur-déclare la disponibilité, donc un « disponible » vervox non');
L.push('corroboré est le cas le plus fragile.');
L.push('');
if (une.length) {
  L.push('| # | pseudo | source | origine |');
  L.push('|---|---|---|---|');
  une.forEach((d, i) => L.push(`| ${i + 1} | \`${d.u}\` | ${d.source} | ${d.liste} |`));
} else {
  L.push('_Aucun._');
}
L.push('');

L.push('## Ce que cette liste ne dit pas');
L.push('');
L.push('- Un pseudo **absent** d\'ici n\'est pas forcément pris : il peut être');
L.push('  indéterminé, ou en contradiction entre les deux sources.');
L.push('- La disponibilité est datée. Un pseudo libre aujourd\'hui peut être pris');
L.push('  demain ; recontrôler avant de compter dessus.');
L.push('- Le détail par pseudo, avec les réponses brutes, est dans');
L.push('  `pseudos_verifies.md` et `liste_1000.md`.');
L.push('');

const out = path.join(REPO, 'pseudos_disponibles.md');
fs.writeFileSync(out, L.join('\n'));
console.log(`pseudos_disponibles.md écrit — ${deux.length} confirmés 2 sources, ` +
            `${une.length} vus par 1 source` +
            (fini ? ' — vérification terminée' : ' — PROVISOIRE'));
