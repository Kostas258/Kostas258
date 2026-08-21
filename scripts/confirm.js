/**
 * Spends vervox's scarce quota only where it changes the answer.
 *
 * socialcal covers the lists cheaply and is the stricter source, so it produces
 * the candidate set. vervox is then asked about nothing but the names socialcal
 * called available — a few dozen requests instead of eleven hundred.
 *
 * Cadence: the first session measured that one check every ~6 minutes never
 * triggered a 429 over several hours, while faster settings did. This run
 * defaults to 8 minutes. 70s and 105s were both tried here and both got blocked,
 * and a block costs far more than the time it saves.
 */
const path = require('path');
const { checkVervox, sleep } = require('./vervox_api.js');
const { writeJsonAtomic, readJsonSafe } = require('./safe.js');
const { ts } = require('./time.js');
const { Throttle } = require('./throttle.js');
const { remainingMs, lastBlock } = require('./cooldown.js');

const REPO = path.join(__dirname, '..');
const P100 = path.join(REPO, 'progress.json');
const P1000 = path.join(REPO, 'progress_1000.json');
const SC = path.join(REPO, 'socialcal.json');

const DELAY_MS = +(process.env.DELAY_MS || 480000);          // ~7.5 checks/hour, the measured-safe floor
const MAX_DELAY_MS = +(process.env.MAX_DELAY_MS || 1800000);
const BACKOFF_MS = +(process.env.BACKOFF_MS || 3 * 3600000); // a block here lasts hours, not one
const MAX_BACKOFFS = +(process.env.MAX_BACKOFFS || 4);
const QUIET_UNTIL = process.env.QUIET_UNTIL ? Date.parse(process.env.QUIET_UNTIL) : 0;
// Hard stop, so an unattended overnight run always leaves time to publish.
const DEADLINE = process.env.DEADLINE ? Date.parse(process.env.DEADLINE) : 0;
// A control costs one request out of a quota that has fallen to a couple per
// window. If vervox answered correctly a few minutes ago, that IS the evidence
// the control would buy, so skip it rather than spend the request twice.
const CONTROL_SKIP_MS = +(process.env.CONTROL_SKIP_MS || 45 * 60000);

// 8 min is the cadence measured as safe on this source; it is the floor.
const throttle = new Throttle({ min: DELAY_MS, max: MAX_DELAY_MS, windowSize: 6 });


/**
 * The rule: never restart against a service that just blocked us. Enforced from
 * the on-disk ledger, so it survives both this process and a container restart.
 */
async function respectCooldown(source, deadline) {
  const left = remainingMs(source);
  if (!left) return true;
  const b = lastBlock(source);
  const until = new Date(Date.now() + left);
  if (deadline && Date.now() + left >= deadline) {
    console.log(`${ts()} ${source} a bloqué à ${ts(new Date(b.at))} ; le cooldown court au-delà de l'échéance — on ne le relance pas.`);
    return false;
  }
  console.log(`${ts()} ${source} a bloqué à ${ts(new Date(b.at))} — silence jusqu'à ${ts(until)} (${Math.ceil(left / 60000)} min) avant la moindre requête`);
  await sleep(left);
  return true;
}

const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);

/** Names socialcal calls available that vervox has not yet answered on. */
function pending() {
  const a = readJsonSafe(P100), b = readJsonSafe(P1000), sc = readJsonSafe(SC);
  const out = [];
  for (const [names, res, file] of [[a.usernames, a.results, P100], [b.names, b.results, P1000]])
    for (const u of names)
      if (V(sc.results[u]) === 'available' && !V(res[u])) out.push({ u, file });
  return out;
}

function record(file, u, res) {
  const s = readJsonSafe(file); // socialcal may have written since
  s.results[u] = res;
  s.checked = Object.keys(s.results).filter(k => s.results[k].verdict !== 'unknown').length;
  if (res.verdict === 'available' && !s.available.includes(u)) s.available.push(u);
  s.updatedAt = new Date().toISOString();
  writeJsonAtomic(file, s);
}

(async () => {
  if (QUIET_UNTIL && Date.now() < QUIET_UNTIL) {
    const mins = Math.ceil((QUIET_UNTIL - Date.now()) / 60000);
    console.log(`${ts()} silent until ${ts(new Date(QUIET_UNTIL))} (${mins} min) — letting the rate-limit window close`);
    await sleep(QUIET_UNTIL - Date.now());
  }

  if (!await respectCooldown('vervox', DEADLINE)) return;

  // One control only: two would spend a second request before any real work,
  // and the negative direction is what a rate-limited vervox gets wrong anyway.
  const lastGood = (() => {
    let t = 0;
    for (const f of [P100, P1000])
      for (const r of Object.values(readJsonSafe(f).results))
        if (r && r.site === 'vervox' && r.verdict !== 'unknown' && r.checkedAt)
          t = Math.max(t, Date.parse(r.checkedAt));
    return t;
  })();

  if (Date.now() - lastGood < CONTROL_SKIP_MS) {
    console.log(`${ts()} control skipped — vervox answered correctly at ${ts(new Date(lastGood))}, that is the same evidence for less quota`);
  } else {
    const c = await checkVervox('instagram');
    console.log(`${ts()} control instagram -> ${c.verdict}${c.error ? ' | ' + c.error : ''}`);
    if (c.verdict !== 'taken') {
      console.error(`${ts()} control failed — vervox is not answering correctly, recording nothing.`);
      process.exit(1);
    }
    await sleep(throttle.delay);
  }

  let done = 0, backoffs = 0;
  for (;;) {
    if (DEADLINE && Date.now() >= DEADLINE) { console.log(`${ts()} deadline reached — stopping`); break; }
    const list = pending();
    if (!list.length) { console.log(`${ts()} nothing left to confirm`); break; }
    const { u, file } = list[0];

    const res = await checkVervox(u);
    if (res.captcha) { console.log(`${ts()} STOP — ${res.error}`); break; }

    if (res.rateLimited) {
      if (++backoffs > MAX_BACKOFFS) { console.log(`${ts()} rate limited ${backoffs}x — stopping`); break; }
      const change = throttle.record(false);
      console.log(`${ts()} RATE LIMITED at "${u}" (#${backoffs}) — silent ${BACKOFF_MS / 3600000} h` +
        (change ? `, puis ${change.to / 1000}s entre requêtes` : ''));
      if (DEADLINE && Date.now() + BACKOFF_MS >= DEADLINE) {
        console.log(`${ts()} the backoff would run past the deadline — stopping now`);
        break;
      }
      await sleep(BACKOFF_MS);
      continue;
    }

    record(file, u, res);
    done++;
    const agree = res.verdict === 'available' ? 'CONFIRMÉ' : `contredit socialcal (${res.verdict})`;
    console.log(`${ts()} [vx] ${u} -> ${res.verdict}  ${agree}  | ${list.length - 1} restants`);
    const change = throttle.record(true);
    if (change) console.log(`${ts()} throttle ${change.from / 1000}s -> ${change.to / 1000}s`);
    await sleep(throttle.delay);
  }
  console.log(`${ts()} ${throttle.summary()}`);
  console.log(`${ts()} CONFIRM END — ${done} confirmations, ${backoffs} blocages`);
})();
