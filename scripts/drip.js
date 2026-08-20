/**
 * Slow drip: 30 checks/hour (one every 120 s), rate-limit aware and self-healing.
 *
 * On a 429 IP_RATE_LIMITED it goes completely silent for 65 minutes and then
 * resumes on its own. Probing during a block is what extends a rolling window,
 * so the backoff issues no requests at all.
 *
 * Order: finish the 1000-list target (10 available), then the 100-list.
 * Brandsnag runs last and unthrottled: it is a different domain, not subject to
 * vervox's quota.
 */
const fs = require('fs');
const path = require('path');
const { makeBrowser, sleep } = require('./lib.js');
const { checkVervox } = require('./vervox.js');
const { checkBrandsnag } = require('./brandsnag.js');
const { detectAntiBot } = require('./antibot.js');

const REPO = '/home/user/Kostas258';
const P100 = path.join(REPO, 'progress.json');
const P1000 = path.join(REPO, 'progress_1000.json');

const DELAY_MS = 120000;            // 30 checks/hour
const RATE_LIMIT_BACKOFF_MS = 65 * 60 * 1000;
const BRANDSNAG_DELAY_MS = 30000;
const MAX_ATTEMPTS = 2;
const TARGET_AVAILABLE = 10;

const HARD_ERR = /timeout|net::|ERR_|ECONNRESET|closed|hydration|never enabled|mismatch|missing|socket/i;
const isHardFailure = r => r && r.verdict === 'unknown' && r.error && HARD_ERR.test(r.error);
const needsCheck = r => !r || isHardFailure(r) || r.rateLimited;

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const ts = () => new Date().toISOString().slice(11, 19);
let q = Promise.resolve();
function save(file, s) {
  s.updatedAt = new Date().toISOString();
  q = q.then(() => fs.promises.writeFile(file, JSON.stringify(s, null, 2)));
  return q;
}

let rateLimitHits = 0;

/** Runs one check, transparently waiting out any rate-limit block. */
async function checkWithBackoff(ref, pageRef, username, checker) {
  for (;;) {
    let res = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      res = await checker(pageRef.page, username);
      res.checkedAt = new Date().toISOString();
      res.attempts = attempt;
      if (res.rateLimited) break;
      if (!isHardFailure(res)) return res;
      const challenge = await detectAntiBot(pageRef.page);
      if (challenge) {
        res.error = `anti-bot challenge detected (${challenge})`;
        res.captcha = true;
        return res;                      // never try to solve or bypass
      }
      console.log(`${ts()}   [${username}] attempt ${attempt}: ${res.error}`);
      if (attempt < MAX_ATTEMPTS) await sleep(25000);
    }
    if (!res.rateLimited) return res;

    rateLimitHits++;
    const mins = Math.round(RATE_LIMIT_BACKOFF_MS / 60000);
    console.log(`${ts()} RATE LIMITED at "${username}" (hit #${rateLimitHits}) — going silent for ${mins} min, no requests at all.`);
    try { await pageRef.page.close(); } catch (e) {}
    await sleep(RATE_LIMIT_BACKOFF_MS);
    pageRef.page = await ref.ctx.newPage();
    console.log(`${ts()} backoff over, retrying "${username}"`);
  }
}

async function drip1000(ref, pageRef) {
  const s = readJson(P1000);
  if (s.available.length >= TARGET_AVAILABLE) { console.log('1000-list: target already reached'); return; }
  for (let i = 0; i < s.names.length; i++) {
    if (s.available.length >= TARGET_AVAILABLE) break;
    const u = s.names[i];
    if (!needsCheck(s.results[u])) continue;

    const res = await checkWithBackoff(ref, pageRef, u, checkVervox);
    s.results[u] = res;
    s.checked = Object.keys(s.results).length;
    if (res.verdict === 'available' && !s.available.includes(u)) s.available.push(u);
    await save(P1000, s);
    console.log(`${ts()} [1000] ${i + 1}/1000 ${u} -> ${res.verdict} | available ${s.available.length}/${TARGET_AVAILABLE}`);
    if (s.available.length >= TARGET_AVAILABLE) { console.log(`${ts()} TARGET REACHED: ${JSON.stringify(s.available)}`); break; }
    await sleep(DELAY_MS);
  }
}

async function drip100(ref, pageRef, site) {
  const s = readJson(P100);
  const checker = site === 'vervox' ? checkVervox : checkBrandsnag;
  for (let i = 0; i < s.usernames.length; i++) {
    const u = s.usernames[i];
    s.results[u] = s.results[u] || {};
    if (!needsCheck(s.results[u][site])) { s.sites[site].done = Math.max(s.sites[site].done, i + 1); continue; }

    const res = await checkWithBackoff(ref, pageRef, u, checker);
    s.results[u][site] = res;
    s.sites[site].done = i + 1;
    await save(P100, s);
    console.log(`${ts()} [100/${site}] ${i + 1}/100 ${u} -> ${res.verdict}`);
    await sleep(site === 'vervox' ? DELAY_MS : BRANDSNAG_DELAY_MS);
  }
  console.log(`${ts()} [100/${site}] COMPLETE`);
}

(async () => {
  const ref = await makeBrowser({ lean: true });
  const pageRef = { page: await ref.ctx.newPage() };
  try {
    await drip1000(ref, pageRef);
    await drip100(ref, pageRef, 'vervox');
    await drip100(ref, pageRef, 'brandsnag');
    console.log(`${ts()} DRIP COMPLETE (rate-limit blocks encountered: ${rateLimitHits})`);
  } catch (e) {
    console.error(`${ts()} FATAL`, e && e.message);
    process.exitCode = 1;
  } finally { await ref.close(); }
})();
