const fs = require('fs');
const path = require('path');
const { makeBrowser, sleep } = require('./lib.js');
const { checkVervox } = require('./vervox.js');
const { detectAntiBot } = require('./antibot.js');

const REPO = '/home/user/Kostas258';
const PROGRESS = path.join(REPO, 'progress_1000.json');
const NAMES = JSON.parse(fs.readFileSync(path.join(__dirname, 'names1000.json'), 'utf8'));

const DELAY_MS = 30000;      // same cadence as the first run
const TARGET_AVAILABLE = 10; // stop as soon as 10 available names are confirmed
const MAX_ATTEMPTS = 3;
const BLOCK_THRESHOLD = 5;

const HARD_ERR = /timeout|net::|ERR_|ECONNRESET|closed|hydration|never enabled|mismatch|missing|socket/i;
const isHardFailure = r => r.verdict === 'unknown' && r.error && HARD_ERR.test(r.error);

function load() {
  if (fs.existsSync(PROGRESS)) {
    try {
      const p = JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
      if (p.names && p.names.length === NAMES.length) return p;
    } catch (e) {}
  }
  return {
    source: 'nomutilisateursprare.md (1000 pseudos inspirés de m7ia)',
    startedAt: new Date().toISOString(),
    updatedAt: null,
    target: TARGET_AVAILABLE,
    delaySecondsBetweenUsernames: DELAY_MS / 1000,
    site: 'vervox.app',
    brandsnagNote: 'brandsnag.com écarté : backend Instagram HS, 35/35 réponses "indéterminé" sur le run précédent, y compris pour des pseudos de contrôle certainement pris (instagram, nike, cristiano).',
    names: NAMES,
    checked: 0,
    available: [],
    blocked: false,
    blockedAt: null,
    note: null,
    results: {},
  };
}

let q = Promise.resolve();
function save(s) {
  s.updatedAt = new Date().toISOString();
  q = q.then(() => fs.promises.writeFile(PROGRESS, JSON.stringify(s, null, 2)));
  return q;
}


(async () => {
  const state = load();
  await save(state);
  const ref = await makeBrowser({ lean: true });
  let page = await ref.ctx.newPage();
  let consecutive = 0;

  try {
    for (let i = 0; i < state.names.length; i++) {
      if (state.available.length >= TARGET_AVAILABLE) {
        console.log(`TARGET REACHED: ${state.available.length} available names found.`);
        break;
      }
      const u = state.names[i];
      const prev = state.results[u];
      if (prev && !isHardFailure(prev)) continue;

      let res = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        res = await checkVervox(page, u);
        res.checkedAt = new Date().toISOString();
        res.attempts = attempt;
        if (!isHardFailure(res)) break;
        console.log(`[${u}] attempt ${attempt} failed: ${res.error}`);
        const challenge = await detectAntiBot(page);
        if (challenge) {
          // Never attempt to solve or bypass a challenge: stop and report.
          res.error = `anti-bot challenge detected (${challenge})`;
          res.captcha = true;
          break;
        }
        if (attempt < MAX_ATTEMPTS) {
          try { await page.close(); } catch (e) {}
          page = await ref.ctx.newPage();
          await sleep(20000 * attempt);
        }
      }

      state.results[u] = res;
      state.checked = Object.keys(state.results).length;
      if (res.verdict === 'available') state.available.push(u);
      await save(state);
      console.log(`[${i + 1}/${state.names.length}] ${u} -> ${res.verdict}${res.error ? ' (' + res.error + ')' : ''}  | available so far: ${state.available.length}`);

      if (isHardFailure(res) || res.captcha) {
        consecutive++;
        if (consecutive >= BLOCK_THRESHOLD) {
          state.blocked = true;
          state.blockedAt = u;
          state.note = `Arrêt après ${BLOCK_THRESHOLD} échecs consécutifs (dernier pseudo tenté : ${u}, rang ${i + 1}). Dernière erreur : ${res.error}`;
          await save(state);
          console.log('BLOCKED — stopping.');
          break;
        }
      } else consecutive = 0;

      if (state.available.length < TARGET_AVAILABLE) await sleep(DELAY_MS);
    }
  } finally {
    await save(state);
    await ref.close();
  }
  console.log('DONE1000', JSON.stringify({ checked: state.checked, available: state.available, blocked: state.blocked }));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
