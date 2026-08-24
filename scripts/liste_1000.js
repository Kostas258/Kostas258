/**
 * The plain answer to "which of the 1000 are taken, and which are not".
 *
 * pseudos_verifies.md is the full audit trail — sources, method, caveats. This
 * is the other half: the list itself, sorted so the names worth claiming are at
 * the top, plus a CSV of the same rows because a thousand-line table is
 * something you sort and filter in a spreadsheet, not something you scroll.
 *
 * Statuses are ranked by how much evidence stands behind them. Nothing here is
 * softened: a name only reads DISPONIBLE (2 sources) when two independent
 * checkers agreed, and everything short of that says so on its own line.
 */
const fs = require('fs');
const path = require('path');
const { fmt, offsetLabel } = require('./time.js');

const REPO = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8'));

const b = read('progress_1000.json');
const sc = read('socialcal.json').results;
const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);

const S = {
  FREE2: 'DISPONIBLE (2 sources)',
  FREE1: 'DISPONIBLE (1 source)',
  TAKEN: 'PRIS',
  CONFLICT: 'CONTRADICTION',
  UNKNOWN: 'INDÉTERMINÉ',
};
const ORDER = [S.FREE2, S.FREE1, S.CONFLICT, S.TAKEN, S.UNKNOWN];

const rows = b.names.map((u, i) => {
  const v = V(b.results[u]), s = V(sc[u]);
  let statut;
  if (v && s && v !== s) statut = S.CONFLICT;
  else if (v === 'available' && s === 'available') statut = S.FREE2;
  else if (v === 'available' || s === 'available') statut = S.FREE1;
  else if (v === 'taken' || s === 'taken') statut = S.TAKEN;
  else statut = S.UNKNOWN;
  return {
    rang: i + 1,
    pseudo: u,
    statut,
    vervox: v || '—',
    socialcal: s || '—',
    verifie: fmt([b.results[u] && b.results[u].checkedAt, sc[u] && sc[u].checkedAt].filter(Boolean).sort().pop()),
  };
});

const count = st => rows.filter(r => r.statut === st).length;
const group = st => rows.filter(r => r.statut === st);

let doc = `# Liste nomutilisateursprare — les 1000 identifiants, pris ou non

**Généré le :** ${fmt(new Date().toISOString())} (heure de Paris, ${offsetLabel()})

Les pseudos sont regroupés par statut, du plus sûr au moins sûr. Le détail de la
méthode, des sources et de leurs limites est dans \`pseudos_verifies.md\`.

| Statut | Nombre | Ce que ça veut dire |
|---|---:|---|
| **DISPONIBLE (2 sources)** | ${count(S.FREE2)} | vervox et socialcal disent tous deux « libre » |
| DISPONIBLE (1 source) | ${count(S.FREE1)} | une seule source l'a vérifié ; l'autre ne l'a pas encore fait |
| CONTRADICTION | ${count(S.CONFLICT)} | les deux sources se contredisent — aucune n'est retenue |
| PRIS | ${count(S.TAKEN)} | au moins une source a trouvé le compte |
| INDÉTERMINÉ | ${count(S.UNKNOWN)} | interrogé, mais aucune réponse exploitable |
| **Total** | **${rows.length}** | |

⚠️ Aucun vérificateur externe ne peut prouver qu'un pseudo est libre. Instagram
réserve certains identifiants (marques, comptes désactivés) sans qu'aucun outil
le sache, et depuis cet environnement Instagram lui-même répond 302 pour tout
pseudo, pris ou libre. **La seule preuve est la création du compte.**
`;

for (const st of ORDER) {
  const g = group(st);
  if (!g.length) continue;
  doc += `\n## ${st} — ${g.length}\n\n`;
  if (st === S.TAKEN || st === S.UNKNOWN) {
    // Hundreds of rows nobody reads one by one: a dense block stays scannable.
    doc += g.map(r => `\`${r.pseudo}\``).join(', ') + '\n';
  } else {
    doc += '| # | Pseudo | Vervox | SocialCal | Vérifié le |\n|---|---|---|---|---|\n';
    doc += g.map(r => `| ${r.rang} | \`${r.pseudo}\` | ${r.vervox} | ${r.socialcal} | ${r.verifie} |`).join('\n') + '\n';
  }
}

fs.writeFileSync(path.join(REPO, 'liste_1000.md'), doc);

// CSV in list order, so the file can be diffed against the source list.
const esc = v => (/[",;\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
const csv = ['rang,pseudo,statut,vervox,socialcal,verifie_le']
  .concat(rows.map(r => [r.rang, r.pseudo, r.statut, r.vervox, r.socialcal, r.verifie].map(esc).join(',')))
  .join('\n');
fs.writeFileSync(path.join(REPO, 'liste_1000.csv'), csv + '\n');

console.log(`liste_1000.md et liste_1000.csv écrits`);
console.log(ORDER.map(st => `${st}: ${count(st)}`).join(' | '));
