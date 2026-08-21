/**
 * Drip runner: checks pending usernames one at a time, checkpointing after each.
 *
 * Order of work, from the handover:
 *   phase 1 — the 1000 list, until TARGET_AVAILABLE names are available (8 already)
 *   phase 2 — the 100 list, every name still pending
 *
 * Pacing: vervox rate-limits per IP on a rolling window, and a request sent
 * during a block pushes the deadline out further. So a 429 means going fully
 * silent, not probing to see whether it lifted.
 */
const fs = require('fs');
const path = require('path');
const { checkVervox, sleep } = require('./vervox_api.js');
const { writeJsonAtomic, readJsonSafe, assertUsername } = require('./safe.js');

const REPO = path.join(__dirname, '..');
const P100 = path.join(REPO, 'progress.json');
const P1000 = path.join(REPO, 'progress_1000.json');

const DELAY_MS = +(process.env.DELAY_MS || 60000);          // ~60 checks/hour
const BACKOFF_MS = +(process.env.BACKOFF_MS || 65 * 60000); // full silence after a 429
const TARGET_AVAILABLE = +(process.env.TARGET_AVAILABLE || 10);
const MAX_ATTEMPTS = 2;
const MAX_BACKOFFS = +(process.env.MAX_BACKOFFS || 3);

// A verdict is never re-spent; only these are replayed.
const HARD_ERR = /transport|timeout|HTTP \d|unparseable|RATE_LIMITED/i;
const needsCheck = r => !r || (r.verdict === 'unknown' && (!r.error || HARD_ERR.test(r.error)));

const readJson = readJsonSafe;
const ts = () => new Date().toISOString().slice(11, 19);

let delay = DELAY_MS;
let backoffs = 0;
let checks = 0;
let stop = null;

function save(file, s) {
  s.updatedAt = new Date().toISOString();
  writeJsonAtomic(file, s);
}

/** One username, with retry on soft failure and full backoff on 429. */
async function resolve(username) {
  for (;;) {
    let res;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      res = await checkVervox(username);
      res.attempts = attempt;
      if (res.captcha) { stop = res.error; return res; }
      if (res.rateLimited) break;
      if (res.verdict !== 'unknown') return res;
      console.log(`${ts()}   [${username}] attempt ${attempt}: ${res.error}`);
      if (attempt < MAX_ATTEMPTS) await sleep(20000);
    }
    if (!res.rateLimited) return res;

    if (++backoffs > MAX_BACKOFFS) {
      stop = `rate limited ${backoffs} times — stopping rather than hammering the site`;
      return res;
    }
    delay = Math.round(delay * 1.5);
    console.log(`${ts()} RATE LIMITED at "${username}" (#${backoffs}) — silent ${Math.round(BACKOFF_MS / 60000)} min, then ${Math.round(delay / 1000)}s spacing`);
    await sleep(BACKOFF_MS);
    console.log(`${ts()} backoff over, retrying "${username}"`);
  }
}

/** Startup integrity check: the pipeline must get both directions right. */
async function controls() {
  const cases = [
    { u: 'instagram', want: 'taken' },
    { u: 'zqv7xkq9wzqjj4', want: 'available' },
  ];
  for (const c of cases) {
    const r = await checkVervox(c.u);
    console.log(`${ts()} control ${c.u} -> ${r.verdict} (expected ${c.want})${r.error ? ' | ' + r.error : ''}`);
    if (r.verdict !== c.want) throw new Error(`control failed for "${c.u}": got ${r.verdict}, expected ${c.want}. Refusing to record verdicts from a checker that is not answering correctly.`);
    await sleep(delay);
  }
}

async function phase1000() {
  const s = readJson(P1000);
  for (const u of s.names) {
    if (stop) return;
    if (s.available.length >= TARGET_AVAILABLE) {
      console.log(`${ts()} [1000] target reached: ${s.available.length} available`);
      return;
    }
    if (!needsCheck(s.results[u])) continue;

    const res = await resolve(u);
    if (stop) { console.log(`${ts()} STOP: ${stop}`); return; }
    s.results[u] = res;
    s.checked = Object.keys(s.results).length;
    if (res.verdict === 'available' && !s.available.includes(u)) s.available.push(u);
    save(P1000, s);
    checks++;
    console.log(`${ts()} [1000] ${u} -> ${res.verdict}  | available ${s.available.length}/${TARGET_AVAILABLE}`);
    if (s.available.length >= TARGET_AVAILABLE) {
      console.log(`${ts()} [1000] TARGET REACHED: ${JSON.stringify(s.available)}`);
      return;
    }
    await sleep(delay);
  }
}

async function phase100() {
  const s = readJson(P100);
  const pending = s.usernames.filter(u => needsCheck(s.results[u]));
  console.log(`${ts()} [100] ${pending.length} pending`);
  for (const u of pending) {
    if (stop) return;
    const res = await resolve(u);
    if (stop) { console.log(`${ts()} STOP: ${stop}`); return; }
    s.results[u] = res;
    s.checked = Object.keys(s.results).filter(k => s.results[k].verdict !== 'unknown').length;
    if (res.verdict === 'available' && !s.available.includes(u)) s.available.push(u);
    save(P100, s);
    checks++;
    const left = pending.length - pending.indexOf(u) - 1;
    console.log(`${ts()} [100] ${u} -> ${res.verdict}  | ${left} left`);
    if (left) await sleep(delay);
  }
}

(async () => {
  console.log(`${ts()} START — spacing ${Math.round(delay / 1000)}s, target ${TARGET_AVAILABLE} available on the 1000 list`);
  try {
    await controls();
    await phase1000();
    if (!stop) await phase100();
  } catch (e) {
    console.error(`${ts()} FATAL ${e.message}`);
    process.exitCode = 1;
  }
  console.log(`${ts()} END — ${checks} checks, ${backoffs} rate-limit blocks${stop ? `, stopped: ${stop}` : ''}`);
})();
