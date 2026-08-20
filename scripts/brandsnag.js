const BS_URL = 'https://brandsnag.com/fr/nom-dutilisateur-instagram';
const INPUT_SEL = 'input[placeholder="Idée de nom"]';
const BTN_NAME = 'Chercher';
const BLOCK_SEL = '.social-media-block';

async function gotoWithRetry(p, url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); return; }
    catch (e) { last = e; await p.waitForTimeout(4000 * (i + 1)); }
  }
  throw last;
}

/**
 * Check one username on brandsnag.
 * Returns { site:'brandsnag', username, verdict:'taken'|'available'|'unknown', text, cls, api, error }
 */
async function checkBrandsnag(p, username) {
  const out = { site: 'brandsnag', username, verdict: 'unknown', text: '', cls: '', api: null, error: null };
  let apiBody = null;
  const onResp = async r => {
    if (/search-streamed-results/.test(r.url())) { try { apiBody = await r.text(); } catch (e) {} }
  };
  p.on('response', onResp);
  try {
    await gotoWithRetry(p, BS_URL);
    await p.waitForSelector(INPUT_SEL, { timeout: 30000 });
    await p.waitForTimeout(2500);

    const inp = p.locator(INPUT_SEL).first();
    await inp.click();
    await inp.fill(username);
    if ((await inp.inputValue()) !== username) { out.error = 'input value mismatch'; return out; }

    apiBody = null;
    await p.getByRole('button', { name: BTN_NAME }).first().click({ timeout: 15000 });

    // Explicit wait: the Instagram result block must render and carry this username
    await p.waitForFunction(un => {
      const b = document.querySelector('.social-media-block');
      return !!b && b.innerText.toLowerCase().includes(un.toLowerCase());
    }, username, { timeout: 60000 });

    // Then wait until the streamed status resolves away from the loading state
    // (loading renders as bg-primary-light; final states are bg-unknown / bg-available / bg-taken)
    let settled = true;
    try {
      await p.waitForFunction(() => {
        const b = document.querySelector('.social-media-block');
        return !!b && !/bg-primary-light|bg-loading|bg-pending/.test(b.className);
      }, null, { timeout: 60000 });
    } catch (e) { settled = false; }
    await p.waitForTimeout(1500);

    const res = await p.evaluate(() => {
      const b = document.querySelector('.social-media-block');
      return b ? { cls: b.className, txt: b.innerText.replace(/\s*\n+\s*/g, ' | ').trim() } : null;
    });
    if (!res) { out.error = 'result block missing'; return out; }
    out.cls = res.cls;
    out.text = res.txt;
    out.api = apiBody;

    const t = res.txt.toLowerCase();
    if (/bg-unknown/.test(res.cls) || /v[ée]rifier manuellement/.test(t)) {
      out.verdict = 'unknown';
      out.error = 'site returned "unknown" (cannot reach Instagram)';
    } else if (/bg-taken|bg-unavailable/.test(res.cls) || /indisponible|d[ée]j[àa] pris|non disponible/.test(t)) {
      out.verdict = 'taken';
    } else if (/bg-available/.test(res.cls) || /disponible/.test(t)) {
      out.verdict = 'available';
    } else {
      out.verdict = 'unknown';
      out.error = settled ? 'unrecognised result state' : 'result never left loading state (timeout)';
    }
  } catch (e) {
    out.error = e.message.split('\n')[0];
  } finally {
    p.off('response', onResp);
  }
  return out;
}

module.exports = { checkBrandsnag, BS_URL };
