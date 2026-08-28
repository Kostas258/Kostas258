/**
 * Top-up phase for the 1000 list: keep going until TARGET names are available
 * according to BOTH sources.
 *
 * The original target ("10 available") was counted on vervox alone, and vervox
 * turned out to over-report availability in one direction — every one of the 14
 * disagreements was vervox "available" against socialcal "taken", never the
 * reverse. So the target is re-counted here on two-source agreement only.
 *
 * Source order is deliberate: socialcal is queried first because it is the
 * stricter of the two and its quota is far more generous. vervox — slow, and
 * the scarce resource — is only spent on names socialcal already called free.
 */
const fs = require('fs');
const path = require('path');
const { checkVervox } = require('./vervox_api.js');
const { checkSocialcal, sleep } = require('./socialcal_api.js');
const { writeJsonAtomic, readJsonSafe } = require('./safe.js');

const REPO = path.join(__dirname, '..');
const P1000 = path.join(REPO, 'progress_1000.json');
const SC = path.join(REPO, 'socialcal.json');

const TARGET = +(process.env.TARGET || 10);
const SC_DELAY = +(process.env.SC_DELAY_MS || 20000);
const VX_DELAY = +(process.env.VX_DELAY_MS || 70000);
const MAX_TRIES = 2;

const readJson = readJsonSafe;
const { ts } = require('./time.js');
const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);

function confirmed(p1000, sc) {
  return p1000.names.filter(u => V(p1000.results[u]) === 'available' && V(sc.results[u]) === 'available');
}

(async () => {
  let checks = 0;
  for (;;) {
    const p1000 = readJson(P1000);
    const sc = fs.existsSync(SC) ? readJson(SC) : { results: {} };

    const ok = confirmed(p1000, sc);
    console.log(`${ts()} confirmed available on the 1000 list: ${ok.length}/${TARGET} ${JSON.stringify(ok)}`);
    if (ok.length >= TARGET) { console.log(`${ts()} TARGET REACHED`); break; }

    // Next name neither source has settled.
    const next = p1000.names.find(u => {
      const s = sc.results[u];
      const v = p1000.results[u];
      if (V(v) === 'taken') return false;                    // vervox already ruled it out
      if (s && V(s) === 'taken') return false;               // socialcal already ruled it out
      if (V(v) === 'available' && V(s) === 'available') return false; // already counted
      if (s && s.verdict === 'unknown' && (s.tries || 1) >= MAX_TRIES && V(v) !== 'available') return false;
      return true;
    });
    if (!next) { console.log(`${ts()} no candidate left on the 1000 list`); break; }

    // 1. socialcal
    let s = sc.results[next];
    if (!V(s)) {
      s = await checkSocialcal(next);
      s.tries = ((sc.results[next] && sc.results[next].tries) || 0) + 1;
      sc.results[next] = s;
      sc.updatedAt = new Date().toISOString();
      writeJsonAtomic(SC, sc);
      checks++;
      console.log(`${ts()} [sc] ${next} -> ${s.verdict}${s.error ? ' | ' + s.error : ''}`);
      await sleep(SC_DELAY);
      if (V(s) !== 'available') continue;
    }

    // 2. vervox, only for a name socialcal called free
    if (!V(p1000.results[next])) {
      const v = await checkVervox(next);
      if (v.rateLimited) {
        console.log(`${ts()} vervox RATE LIMITED — silent 65 min`);
        await sleep(65 * 60000);
        continue;
      }
      const cur = readJson(P1000); // the drip may have written since
      cur.results[next] = v;
      cur.checked = Object.keys(cur.results).length;
      if (v.verdict === 'available' && !cur.available.includes(next)) cur.available.push(next);
      cur.updatedAt = new Date().toISOString();
      writeJsonAtomic(P1000, cur);
      checks++;
      console.log(`${ts()} [vx] ${next} -> ${v.verdict}${v.error ? ' | ' + v.error : ''}`);
      await sleep(VX_DELAY);
    }
  }
  console.log(`${ts()} TOPUP END — ${checks} checks`);
})();
