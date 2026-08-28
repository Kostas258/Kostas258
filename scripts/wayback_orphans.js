/**
 * Wayback sur les pseudos NON tranchés — l'inverse de wayback_audit.js.
 *
 * wayback_audit.js interroge l'archive sur les pseudos déjà confirmés
 * disponibles, pour chercher à les démolir. Ce script vise l'autre bout du
 * tableau : les « indéterminés » et les « disponibles 1 source », c'est-à-dire
 * tout ce qui attend encore vervox.
 *
 * L'asymétrie est la même et elle est le coeur du procédé :
 *   - une archive existe  -> le profil existait au passage du crawler. C'est une
 *     indication forte que le pseudo est pris, obtenue d'une source que ni
 *     vervox ni socialcal n'influencent.
 *   - aucune archive      -> ne dit RIEN. Le crawler n'a visité qu'une frange
 *     d'Instagram, biaisée vers les comptes populaires. L'absence est le cas
 *     normal, y compris pour un pseudo pris.
 *
 * Donc ce script peut retirer du travail à vervox, jamais lui en inventer un
 * résultat. Et même sur un « archivé », il n'écrit pas de verdict : un compte
 * archivé en 2019 a pu être supprimé depuis. On enregistre « a été pris », daté,
 * avec l'URL du snapshot — une indication vérifiable, pas une conclusion.
 *
 * Rien n'est écrit dans progress.json ni progress_1000.json. La sortie est un
 * fichier séparé, wayback_orphans.json, précisément pour qu'aucun état ne soit
 * promu vers un autre sans décision explicite.
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

// SOURCES.md : 429 observé vers ~150 requêtes. On part plus lent que l'audit
// existant (1500 ms) parce qu'on en a davantage à passer d'une traite.
const DELAY_MS = +(process.env.DELAY_MS || 2500);
const BACKOFF_MS = +(process.env.BACKOFF_MS || 120000);
const MAX_BACKOFFS = +(process.env.MAX_BACKOFFS || 3);

function wayback(u) {
  assertUsername(u);
  return new Promise(resolve => {
    execFile('curl', ['-sS', '-m', '25', '-w', '\n%{http_code}',
      '-A', 'Mozilla/5.0 (X11; Linux x86_64) Chrome/141.0.0.0',
      `http://archive.org/wayback/available?url=instagram.com/${u}/`],
      { maxBuffer: 1 << 20 },
      (err, stdout) => {
        if (err) return resolve({ error: err.message.split('\n')[0] });
        const nl = String(stdout).lastIndexOf('\n');
        const code = +String(stdout).slice(nl + 1).trim();
        const body = String(stdout).slice(0, nl);
        if (code === 429) return resolve({ rateLimited: true });
        if (code !== 200) return resolve({ error: `HTTP ${code}` });
        try {
          const j = JSON.parse(body);
          const snap = j.archived_snapshots && j.archived_snapshots.closest;
          resolve(snap && snap.available
            ? { archived: true, when: snap.timestamp, url: snap.url }
            : { archived: false });
        } catch { resolve({ error: 'réponse illisible' }); }
      });
  });
}

/** Reproduit statusOf() de report_all.js — on cible UNKNOWN et « 1 source ». */
function pending(vx, s) {
  const v = V(vx), t = V(s);
  if (!v && !t) return !!(vx || s);          // indéterminé : interrogé, pas tranché
  if (v && t) return false;                   // deux sources : déjà tranché ou en conflit
  return (v || t) === 'available';            // disponible sur une seule source
}

(async () => {
  const a = read('progress.json'), b = read('progress_1000.json');
  const sc = read('socialcal.json').results;

  const targets = [];
  for (const [names, res] of [[a.usernames, a.results], [b.names, b.results]])
    for (const u of names)
      if (pending(res[u], sc[u])) targets.push(u);

  console.log(`${ts()} Wayback sur ${targets.length} pseudos non tranchés (indéterminés + 1 source)`);
  console.log(`${ts()} une archive = indication « a été pris » ; aucune archive = aucune information`);

  const archived = [], clean = [], errors = [];
  let backoffs = 0;

  for (let i = 0; i < targets.length; i++) {
    const u = targets[i];
    let r = await wayback(u);

    while (r.rateLimited && backoffs < MAX_BACKOFFS) {
      backoffs++;
      console.log(`${ts()} 429 archive.org (${backoffs}/${MAX_BACKOFFS}) — pause ${BACKOFF_MS / 1000}s`);
      await sleep(BACKOFF_MS);
      r = await wayback(u);
    }

    if (r.rateLimited) {
      console.log(`${ts()} archive.org bloque durablement — arrêt à ${i}/${targets.length}, rien d'inventé`);
      errors.push(`${u}: 429 persistant`);
      break;
    }

    if (r.error) {
      errors.push(`${u}: ${r.error}`);
    } else if (r.archived) {
      archived.push({ pseudo: u, snapshot: r.when, url: r.url });
      console.log(`${ts()} ${u} — archive du ${r.when} : A ÉTÉ pris`);
    } else {
      clean.push(u);
    }

    await sleep(DELAY_MS);
  }

  const out = {
    ranAt: new Date().toISOString(),
    cible: targets.length,
    interroges: archived.length + clean.length + errors.length,
    archives: archived,
    sansArchive: clean,
    erreurs: errors,
    lecture: 'archives = indication indépendante « a été pris », datée et vérifiable ; ' +
             'sansArchive = AUCUNE information, surtout pas « libre » ; ' +
             'erreurs = ni verdict ni indication.',
  };
  fs.writeFileSync(path.join(REPO, 'wayback_orphans.json'), JSON.stringify(out, null, 2));

  console.log(`\n${ts()} ${out.interroges}/${targets.length} interrogés — ` +
              `${archived.length} archivés (donc pris à un moment), ` +
              `${clean.length} sans archive (aucune conclusion), ` +
              `${errors.length} erreurs`);
  if (archived.length) {
    console.log(`${ts()} ces ${archived.length} peuvent être dépriorisés dans la file vervox : ` +
                `autant de requêtes économisées sur une source qui en donne 6 par heure`);
  }
})();
