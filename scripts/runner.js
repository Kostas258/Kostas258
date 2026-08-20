const fs = require('fs');
const path = require('path');
const { makeBrowser, sleep } = require('./lib.js');
const { checkVervox } = require('./vervox.js');
const { checkBrandsnag } = require('./brandsnag.js');
const { detectAntiBot } = require('./antibot.js');

const REPO = '/home/user/Kostas258';
const MD = path.join(REPO, 'instagram_usernames_rares_m7ia.md');
const PROGRESS = path.join(REPO, 'progress.json');

const DELAY_MS = 30000;          // 30 s between usernames, per site (as specified)
const MAX_ATTEMPTS = 3;          // retries for one username before giving up
const BLOCK_THRESHOLD = 5;       // consecutive hard failures => consider the site blocked

const CHECKERS = { vervox: checkVervox, brandsnag: checkBrandsnag };

function readUsernames() {
  const md = fs.readFileSync(MD, 'utf8');
  const names = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([A-Za-z0-9._]+)\s*\|/);
    if (m) names.push(m[2]);
  }
  return names;
}

function loadProgress(usernames) {
  if (fs.existsSync(PROGRESS)) {
    try {
      const p = JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
      if (p.usernames && p.usernames.length === usernames.length) return p;
    } catch (e) { console.error('progress.json unreadable, starting fresh'); }
  }
  return {
    startedAt: new Date().toISOString(),
    updatedAt: null,
    delaySecondsBetweenUsernames: DELAY_MS / 1000,
    usernames,
    sites: {
      vervox: { url: require('./vervox.js').VX_URL, done: 0, blocked: false, blockedAt: null, note: null },
      brandsnag: { url: require('./brandsnag.js').BS_URL, done: 0, blocked: false, blockedAt: null, note: null },
    },
    results: {},
  };
}

let saveQueue = Promise.resolve();
function save(state) {
  state.updatedAt = new Date().toISOString();
  saveQueue = saveQueue.then(() => fs.promises.writeFile(PROGRESS, JSON.stringify(state, null, 2)));
  return saveQueue;
}

const HARD_ERR = /timeout|net::|ERR_|ECONNRESET|closed|hydration|never enabled|mismatch|missing|socket/i;

function isHardFailure(res) {
  return res.verdict === 'unknown' && res.error && HARD_ERR.test(res.error);
}


async function runSite(siteName, browserRef, state) {
  const check = CHECKERS[siteName];
  const site = state.sites[siteName];
  let page = await browserRef.ctx.newPage();
  let consecutiveFailures = 0;

  for (let i = 0; i < state.usernames.length; i++) {
    const u = state.usernames[i];
    state.results[u] = state.results[u] || {};

    // resume support: skip anything already recorded with a usable outcome
    const prev = state.results[u][siteName];
    if (prev && (prev.verdict !== 'unknown' || !isHardFailure(prev))) {
      site.done = Math.max(site.done, i + 1);
      continue;
    }

    let res = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      res = await check(page, u);
      res.checkedAt = new Date().toISOString();
      res.attempts = attempt;
      if (!isHardFailure(res)) break;

      console.log(`[${siteName}] ${u} attempt ${attempt} failed: ${res.error}`);
      const challenge = await detectAntiBot(page);
      if (challenge) {
        // Never attempt to solve or bypass a challenge: stop and report.
        res.error = `anti-bot challenge detected (${challenge})`;
        res.captcha = true;
        break;
      }
      if (attempt < MAX_ATTEMPTS) {
        try { await page.close(); } catch (e) {}
        page = await browserRef.ctx.newPage();
        await sleep(20000 * attempt);
      }
    }

    state.results[u][siteName] = res;
    site.done = i + 1;
    await save(state);
    console.log(`[${siteName}] ${i + 1}/${state.usernames.length} ${u} -> ${res.verdict}${res.error ? ' (' + res.error + ')' : ''}`);

    if (isHardFailure(res) || res.captcha) {
      consecutiveFailures++;
      if (consecutiveFailures >= BLOCK_THRESHOLD) {
        site.blocked = true;
        site.blockedAt = u;
        site.note = `Arrêt après ${BLOCK_THRESHOLD} échecs consécutifs (dernier pseudo tenté : ${u}, rang ${i + 1}). Dernière erreur : ${res.error}`;
        await save(state);
        console.log(`[${siteName}] BLOCKED at ${u} — stopping this site.`);
        break;
      }
    } else {
      consecutiveFailures = 0;
    }

    if (i < state.usernames.length - 1) await sleep(DELAY_MS);
  }

  try { await page.close(); } catch (e) {}
  console.log(`[${siteName}] finished (${site.done}/${state.usernames.length}, blocked=${site.blocked})`);
}

(async () => {
  const usernames = readUsernames();
  if (usernames.length !== 100) {
    console.error(`Expected 100 usernames, parsed ${usernames.length}`);
    process.exit(1);
  }
  const state = loadProgress(usernames);
  await save(state);

  const browserRef = await makeBrowser({ lean: true });
  try {
    await Promise.all([
      runSite('vervox', browserRef, state),
      runSite('brandsnag', browserRef, state),
    ]);
  } finally {
    await save(state);
    await browserRef.close();
  }
  console.log('ALL DONE', JSON.stringify(browserRef.stats));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
