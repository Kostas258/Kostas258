/**
 * Single sequential queue, rate-limit aware.
 *
 * We were IP_RATE_LIMITED by vervox after sustaining ~1.2 checks/min across two
 * parallel queues. This runs ONE queue at a much slower cadence, stops dead on a
 * 429 instead of retrying into it, and does the 1000-list target first (the most
 * recent request) before resuming the 100-list.
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

const DELAY_MS = 90000;       // 90 s: well under the rate we got limited at
const MAX_ATTEMPTS = 2;
const TARGET_AVAILABLE = 10;

const HARD_ERR = /timeout|net::|ERR_|ECONNRESET|closed|hydration|never enabled|mismatch|missing|socket/i;
const isHardFailure = r => r.verdict === 'unknown' && r.error && HARD_ERR.test(r.error);

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
let q = Promise.resolve();
function save(file, s) {
  s.updatedAt = new Date().toISOString();
  q = q.then(() => fs.promises.writeFile(file, JSON.stringify(s, null, 2)));
  return q;
}

class RateLimited extends Error {}

async function checkOne(page, username, checker) {
  let res = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await checker(page, username);
    res.checkedAt = new Date().toISOString();
    res.attempts = attempt;
    if (res.rateLimited) throw new RateLimited(username);
    if (!isHardFailure(res)) return res;
    console.log(`  [${username}] attempt ${attempt} failed: ${res.error}`);
    const challenge = await detectAntiBot(page);
    if (challenge) {
      res.error = `anti-bot challenge detected (${challenge})`;
      res.captcha = true;
      return res;
    }
    if (attempt < MAX_ATTEMPTS) await sleep(25000);
  }
  return res;
}

async function run1000(ref) {
  const s = readJson(P1000);
  if (s.available.length >= TARGET_AVAILABLE) { console.log('1000-list: target already reached'); return true; }
  const page = await ref.ctx.newPage();
  try {
    for (let i = 0; i < s.names.length; i++) {
      if (s.available.length >= TARGET_AVAILABLE) break;
      const u = s.names[i];
      const prev = s.results[u];
      if (prev && !isHardFailure(prev) && !prev.rateLimited) continue;

      const res = await checkOne(page, u, checkVervox);
      s.results[u] = res;
      s.checked = Object.keys(s.results).length;
      if (res.verdict === 'available' && !s.available.includes(u)) s.available.push(u);
      await save(P1000, s);
      console.log(`[1000] ${i + 1}/${s.names.length} ${u} -> ${res.verdict} | available: ${s.available.length}/${TARGET_AVAILABLE}`);
      if (s.available.length >= TARGET_AVAILABLE) { console.log('TARGET REACHED'); break; }
      await sleep(DELAY_MS);
    }
  } finally { try { await page.close(); } catch (e) {} await save(P1000, s); }
  return s.available.length >= TARGET_AVAILABLE;
}

async function run100(ref) {
  const s = readJson(P100);
  const page = await ref.ctx.newPage();
  try {
    for (const site of ['vervox', 'brandsnag']) {
      const checker = site === 'vervox' ? checkVervox : checkBrandsnag;
      for (let i = 0; i < s.usernames.length; i++) {
        const u = s.usernames[i];
        s.results[u] = s.results[u] || {};
        const prev = s.results[u][site];
        if (prev && !isHardFailure(prev) && !prev.rateLimited) { s.sites[site].done = Math.max(s.sites[site].done, i + 1); continue; }

        const res = await checkOne(page, u, checker);
        s.results[u][site] = res;
        s.sites[site].done = i + 1;
        await save(P100, s);
        console.log(`[100/${site}] ${i + 1}/100 ${u} -> ${res.verdict}`);
        if (site === 'vervox') await sleep(DELAY_MS);
      }
      console.log(`[100/${site}] complete`);
    }
  } finally { try { await page.close(); } catch (e) {} await save(P100, s); }
}

(async () => {
  const ref = await makeBrowser({ lean: true });
  try {
    await run1000(ref);
    await run100(ref);
    console.log('RESUME COMPLETE');
  } catch (e) {
    if (e instanceof RateLimited) {
      console.log(`RATE LIMITED again at "${e.message}" — stopping. Do not retry before the site's window expires.`);
    } else { console.error('FATAL', e); process.exitCode = 1; }
  } finally { await ref.close(); }
})();
