/**
 * Sonde opportuniste de dnsrobot, et arbitrage des contradictions s'il répond.
 *
 * Pourquoi le garder alors qu'il n'a jamais rien donné.
 *
 * dnsrobot interroge Instagram en direct. C'est donc le seul arbitre possible
 * pour les 15 contradictions entre socialcal et vervox : deux sources qui se
 * contredisent ne se départagent pas entre elles, et aucune des autres pistes
 * mesurées ne tranche. Wayback ne peut que prouver « pris ». Threads ne mesure
 * que notre cadence. Les marketplaces sont écartées.
 *
 * Son amont Instagram est saturé — 22 tentatives, 0 arbitrage, du 24 au 28/08 —
 * mais il répond « Rate limited — try again in a few minutes », pas un refus
 * définitif, et il rend `unknown` honnêtement plutôt que d'inventer. Une source
 * qui dit « je ne sais pas » quand elle ne sait pas mérite qu'on la resonde.
 *
 * D'où la forme retenue : UNE requête par relève, greffée sur la routine de 3 h
 * qui tourne déjà. Coût nul, aucune attention requise, et le jour où l'amont
 * s'ouvre on l'apprend au lieu de l'ignorer.
 *
 *   node scripts/dnsrobot_probe.js              une sonde, dit si c'est ouvert
 *   node scripts/dnsrobot_probe.js --arbitrer   sonde puis arbitre si ouvert
 *
 * Sortie 0 si ouvert, 1 sinon — pour qu'un appelant enchaîne ou s'arrête.
 */
const fs = require('fs');
const path = require('path');
const { checkDnsrobot, sleep } = require('./dnsrobot_api.js');
const { remainingMs, recordBlock } = require('./cooldown.js');
const { writeJsonAtomic, readJsonSafe } = require('./safe.js');
const { ts } = require('./time.js');

const REPO = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8'));
const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);
const STORE = path.join(REPO, 'dnsrobot.json');
const DELAY_MS = +(process.env.DELAY_MS || 30000);

// Témoin positif : `instagram` est pris, sans doute possible. Une source qui ne
// sait pas répondre ça ne sait rien répondre.
const CONTROL = 'instagram';

(async () => {
  const wait = remainingMs('dnsrobot');
  if (wait > 0) {
    console.log(`${ts()} dnsrobot : silence encore ${Math.ceil(wait / 60000)} min, sonde reportée`);
    process.exit(1);
  }

  const c = await checkDnsrobot(CONTROL);
  if (c.verdict !== 'taken') {
    console.log(`${ts()} dnsrobot : amont toujours fermé (${CONTROL} -> ${c.verdict}` +
                `${c.error ? ', ' + c.error : ''})`);
    // Enregistré pour que la sonde suivante respecte le cooldown au lieu
    // d'insister à chaque relève.
    recordBlock('dnsrobot', c.error || `contrôle ${CONTROL} -> ${c.verdict}`);
    process.exit(1);
  }

  console.log(`${ts()} dnsrobot : AMONT OUVERT — ${CONTROL} -> taken`);

  if (!process.argv.includes('--arbitrer')) {
    console.log(`${ts()} relancer avec --arbitrer pour départager les contradictions`);
    process.exit(0);
  }

  // ── arbitrage ───────────────────────────────────────────────────────────
  const a = read('progress.json'), b = read('progress_1000.json');
  const sc = read('socialcal.json').results;
  const vx = { ...a.results, ...b.results };

  const conflits = [];
  for (const u of [...a.usernames, ...b.names]) {
    const v = V(vx[u]), s = V(sc[u]);
    if (v && s && v !== s) conflits.push({ u, vervox: v, socialcal: s });
  }
  console.log(`${ts()} ${conflits.length} contradictions à départager`);

  const store = readJsonSafe(STORE) || { results: {} };
  let tranches = 0;

  for (const { u, vervox, socialcal } of conflits) {
    await sleep(DELAY_MS);
    const r = await checkDnsrobot(u);
    store.results[u] = r;
    writeJsonAtomic(STORE, store);

    if (r.verdict === 'unknown') {
      console.log(`${ts()} ${u} : dnsrobot ne tranche pas — reste en contradiction`);
      // Un amont qui se referme en cours de route arrête tout : mieux vaut
      // dix arbitrages sûrs que quarante dont on ignore la valeur.
      if (/rate limit/i.test(r.error || '')) {
        recordBlock('dnsrobot', r.error);
        console.log(`${ts()} amont refermé — arrêt, ${tranches} arbitrages acquis`);
        break;
      }
      continue;
    }

    tranches++;
    const daccord = r.verdict === vervox ? 'vervox' : 'socialcal';
    console.log(`${ts()} ${u} : dnsrobot -> ${r.verdict}  (donne raison à ${daccord} ; ` +
                `vervox=${vervox}, socialcal=${socialcal})`);
  }

  console.log(`\n${ts()} ${tranches}/${conflits.length} contradictions départagées`);
  if (tranches) {
    console.log(`${ts()} verdicts écrits dans dnsrobot.json ; report_all.js les lira ` +
                `comme une troisième source, il ne sont promus nulle part ici`);
  }
})();
