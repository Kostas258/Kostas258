/**
 * Tie-breaker pass over the names where vervox and socialcal disagree.
 *
 * dnsrobot queries Instagram directly, so it is the closest thing to ground
 * truth reachable from here — but its own access is rate-limited most of the
 * time, and it says so explicitly (available:null + an error string) instead of
 * guessing. That null is never read as a verdict; the name is simply retried in
 * a later window.
 *
 * Runs slowly and indefinitely until every conflict has a real answer or the
 * round budget is spent.
 */
const fs = require('fs');
const path = require('path');
const { checkDnsrobot, sleep } = require('./dnsrobot_api.js');
const { writeJsonAtomic, readJsonSafe, assertUsername } = require('./safe.js');

const REPO = path.join(__dirname, '..');
const OUT = path.join(REPO, 'dnsrobot.json');

const GAP_MS = +(process.env.TB_GAP_MS || 25000);        // between names in a round
const ROUND_MS = +(process.env.TB_ROUND_MS || 10 * 60000); // between rounds
const MAX_ROUNDS = +(process.env.TB_MAX_ROUNDS || 12);

const readJson = readJsonSafe;
const ts = () => new Date().toISOString().slice(11, 19);
const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);

const store = fs.existsSync(OUT) ? readJson(OUT) : { results: {}, updatedAt: null };
const save = () => {
  store.updatedAt = new Date().toISOString();
  writeJsonAtomic(OUT, store);
};

function conflicts() {
  const a = readJson(path.join(REPO, 'progress.json'));
  const b = readJson(path.join(REPO, 'progress_1000.json'));
  const sc = readJson(path.join(REPO, 'socialcal.json'));
  const out = [];
  for (const [names, res] of [[a.usernames, a.results], [b.names, b.results]])
    for (const u of names) {
      const v = V(res[u]), s = V(sc.results[u]);
      if (v && s && v !== s && !V(store.results[u])) out.push(u);
    }
  return out;
}

(async () => {
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const list = conflicts();
    if (!list.length) { console.log(`${ts()} no unresolved conflict left`); break; }
    console.log(`${ts()} round ${round}/${MAX_ROUNDS} — ${list.length} conflicts to arbitrate`);

    let resolved = 0;
    for (const u of list) {
      const r = await checkDnsrobot(u);
      if (V(r)) {
        store.results[u] = r;
        save();
        resolved++;
        console.log(`${ts()} [tb] ${u} -> ${r.verdict}`);
      } else {
        console.log(`${ts()} [tb] ${u} -> no answer (${r.error})`);
      }
      await sleep(GAP_MS);
    }

    console.log(`${ts()} round ${round} resolved ${resolved}/${list.length}`);
    if (resolved === 0) {
      console.log(`${ts()} upstream still closed — waiting ${ROUND_MS / 60000} min`);
      await sleep(ROUND_MS);
    }
  }
  const v = Object.values(store.results);
  console.log(`${ts()} TIEBREAK END — ${v.length} arbitrated`);
})();
