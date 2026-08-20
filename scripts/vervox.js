const VX_URL = 'https://vervox.app/fr/outils/verificateur-nom-instagram';
const BTN_TXT = 'Vérifier la disponibilité';
const INPUT_SEL = 'input[placeholder="Ex : mariecoach"]';

const btnEnabled = (txt) => {
  const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim().startsWith(txt));
  return !!b && !b.disabled;
};

async function gotoWithRetry(p, url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      return;
    } catch (e) { last = e; await p.waitForTimeout(4000 * (i + 1)); }
  }
  throw last;
}

/**
 * Check one username on vervox.
 * Returns { site:'vervox', username, verdict:'taken'|'available'|'unknown', text, api, error }
 */
async function checkVervox(p, username) {
  const out = { site: 'vervox', username, verdict: 'unknown', text: '', api: null, error: null };
  let apiBody = null;
  let apiStatus = null;
  const onResp = async r => {
    if (/\/api\/tools\/username-check/.test(r.url())) {
      apiStatus = r.status();
      try { apiBody = await r.text(); } catch (e) {}
    }
  };
  p.on('response', onResp);
  try {
    await gotoWithRetry(p, VX_URL);
    await p.waitForSelector(INPUT_SEL, { timeout: 30000 });
    try { await p.getByRole('button', { name: 'Tout accepter' }).first().click({ timeout: 4000 }); } catch (e) {}

    const inp = p.locator(INPUT_SEL).first();
    let ready = false;
    for (let attempt = 0; attempt < 8 && !ready; attempt++) {
      await inp.click();
      await inp.fill('');
      await inp.pressSequentially(username, { delay: 45 });
      try {
        await p.waitForFunction(btnEnabled, BTN_TXT, { timeout: 4000 });
        ready = true;
      } catch (e) { await p.waitForTimeout(2000); }
    }
    if (!ready) { out.error = 'submit button never enabled (hydration)'; return out; }
    if ((await inp.inputValue()) !== username) { out.error = 'input value mismatch'; return out; }

    apiBody = null;
    apiStatus = null;
    await p.getByRole('button', { name: BTN_TXT }).first().click({ timeout: 15000 });

    // Explicit wait on the result element rendering "@<username>".
    // Bail out early if the site answers 429 IP_RATE_LIMITED: retrying that is
    // both pointless and exactly what would get us banned.
    try {
      await p.waitForFunction(un => {
        return [...document.querySelectorAll('div,p,span,h2,h3')].some(e => e.textContent.trim() === '@' + un);
      }, username, { timeout: 60000 });
    } catch (e) {
      if (apiStatus === 429 || /IP_RATE_LIMITED|Trop de requêtes/i.test(apiBody || '')) {
        out.error = 'RATE_LIMITED';
        out.rateLimited = true;
        out.api = apiBody;
        return out;
      }
      throw e;
    }
    if (apiStatus === 429 || /IP_RATE_LIMITED/i.test(apiBody || '')) {
      out.error = 'RATE_LIMITED';
      out.rateLimited = true;
      out.api = apiBody;
      return out;
    }
    await p.waitForTimeout(900);

    const text = await p.evaluate(un => {
      const at = [...document.querySelectorAll('div,p,span,h2,h3')].find(e => e.textContent.trim() === '@' + un);
      let box = at;
      for (let i = 0; i < 5 && box.parentElement; i++) box = box.parentElement;
      return box.innerText.replace(/\s*\n+\s*/g, ' | ').trim();
    }, username);
    out.text = text;
    out.api = apiBody;

    const t = text.toLowerCase();
    const apiObj = (() => { try { return JSON.parse(apiBody); } catch (e) { return null; } })();

    if (apiObj && typeof apiObj.available === 'boolean') {
      // Corroborate DOM wording with the site's own response
      const domTaken = /d[ée]j[àa] pris|est pris/.test(t);
      const domFree = /disponible/.test(t) && !/d[ée]j[àa] pris/.test(t);
      if (apiObj.available === false && domTaken) out.verdict = 'taken';
      else if (apiObj.available === true && domFree) out.verdict = 'available';
      else { out.verdict = 'unknown'; out.error = 'DOM/API disagreement'; }
    } else {
      if (/d[ée]j[àa] pris|est pris/.test(t)) out.verdict = 'taken';
      else if (/disponible/.test(t)) out.verdict = 'available';
      else { out.verdict = 'unknown'; out.error = 'unrecognised result wording'; }
    }
  } catch (e) {
    out.error = e.message.split('\n')[0];
  } finally {
    p.off('response', onResp);
  }
  return out;
}

module.exports = { checkVervox, VX_URL };
