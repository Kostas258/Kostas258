/**
 * Runs the second source (socialcal) over the username lists, writing to its own
 * file so it never races the vervox drip that is writing progress*.json.
 *
 * Priority order, most valuable first:
 *   1. names vervox called "available"  — these are the ones the user would
 *      actually claim, and they currently rest on a single source
 *   2. names vervox called "taken"      — cheap disagreement detector
 *   3. names vervox has not reached yet — extra coverage on a separate quota
 */
const fs = require('fs');
const path = require('path');
const { checkSocialcal, sleep } = require('./socialcal_api.js');
const { writeJsonAtomic, readJsonSafe, assertUsername } = require('./safe.js');

const REPO = path.join(__dirname, '..');
const OUT = path.join(REPO, 'socialcal.json');

const DELAY_MS = +(process.env.SC_DELAY_MS || 60000);
const MAX_DELAY_MS = +(process.env.SC_MAX_DELAY_MS || 300000);
const BACKOFF_MS = +(process.env.SC_BACKOFF_MS || 15 * 60000);
// Hard stop, so an unattended overnight run always leaves time to publish.
const DEADLINE = process.env.DEADLINE ? Date.parse(process.env.DEADLINE) : 0;
const MAX_BACKOFFS = +(process.env.SC_MAX_BACKOFFS || 3);
const LIMIT = +(process.env.SC_LIMIT || 0); // 0 = no cap
// Some names come back "unknown/medium" every time. Retry a few times, then
// accept the indeterminate answer instead of looping on it forever.
const MAX_TRIES = +(process.env.SC_MAX_TRIES || 3);

const readJson = readJsonSafe;
const { ts } = require('./time.js');
const { Throttle } = require('./throttle.js');
const { remainingMs, lastBlock } = require('./cooldown.js');

// 60 s is the cadence this source was answering well at; it is the floor.
const throttle = new Throttle({ min: DELAY_MS, max: MAX_DELAY_MS });

const store = fs.existsSync(OUT) ? readJson(OUT) : { results: {}, updatedAt: null };
const save = () => {
  store.updatedAt = new Date().toISOString();
  writeJsonAtomic(OUT, store);
};


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

/** Rebuilt each pass: the vervox drip keeps adding verdicts underneath us. */
function workList() {
  const p100 = readJson(path.join(REPO, 'progress.json'));
  const p1000 = readJson(path.join(REPO, 'progress_1000.json'));
  const all = [...p100.usernames, ...p1000.names];
  const verdict = u => {
    const r = p100.results[u] || p1000.results[u];
    return r ? r.verdict : null;
  };
  const done = u => {
    const r = store.results[u];
    return !!r && (r.verdict !== 'unknown' || (r.tries || 1) >= MAX_TRIES);
  };
  // Cross-checking a vervox "taken" is the least useful thing this can do: the
  // two sources have never once disagreed in that direction, while every
  // disagreement so far has been vervox calling a taken name available. So
  // "taken" sinks to the bottom, behind names nobody has looked at yet.
  // The 100 list has to be covered in full; the 1000 list only needs enough
  // names to reach the target, so it yields within an equal tier.
  const in100 = new Set(p100.usernames);
  const tier = u => {
    const v = verdict(u);
    if (v === 'available') return 0;
    if (v === 'taken') return 3;
    return in100.has(u) ? 1 : 2;
  };
  const rank = u => tier(u) * 2 + (in100.has(u) ? 0 : 1);
  return all.filter(u => !done(u)).sort((a, b) => rank(a) - rank(b));
}

(async () => {
  let backoffs = 0, checks = 0;
  if (!await respectCooldown('socialcal', DEADLINE)) return;
  console.log(`${ts()} SOCIALCAL START — plancher ${DELAY_MS / 1000}s, plafond ${MAX_DELAY_MS / 1000}s` + (DEADLINE ? `, deadline ${ts(new Date(DEADLINE))}` : ''));

  // Integrity gate, both directions, before anything is recorded.
  for (const [u, want] of [['instagram', 'taken'], ['zqv7xkq9wzqjj4', 'available']]) {
    const r = await checkSocialcal(u);
    console.log(`${ts()} control ${u} -> ${r.verdict} (expected ${want})`);
    if (r.verdict !== want) { console.error('control failed — refusing to record'); process.exit(1); }
    await sleep(throttle.delay);
  }

  for (;;) {
    if (DEADLINE && Date.now() >= DEADLINE) { console.log(`${ts()} deadline reached — stopping`); break; }
    const list = workList();
    if (!list.length) { console.log(`${ts()} nothing left to cross-check`); break; }
    if (LIMIT && checks >= LIMIT) { console.log(`${ts()} limit ${LIMIT} reached`); break; }

    const u = list[0];
    const res = await checkSocialcal(u);

    if (res.rateLimited) {
      if (++backoffs > MAX_BACKOFFS) { console.log(`${ts()} rate limited ${backoffs}x — stopping`); break; }
      console.log(`${ts()} RATE LIMITED at "${u}" (#${backoffs}) — silent ${BACKOFF_MS / 60000} min`);
      await sleep(BACKOFF_MS);
      continue;
    }

    res.tries = ((store.results[u] && store.results[u].tries) || 0) + 1;
    store.results[u] = res;
    save();
    checks++;
    console.log(`${ts()} [sc] ${u} -> ${res.verdict}${res.cached ? ' (cached)' : ''}${res.error ? ' | ' + res.error : ''}  | ${list.length - 1} left`);

    // One sample per NAME, taken when that name is finished with — not one per
    // request. Many names answer "unknown/medium" once or twice and then give a
    // firm verdict; counting each of those attempts as a miss describes the name,
    // not the service. Measured over 1353 requests: the throttle was reading a
    // 62% miss rate while the service's real per-name failure rate was 12%, and
    // 264 names had resolved on a retry. That false signal had dragged the
    // cadence from 60s to its 300s ceiling overnight — a fivefold slowdown
    // caused by the runner misreading its own retries.
    const settled = res.verdict !== 'unknown' || res.tries >= MAX_TRIES;
    if (settled) {
      const change = throttle.record(res.verdict !== 'unknown');
      if (change) {
        console.log(`${ts()} throttle ${change.from / 1000}s -> ${change.to / 1000}s (${Math.round(change.missRate * 100)}% de pseudos sans verdict)`);
      }
    }
    if (throttle.exhausted()) {
      console.log(`${ts()} slowing down stopped helping — pausing ${BACKOFF_MS / 60000} min to let the source recover`);
      await sleep(BACKOFF_MS);
      throttle.delay = throttle.min;
    }
    await sleep(throttle.delay);
  }

  const v = Object.values(store.results);
  console.log(`${ts()} ${throttle.summary()}`);
  console.log(`${ts()} SOCIALCAL END — ${checks} checks this run, ${v.length} stored ` +
    `(${v.filter(r => r.verdict === 'available').length} available, ` +
    `${v.filter(r => r.verdict === 'taken').length} taken, ` +
    `${v.filter(r => r.verdict === 'unknown').length} unknown)`);
})();
