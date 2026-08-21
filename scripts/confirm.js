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

const REPO = path.join(__dirname, '..');
const P100 = path.join(REPO, 'progress.json');
const P1000 = path.join(REPO, 'progress_1000.json');
const SC = path.join(REPO, 'socialcal.json');

const DELAY_MS = +(process.env.DELAY_MS || 480000);          // ~7.5 checks/hour
const BACKOFF_MS = +(process.env.BACKOFF_MS || 3 * 3600000); // a block here lasts hours, not one
const MAX_BACKOFFS = +(process.env.MAX_BACKOFFS || 2);
const QUIET_UNTIL = process.env.QUIET_UNTIL ? Date.parse(process.env.QUIET_UNTIL) : 0;

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

  // One control only: two would spend a second request before any real work,
  // and the negative direction is what a rate-limited vervox gets wrong anyway.
  const c = await checkVervox('instagram');
  console.log(`${ts()} control instagram -> ${c.verdict}${c.error ? ' | ' + c.error : ''}`);
  if (c.verdict !== 'taken') {
    console.error(`${ts()} control failed — vervox is not answering correctly, recording nothing.`);
    process.exit(1);
  }
  await sleep(DELAY_MS);

  let done = 0, backoffs = 0;
  for (;;) {
    const list = pending();
    if (!list.length) { console.log(`${ts()} nothing left to confirm`); break; }
    const { u, file } = list[0];

    const res = await checkVervox(u);
    if (res.captcha) { console.log(`${ts()} STOP — ${res.error}`); break; }

    if (res.rateLimited) {
      if (++backoffs > MAX_BACKOFFS) { console.log(`${ts()} rate limited ${backoffs}x — stopping`); break; }
      console.log(`${ts()} RATE LIMITED at "${u}" (#${backoffs}) — silent ${BACKOFF_MS / 3600000} h`);
      await sleep(BACKOFF_MS);
      continue;
    }

    record(file, u, res);
    done++;
    const agree = res.verdict === 'available' ? 'CONFIRMÉ' : `contredit socialcal (${res.verdict})`;
    console.log(`${ts()} [vx] ${u} -> ${res.verdict}  ${agree}  | ${list.length - 1} restants`);
    await sleep(DELAY_MS);
  }
  console.log(`${ts()} CONFIRM END — ${done} confirmations, ${backoffs} blocages`);
})();
