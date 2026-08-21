/**
 * Rebuilds the working state from the source .md files.
 *
 * The previous session's repo/branch is not present in this environment, so the
 * username lists and the 83 verdicts already acquired are re-extracted from the
 * markdown that was handed over:
 *   sources/instagram_usernames_rares_m7ia.md  -> names100.json
 *   sources/nomutilisateursprare.md            -> names1000.json
 *   sources/pseudos_verifies_precedent.md      -> seeds progress*.json
 *
 * Seeding matters: a verdict already paid for with a rate-limited request must
 * never be spent again. Only "Indéterminé" is replayed.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const SRC = path.join(REPO, 'sources');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

// ---- username lists -------------------------------------------------------

// "| 12 | ta3i | 4 | Non vérifié | 10.0 | ... |"
const names100 = read('instagram_usernames_rares_m7ia.md')
  .split('\n')
  .map(l => l.match(/^\|\s*(\d+)\s*\|\s*([a-z0-9_.]+)\s*\|\s*\d\s*\|/i))
  .filter(Boolean)
  .sort((a, b) => +a[1] - +b[1])
  .map(m => m[2]);

// "	12.	m7ir  " — numbered list, tab/space separated, trailing double space
const names1000 = read('nomutilisateursprare.md')
  .split('\n')
  .map(l => l.match(/^\s*(\d+)\.\s+([a-z0-9_.]+)\s*$/i))
  .filter(Boolean)
  .sort((a, b) => +a[1] - +b[1])
  .map(m => m[2]);

if (names100.length !== 100) throw new Error(`expected 100 names, got ${names100.length}`);
if (names1000.length !== 1000) throw new Error(`expected 1000 names, got ${names1000.length}`);
if (new Set(names1000).size !== 1000) throw new Error('duplicate in the 1000 list');

// ---- previously acquired verdicts ----------------------------------------

const VERDICT = {
  'Pris': 'taken',
  'Disponible (1 source)': 'available',
  'Disponible': 'available',
};

const prev = read('pseudos_verifies_precedent.md');
const seeded = {};
for (const line of prev.split('\n')) {
  // 100-list rows carry 7 columns, 1000-list rows carry 4; both start "| n | `name` |"
  const m = line.match(/^\|\s*(\d+)\s*\|\s*`([a-z0-9_.]+)`\s*\|\s*(.+?)\s*\|\s*$/i);
  if (!m) continue;
  const cols = m[3].split('|').map(s => s.trim());
  // statut is col 1 on the 1000 table, col 2 (after "Utilisé") on the 100 table
  const statut = cols.length >= 5 ? cols[1] : cols[0];
  const at = cols[cols.length - 1];
  const verdict = VERDICT[statut];
  if (!verdict) continue; // "Non vérifié" / "Indéterminé" are replayed, not seeded
  seeded[m[2]] = {
    site: 'vervox',
    username: m[2],
    verdict,
    source: 'session précédente (vervox, DOM + API concordants)',
    checkedAt: at !== '—' ? at.replace(' ', 'T').replace('Z', '') + 'Z' : null,
    attempts: 1,
    error: null,
  };
}

// ---- checkpoints ----------------------------------------------------------

const mk = (names, key) => {
  const results = {};
  for (const n of names) if (seeded[n]) results[n] = seeded[n];
  return {
    [key]: names,
    checked: Object.keys(results).length,
    available: names.filter(n => results[n] && results[n].verdict === 'available'),
    results,
    updatedAt: new Date().toISOString(),
  };
};

const p100 = mk(names100, 'usernames');
const p1000 = mk(names1000, 'names');

fs.writeFileSync(path.join(REPO, 'scripts/names100.json'), JSON.stringify(names100, null, 2));
fs.writeFileSync(path.join(REPO, 'scripts/names1000.json'), JSON.stringify(names1000, null, 2));
fs.writeFileSync(path.join(REPO, 'progress.json'), JSON.stringify(p100, null, 2));
fs.writeFileSync(path.join(REPO, 'progress_1000.json'), JSON.stringify(p1000, null, 2));

const sum = p => `${p.checked} seeded (${p.available.length} available)`;
console.log(`names100  : ${names100.length}  -> ${sum(p100)}`);
console.log(`names1000 : ${names1000.length} -> ${sum(p1000)}`);
console.log(`remaining : ${100 - p100.checked} + ${1000 - p1000.checked} = ${1100 - p100.checked - p1000.checked}`);
