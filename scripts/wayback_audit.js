/**
 * Independent audit of the names this project calls available.
 *
 * archive.org has a snapshot of a profile only if that profile existed when the
 * crawler passed. So a snapshot is proof the handle was taken — evidence that
 * owes nothing to vervox or socialcal, from an archive neither of them can
 * influence. The reverse says nothing: the crawler only ever visited a small,
 * popularity-biased slice of Instagram, so no snapshot is the normal case even
 * for a taken handle (m2ue is taken by both sources and has none).
 *
 * That asymmetry is exactly what makes it useful here. It cannot promote a name
 * to available, but it can demolish one: a single hit means two independent
 * checkers agreed on something false, and the whole two-source guarantee would
 * need re-examining.
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { assertUsername } = require('./safe.js');
const { ts } = require('./time.js');

const REPO = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);

function wayback(u) {
  assertUsername(u);
  return new Promise(resolve => {
    execFile('curl', ['-sS', '-m', '25', '-A', 'Mozilla/5.0 (X11; Linux x86_64) Chrome/141.0.0.0',
      `http://archive.org/wayback/available?url=instagram.com/${u}/`], { maxBuffer: 1 << 20 },
      (err, stdout) => {
        if (err) return resolve({ error: err.message.split('\n')[0] });
        try {
          const j = JSON.parse(stdout);
          const snap = j.archived_snapshots && j.archived_snapshots.closest;
          resolve(snap && snap.available ? { archived: true, when: snap.timestamp, url: snap.url } : { archived: false });
        } catch { resolve({ error: 'réponse illisible' }); }
      });
  });
}

(async () => {
  const a = read('progress.json'), b = read('progress_1000.json'), sc = read('socialcal.json').results;
  const confirmed = [];
  for (const [names, res] of [[a.usernames, a.results], [b.names, b.results]])
    for (const u of names)
      if (V(res[u]) === 'available' && V(sc[u]) === 'available') confirmed.push(u);

  console.log(`${ts()} audit Wayback de ${confirmed.length} pseudos « disponibles confirmés par 2 sources »`);
  const hits = [], errors = [];
  for (const u of confirmed) {
    const r = await wayback(u);
    if (r.error) { errors.push(`${u}: ${r.error}`); }
    else if (r.archived) {
      hits.push({ u, when: r.when, url: r.url });
      console.log(`${ts()} ⚠️  ${u} — archive du ${r.when} : ce pseudo A ÉTÉ pris`);
    }
    await sleep(1500);
  }

  const out = { auditedAt: new Date().toISOString(), checked: confirmed.length, hits, errors };
  fs.writeFileSync(path.join(REPO, 'wayback_audit.json'), JSON.stringify(out, null, 2));

  console.log(`\n${ts()} ${confirmed.length} vérifiés — ${hits.length} contredits par l'archive, ${errors.length} erreurs`);
  if (!hits.length) {
    console.log('Aucun des pseudos confirmés n\'a jamais été archivé par Wayback.');
    console.log('Ce n\'est pas une preuve de disponibilité — seulement l\'absence de la seule contre-preuve indépendante disponible ici.');
  }
})();
