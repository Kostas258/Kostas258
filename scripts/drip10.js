/**
 * Scheduled slow drip: starts at START_UTC, runs 10 checks/hour (one every 360 s),
 * hard-stops at DEADLINE_UTC, then writes the report.
 *
 * Rate-limit aware: on a 429 it goes fully silent for 65 min (no requests at all,
 * since probing during a block extends the rolling window) and resumes by itself.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { makeBrowser, sleep } = require('./lib.js');
const { checkVervox } = require('./vervox.js');
const { checkBrandsnag } = require('./brandsnag.js');
const { detectAntiBot } = require('./antibot.js');

const REPO = '/home/user/Kostas258';
const P100 = path.join(REPO, 'progress.json');
const P1000 = path.join(REPO, 'progress_1000.json');

// 21:00 Paris on 20 Aug 2026 -> 19:00 UTC ; 18:00 Paris on 21 Aug -> 16:00 UTC
const START_UTC = Date.parse('2026-08-20T19:00:00Z');
const DEADLINE_UTC = Date.parse('2026-08-21T16:00:00Z');

const DELAY_MS = 360000;                    // 10 checks/hour
const RATE_LIMIT_BACKOFF_MS = 65 * 60 * 1000;
const MAX_ATTEMPTS = 2;
const TARGET_AVAILABLE = 10;

const HARD_ERR = /timeout|net::|ERR_|ECONNRESET|closed|hydration|never enabled|mismatch|missing|socket/i;
const isHardFailure = r => r && r.verdict === 'unknown' && r.error && HARD_ERR.test(r.error);
const needsCheck = r => !r || isHardFailure(r) || r.rateLimited;
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const ts = () => new Date().toISOString().slice(11, 19);
const pastDeadline = () => Date.now() >= DEADLINE_UTC;

let q = Promise.resolve();
function save(file, s) {
  s.updatedAt = new Date().toISOString();
  q = q.then(() => fs.promises.writeFile(file, JSON.stringify(s, null, 2)));
  return q;
}

let rateLimitHits = 0, checksDone = 0;

async function checkWithBackoff(ref, pageRef, username, checker) {
  for (;;) {
    if (pastDeadline()) return null;
    let res = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      res = await checker(pageRef.page, username);
      res.checkedAt = new Date().toISOString();
      res.attempts = attempt;
      if (res.rateLimited) break;
      if (!isHardFailure(res)) return res;
      const challenge = await detectAntiBot(pageRef.page);
      if (challenge) { res.error = `anti-bot challenge detected (${challenge})`; res.captcha = true; return res; }
      console.log(`${ts()}   [${username}] attempt ${attempt}: ${res.error}`);
      if (attempt < MAX_ATTEMPTS) await sleep(25000);
    }
    if (!res.rateLimited) return res;

    rateLimitHits++;
    if (Date.now() + RATE_LIMIT_BACKOFF_MS >= DEADLINE_UTC) {
      console.log(`${ts()} RATE LIMITED at "${username}" — backoff would run past the 18:00 deadline, stopping.`);
      return res;
    }
    console.log(`${ts()} RATE LIMITED at "${username}" (hit #${rateLimitHits}) — silent for 65 min.`);
    try { await pageRef.page.close(); } catch (e) {}
    await sleep(RATE_LIMIT_BACKOFF_MS);
    pageRef.page = await ref.ctx.newPage();
    console.log(`${ts()} backoff over, retrying "${username}"`);
  }
}

async function drip1000(ref, pageRef) {
  const s = readJson(P1000);
  for (let i = 0; i < s.names.length && !pastDeadline(); i++) {
    if (s.available.length >= TARGET_AVAILABLE) { console.log(`${ts()} 1000-list target reached`); return; }
    const u = s.names[i];
    if (!needsCheck(s.results[u])) continue;
    const res = await checkWithBackoff(ref, pageRef, u, checkVervox);
    if (!res) return;
    s.results[u] = res;
    s.checked = Object.keys(s.results).length;
    if (res.verdict === 'available' && !s.available.includes(u)) s.available.push(u);
    await save(P1000, s);
    checksDone++;
    console.log(`${ts()} [1000] ${i + 1}/1000 ${u} -> ${res.verdict} | available ${s.available.length}/${TARGET_AVAILABLE}`);
    if (s.available.length >= TARGET_AVAILABLE) { console.log(`${ts()} TARGET REACHED ${JSON.stringify(s.available)}`); return; }
    await sleep(DELAY_MS);
  }
}

async function drip100(ref, pageRef, site) {
  const s = readJson(P100);
  const checker = site === 'vervox' ? checkVervox : checkBrandsnag;
  for (let i = 0; i < s.usernames.length && !pastDeadline(); i++) {
    const u = s.usernames[i];
    s.results[u] = s.results[u] || {};
    if (!needsCheck(s.results[u][site])) { s.sites[site].done = Math.max(s.sites[site].done, i + 1); continue; }
    const res = await checkWithBackoff(ref, pageRef, u, checker);
    if (!res) return;
    s.results[u][site] = res;
    s.sites[site].done = i + 1;
    await save(P100, s);
    checksDone++;
    console.log(`${ts()} [100/${site}] ${i + 1}/100 ${u} -> ${res.verdict}`);
    await sleep(site === 'vervox' ? DELAY_MS : 30000);
  }
  console.log(`${ts()} [100/${site}] loop ended (deadline=${pastDeadline()})`);
}

(async () => {
  const waitMs = START_UTC - Date.now();
  if (waitMs > 0) {
    console.log(`${ts()} waiting ${Math.round(waitMs / 60000)} min until 21:00 Paris (19:00 UTC)`);
    await sleep(waitMs);
  }
  console.log(`${ts()} START — 10 checks/hour until 16:00 UTC (18:00 Paris) on 21 Aug`);

  const ref = await makeBrowser({ lean: true });
  const pageRef = { page: await ref.ctx.newPage() };
  try {
    await drip1000(ref, pageRef);
    await drip100(ref, pageRef, 'vervox');
    await drip100(ref, pageRef, 'brandsnag');
  } catch (e) {
    console.error(`${ts()} FATAL`, e && e.message);
  } finally {
    await ref.close();
  }
  console.log(`${ts()} DRIP ENDED — ${checksDone} checks, ${rateLimitHits} rate-limit blocks`);
  try {
    console.log(execFileSync('node', [path.join(__dirname, 'report_all.js')], { encoding: 'utf8' }));
  } catch (e) { console.error('report failed:', e.message); }
})();
